import { NextResponse } from 'next/server';
import { evaluatorPromptTemplate } from '@/lib/aiEvaluatorPrompt';
import { supabase } from '@/lib/supabase';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const maxDuration = 60; // Set longer timeout if supported by hosting
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
    
    // Mix Rule-based (70%) + AI Qualitative (30%)
    // parsedData.overallScore is from Gemini (out of 100). We multiply by 0.3
    // ruleResult.totalScore is already out of 70.
    const aiScoreScaled = Math.round((parsedData.overallScore || 0) * 0.3);
    const finalScore = ruleResult.totalScore + aiScoreScaled;

    // Inject rule-based findings into the AI summary
    let combinedSummary = parsedData.summary;
    if (ruleResult.missingElements.length > 0) {
      combinedSummary = `[ระบบตรวจพบข้อบกพร่องพื้นฐาน: ขาด ${ruleResult.missingElements.join(', ')}] ` + combinedSummary;
    }

    const finalEvaluation = {
      ...parsedData,
      originalAiScore: parsedData.overallScore,
      ruleBasedScore: ruleResult.totalScore,
      overallScore: finalScore,
      summary: combinedSummary
    };

    return NextResponse.json({ success: true, evaluation: finalEvaluation });

  } catch (error: any) {
    console.error('Evaluate API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
