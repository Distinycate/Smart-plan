import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { jobId, planData } = await req.json();

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
    }

    // 1. Fetch all section results
    const { data: results, error: resultsError } = await supabase
      .from('ai_evaluation_results')
      .select('section_name, status, result_json')
      .eq('job_id', jobId);

    if (resultsError || !results) {
      throw new Error('Failed to fetch evaluation results');
    }

    // Ensure all sections are completed
    const pendingOrError = results.filter(r => r.status !== 'completed');
    if (pendingOrError.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot finalize. ${pendingOrError.length} sections are not completed.` 
      }, { status: 400 });
    }

    // 2. Aggregate Results
    let totalScore = 0;
    const categoryScores: Record<string, number> = {};
    const allStrengths: string[] = [];
    const allWeaknesses: string[] = [];
    const mustFix: string[] = [];
    let academicSuggestions = '';
    let detailedFixGuidelines = '';

    results.forEach(row => {
      const { section_name, result_json } = row;
      const data = result_json as any;
      
      if (section_name === 'final_summary') {
        academicSuggestions = data.academicSuggestions || '';
        detailedFixGuidelines = data.detailedFixGuidelines || '';
        if (data.mustFix) mustFix.push(...data.mustFix);
      } else {
        const score = Number(data.score) || 0;
        totalScore += score;
        categoryScores[section_name] = score;
        if (data.strengths) allStrengths.push(...data.strengths);
        if (data.weaknesses) allWeaknesses.push(...data.weaknesses);
      }
    });

    const unifiedResult = {
      totalScore,
      categoryScores,
      strengths: Array.from(new Set(allStrengths)),
      weaknesses: Array.from(new Set(allWeaknesses)),
      mustFix: Array.from(new Set(mustFix)),
      academicSuggestions,
      detailedFixGuidelines
    };

    // 3. Update Job Status
    await supabase
      .from('ai_evaluation_jobs')
      .update({ status: 'completed', progress: 100 })
      .eq('id', jobId);

    // 4. Insert to ai_feedback history (Legacy support)
    const planId = planData?.planId || planData?.id;
    const userId = planData?.userId || planData?.author_id || null;

    if (planId) {
      await supabase.from('ai_feedback').insert({
         plan_id: planId,
         user_id: userId,
         rating: totalScore >= 90 ? 5 : totalScore >= 80 ? 4 : totalScore >= 70 ? 3 : 2,
         strengths: JSON.stringify(unifiedResult.strengths),
         improvements: JSON.stringify(unifiedResult.weaknesses),
         errors_found: JSON.stringify(unifiedResult.mustFix),
         suggestions: academicSuggestions,
         raw_response: JSON.stringify(unifiedResult)
      });
    }

    return NextResponse.json({ success: true, evaluation: unifiedResult });

  } catch (error: any) {
    console.error('Finalize Job Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
