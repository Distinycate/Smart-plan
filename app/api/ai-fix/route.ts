import { NextResponse } from 'next/server';
import { autoFixPromptTemplate } from '@/lib/aiEvaluatorPrompt';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { fastJsonGenerationConfig } from '@/lib/geminiRuntime';
import { sanitizeRubricsOutOfAssessmentTools } from '@/lib/lesson-plan/rubric-field-sanitizer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {

    const body = await req.json();
    const { planData, feedbackContent } = body;

    const apiKey = process.env.GEMINI_API_KEY_FIX || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    
    const model =
      process.env.GEMINI_FIX_MODEL?.trim()
      || process.env.GEMINI_FAST_MODEL?.trim()
      || 'gemini-2.5-flash-lite';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    if (!planData || typeof planData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลแผนสำหรับปรับปรุง' },
        { status: 400 }
      );
    }

    let compactFeedback = feedbackContent || 'ปรับปรุงให้สมบูรณ์ตามเกณฑ์ประเมินแผน';
    if (typeof compactFeedback !== 'string') {
      compactFeedback = JSON.stringify(compactFeedback);
    }
    // Old clients may send the entire result including a duplicate original plan.
    // Bound feedback only; the authoritative plan remains complete.
    compactFeedback = compactFeedback.slice(0, 8_000);

    let prompt = autoFixPromptTemplate.replace('<<<PLAN_CONTENT>>>', JSON.stringify(planData));
    prompt = prompt.replace('<<<FEEDBACK_CONTENT>>>', compactFeedback);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: fastJsonGenerationConfig(8_192)
    };

    const response = await fetchGeminiWithRetry(
      apiUrl,
      payload,
      2,
      apiKey,
      'fix-plan',
      45_000
    );
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

    const sanitizedFixedPlanData = sanitizeRubricsOutOfAssessmentTools(fixedPlanData);

    const standardData = {
      ...sanitizedFixedPlanData,
      planId: newPlanId,
      planStatus: 'ai_fixed',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Remove fields that might cause issues if they exist
    delete standardData.id;
    Object.keys(standardData).forEach(key => {
      if (key.startsWith('fixReason')) {
        delete standardData[key];
      }
    });
    
    // DO NOT insert automatically. Let the frontend handle saving.
    return NextResponse.json({ success: true, fixedPlanId: newPlanId, newPlanData: standardData });

  } catch (error: any) {
    console.error('Auto-Fix API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
