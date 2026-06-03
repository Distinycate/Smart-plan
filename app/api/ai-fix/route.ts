import { NextResponse } from 'next/server';
import { autoFixPromptTemplate } from '@/lib/aiEvaluatorPrompt';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planData, feedback } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    
    const model = 'gemini-1.5-pro'; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let prompt = autoFixPromptTemplate.replace('<<<PLAN_CONTENT>>>', JSON.stringify(planData, null, 2));
    prompt = prompt.replace('<<<FEEDBACK_CONTENT>>>', JSON.stringify(feedback, null, 2));

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) throw new Error('Invalid response from Gemini');

    let cleanedText = aiText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const fixedPlanData = JSON.parse(cleanedText);

    // Provide a new ID for the fixed plan
    const newPlanId = `plan-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const standardData = {
      ...fixedPlanData,
      planId: newPlanId,
      planStatus: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Remove fields that might cause issues if they exist
    delete standardData.id;
    
    const { error: insertErr } = await supabase.from('LessonPlans').insert(standardData);
    if (insertErr) {
       // if rubric columns missing, try fallback
       const isMissingColumnError = insertErr.message?.includes('column') && 
       (insertErr.message?.includes('rubricK') || insertErr.message?.includes('rubricP') || insertErr.message?.includes('rubricA'));
       if(isMissingColumnError){
           const fallbackData = {...standardData};
           delete fallbackData.rubricK;
           delete fallbackData.rubricP;
           delete fallbackData.rubricA;
           const {error: fbErr} = await supabase.from('LessonPlans').insert(fallbackData);
           if(fbErr) throw fbErr;
       } else {
           throw insertErr;
       }
    }

    return NextResponse.json({ success: true, fixedPlanId: newPlanId });

  } catch (error: any) {
    console.error('Auto-Fix API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
