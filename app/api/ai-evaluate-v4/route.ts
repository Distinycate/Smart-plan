import { NextResponse } from 'next/server';
import {
  curriculumValidatorPrompt,
  instructionalDesignPrompt,
  assessmentExpertPrompt,
  pa9CommitteePrompt
} from '@/lib/aiReviewerV4Prompts';
import { supabase } from '@/lib/supabase';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const maxDuration = 60; // 60s is standard max for hobby Vercel plan
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planData, externalText } = body;

    const apiKey = process.env.GEMINI_API_KEY_EVALUATE || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let planContentString = '';
    if (externalText) {
      planContentString = `External Plan Document Content:\n${externalText}`;
    } else if (planData) {
      planContentString = `System Plan JSON:\n${JSON.stringify(planData, null, 2)}`;
    } else {
      throw new Error('No plan content provided.');
    }

    const runReviewer = async (promptTemplate: string, tag: string) => {
      const prompt = promptTemplate.replace('<<<PLAN_CONTENT>>>', planContentString);
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      };

      try {
        const response = await fetchGeminiWithRetry(apiUrl, payload, 3, apiKey, tag);
        const resJson = await response.json();
        const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) throw new Error('Invalid response from Gemini');
        
        let cleanedText = aiText.trim();
        const match = cleanedText.match(/```(?:json)?([\s\S]*?)```/);
        if (match) {
          cleanedText = match[1].trim();
        } else {
          cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        }
        
        return JSON.parse(cleanedText);
      } catch (err: any) {
        console.error(`Failed Reviewer ${tag}:`, err);
        return { error: true, tag, message: err.message };
      }
    };

    // Execute the 4 reviewers in parallel
    const [curriculum, design, assessment, committee] = await Promise.all([
      runReviewer(curriculumValidatorPrompt, 'CurriculumValidator'),
      runReviewer(instructionalDesignPrompt, 'InstructionalDesign'),
      runReviewer(assessmentExpertPrompt, 'AssessmentExpert'),
      runReviewer(pa9CommitteePrompt, 'PA9Committee')
    ]);

    // Check for critical failures
    if (curriculum.error || design.error || assessment.error || committee.error) {
      throw new Error('One or more AI reviewers failed to complete the evaluation.');
    }

    // Merge Scores
    const s_curriculum = curriculum.scores || {};
    const s_design = design.scores || {};
    const s_assessment = assessment.scores || {};
    const s_committee = committee.scores || {};

    const scores = {
      structure: s_curriculum.structure || 0,
      curriculum: s_curriculum.curriculum || 0,
      indicators: s_curriculum.indicators || 0,
      objectives: s_assessment.objectives || 0,
      activities: s_design.activities || 0,
      activeLearning: s_design.activeLearning || 0,
      assessment: s_assessment.assessment || 0,
      tools: s_assessment.tools || 0,
      alignment: s_design.alignment || 0,
      readiness: s_committee.readiness || 0
    };

    const totalScore = Object.values(scores).reduce((a, b) => Number(a) + Number(b), 0);
    
    // Merge Feedback
    const fb_curriculum = curriculum.feedback || {};
    const fb_design = design.feedback || {};
    const fb_assessment = assessment.feedback || {};
    const fb_committee = committee.feedback || {};

    const unifiedResult = {
      totalScore,
      categoryScores: scores,
      strengths: fb_committee.strengths || [],
      weaknesses: fb_committee.weaknesses || [],
      mustFix: fb_committee.mustFix || [],
      inconsistencies: fb_committee.inconsistencies || [],
      curriculumErrors: fb_curriculum.curriculumErrors || [],
      indicatorErrors: fb_curriculum.indicatorErrors || [],
      assessmentErrors: fb_assessment.assessmentErrors || [],
      activeLearningErrors: fb_design.activeLearningErrors || [],
      alignmentErrors: fb_design.alignmentErrors || [],
      academicSuggestions: fb_committee.academicSuggestions || '',
      detailedFixGuidelines: fb_committee.detailedFixGuidelines || '',
      improvedVersion: committee.improvedVersion || null
    };

    // DB Insertion for History
    const planId = planData?.planId || planData?.id;
    const userId = planData?.userId || planData?.author_id || null;

    if (planId) {
      await supabase.from('ai_feedback').insert({
         plan_id: planId,
         user_id: userId,
         rating: totalScore >= 90 ? 5 : totalScore >= 80 ? 4 : totalScore >= 70 ? 3 : 2,
         strengths: JSON.stringify(fb_committee.strengths),
         improvements: JSON.stringify(fb_committee.weaknesses),
         errors_found: JSON.stringify([
           ...(fb_curriculum.curriculumErrors || []),
           ...(fb_curriculum.indicatorErrors || []),
           ...(fb_assessment.assessmentErrors || []),
           ...(fb_design.activeLearningErrors || []),
           ...(fb_design.alignmentErrors || [])
         ]),
         suggestions: fb_committee.academicSuggestions,
         raw_response: JSON.stringify(unifiedResult)
      });
    }

    return NextResponse.json({ success: true, evaluation: unifiedResult });

  } catch (error: any) {
    console.error('Evaluate V4 API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
