import { NextResponse } from 'next/server';
import { evaluatorPA8PromptTemplate } from '@/lib/aiEvaluatorPA8Prompt';
import { supabase } from '@/lib/supabase';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planData, externalText } = body;

    const apiKey = process.env.GEMINI_API_KEY_EVALUATE || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }
    
    // Choose the best model
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

    const prompt = evaluatorPA8PromptTemplate.replace('<<<PLAN_CONTENT>>>', planContentString);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 3, apiKey, 'evaluate-pa8');
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
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError: any) {
      console.error('Failed to parse JSON. Raw AI Output:', aiText);
      throw new Error(`AI output parsing failed: ${parseError.message}`);
    }

    // --- DB INSERTIONS ---
    const planId = planData?.planId || planData?.id;
    const userId = planData?.userId || planData?.author_id || null;

    if (planId) {
      // You could update a specific PA8 score column here in the future if desired.
      // For now, we return it so the UI can display the deep PA8 dive.
      await supabase.from('ai_feedback').insert({
         plan_id: planId,
         user_id: userId,
         rating: parsedData.pa8TotalScore >= 32 ? 5 : parsedData.pa8TotalScore >= 24 ? 4 : 3,
         strengths: parsedData.pa8Summary,
         improvements: '',
         errors_found: '',
         suggestions: 'PA8 Deep Dive Evaluation',
         raw_response: JSON.stringify(parsedData)
      });
    }

    return NextResponse.json({ success: true, evaluation: parsedData });

  } catch (error: any) {
    console.error('Evaluate PA8 API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
