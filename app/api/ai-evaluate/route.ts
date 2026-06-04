import { NextResponse } from 'next/server';
import { evaluatorPromptTemplate } from '@/lib/aiEvaluatorPrompt';
import { supabase } from '@/lib/supabase';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const maxDuration = 60; // Set longer timeout if supported by hosting
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planData, externalText } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    
    // Choose the best model
    const model = 'gemini-2.5-flash'; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let planContentString = '';
    if (externalText) {
      planContentString = `External Plan Document Content:\n${externalText}`;
    } else if (planData) {
      planContentString = `System Plan JSON:\n${JSON.stringify(planData, null, 2)}`;
    } else {
      throw new Error("No plan content provided.");
    }

    const prompt = evaluatorPromptTemplate.replace('<<<PLAN_CONTENT>>>', planContentString);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 3);

    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) throw new Error('Invalid response from Gemini');

    let cleanedText = aiText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsedData = JSON.parse(cleanedText);

    // --- RULE-BASED SCORING INTEGRATION ---
    const { evaluatePlanRuleBased } = await import('@/lib/evaluationEngine');
    const ruleResult = evaluatePlanRuleBased(planData);
    
    // Hybrid Score = Rule-based (Max 30) + AI Qualitative (Max 70)
    const aiTotal = parsedData.overallScore || 0;
    const ruleTotal = ruleResult.totalScore || 0;
    const finalScore = ruleTotal + aiTotal;

    // Inject rule-based findings into the AI summary
    let combinedSummary = parsedData.summary || '';
    if (ruleResult.missingElements.length > 0) {
      combinedSummary = `[ระบบตรวจพบข้อบกพร่องพื้นฐาน: ขาด ${ruleResult.missingElements.join(', ')}] ` + combinedSummary;
    }

    const finalEvaluation = {
      ...parsedData,
      ruleBasedScore: ruleTotal,
      overallScore: finalScore,
      summary: combinedSummary
    };

    // --- DB INSERTIONS ---
    const planId = planData?.planId || planData?.id;
    const userId = planData?.userId || planData?.author_id || null;

    if (planId) {
      const aiScores = parsedData.scores || {};
      
      // 1. Log Lesson Quality Scores
      await supabase.from('lesson_quality_scores').insert({
         plan_id: planId,
         user_id: userId,
         structure_score: (ruleResult.details?.objectivesScore || 0) + (ruleResult.details?.activitiesScore || 0) + (ruleResult.details?.assessmentScore || 0) + (ruleResult.details?.rubricScore || 0),
         indicators_score: ruleResult.details?.standardsScore || 0,
         objectives_score: aiScores.objectivesQualitative || 0,
         activities_score: aiScores.activitiesQualitative || 0,
         assessment_score: aiScores.assessmentQualitative || 0,
         rubric_score: aiScores.rubricQualitative || 0,
         alignment_score: aiScores.alignmentScore || 0,
         language_score: aiScores.languageScore || 0,
         ai_review_score: aiTotal,
         total_score: finalScore
      });

      // 2. Log AI Feedback
      await supabase.from('ai_feedback').insert({
         plan_id: planId,
         user_id: userId,
         rating: finalScore >= 80 ? 5 : finalScore >= 60 ? 4 : 3,
         strengths: (parsedData.strengths || []).join('\\n'),
         improvements: (parsedData.improvements || []).join('\\n'),
         errors_found: (parsedData.errorsFound || []).join('\\n'),
         suggestions: parsedData.suggestions || '',
         raw_response: JSON.stringify(parsedData)
      });

      // 3. Log AI Errors if any found
      if (parsedData.errorsFound && parsedData.errorsFound.length > 0) {
        const errorLogs = parsedData.errorsFound.map((err: string) => ({
          plan_id: planId,
          user_id: userId,
          error_type: 'EVALUATION_ERROR',
          error_message: err,
          resolution_hint: parsedData.suggestions || ''
        }));
        await supabase.from('ai_error_logs').insert(errorLogs);
      }
    }

    return NextResponse.json({ success: true, evaluation: finalEvaluation });

  } catch (error: any) {
    console.error('Evaluate API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
