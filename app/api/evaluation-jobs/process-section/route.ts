import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sectionPrompts } from '@/lib/aiEvaluationSections';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const maxDuration = 45; // Max 45s per section to prevent Vercel timeout
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { jobId, sectionName, planData, externalText } = await req.json();

    if (!jobId || !sectionName || !sectionPrompts[sectionName]) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY_EVALUATE || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    // 1. Mark section as processing
    await supabase
      .from('ai_evaluation_results')
      .update({ status: 'processing' })
      .match({ job_id: jobId, section_name: sectionName });

    let planContentString = '';
    if (externalText) {
      planContentString = `External Plan Document Content:\n${externalText}`;
    } else if (planData) {
      planContentString = `System Plan JSON:\n${JSON.stringify(planData, null, 2)}`;
    } else {
      throw new Error('No plan content provided.');
    }

    const promptTemplate = sectionPrompts[sectionName];
    const prompt = promptTemplate.replace('<<<PLAN_CONTENT>>>', planContentString);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const model = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // 2. Call AI with 38s timeout (leave buffer for DB update)
    const response = await fetchGeminiWithRetry(apiUrl, payload, 3, apiKey, `eval-${sectionName}`, 38000);
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
    } catch (e: any) {
      throw new Error(`AI JSON Parsing Failed: ${e.message}`);
    }

    // 3. Save result
    const { error: updateError } = await supabase
      .from('ai_evaluation_results')
      .update({ 
        status: 'completed',
        result_json: parsedData 
      })
      .match({ job_id: jobId, section_name: sectionName });

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ success: true, sectionName, result: parsedData });

  } catch (error: any) {
    console.error(`Process Section Error:`, error);
    // Mark as error
    const { jobId, sectionName } = await req.json().catch(() => ({}));
    if (jobId && sectionName) {
      await supabase
        .from('ai_evaluation_results')
        .update({ status: 'error', error_message: error.message })
        .match({ job_id: jobId, section_name: sectionName });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
