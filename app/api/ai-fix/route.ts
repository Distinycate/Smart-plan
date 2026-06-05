import { NextResponse } from 'next/server';
import { autoFixPromptTemplate } from '@/lib/aiEvaluatorPrompt';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planData, feedbackContent } = body;

    const apiKey = process.env.GEMINI_API_KEY_FIX || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    
    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let prompt = autoFixPromptTemplate.replace('<<<PLAN_CONTENT>>>', JSON.stringify(planData, null, 2));
    prompt = prompt.replace('<<<FEEDBACK_CONTENT>>>', feedbackContent || 'ปรับปรุงให้สมบูรณ์ตามเกณฑ์ประเมินแผน');

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 3, apiKey);
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
    
    let fixedPlanData;
    try {
      fixedPlanData = JSON.parse(cleanedText);
    } catch (parseError: any) {
      console.error("Failed to parse JSON. Raw AI Output:", aiText);
      throw new Error(`AI output parsing failed: ${parseError.message}`);
    }

    // Provide a new ID for the fixed plan
    const newPlanId = `ai-fixed-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const standardData = {
      ...fixedPlanData,
      planId: newPlanId,
      planStatus: 'ai_fixed',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Remove fields that might cause issues if they exist
    delete standardData.id;
    
    // DO NOT insert automatically. Let the frontend handle saving.
    return NextResponse.json({ success: true, fixedPlanId: newPlanId, newPlanData: standardData });

  } catch (error: any) {
    console.error('Auto-Fix API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
