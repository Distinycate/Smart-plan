import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { evaluationSections } from '@/lib/aiEvaluationSections';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { planData } = await req.json();
    const planId = planData?.planId || planData?.id;
    const userId = planData?.userId || planData?.author_id || null;

    if (!planId) {
      return NextResponse.json({ success: false, error: 'Missing planId' }, { status: 400 });
    }

    // 1. Create Job
    const { data: job, error: jobError } = await supabase
      .from('ai_evaluation_jobs')
      .insert({
        plan_id: planId,
        user_id: userId,
        status: 'processing',
        progress: 0
      })
      .select('id')
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create job: ${jobError?.message}`);
    }

    // 2. Create Sections
    const sectionInserts = evaluationSections.map(section => ({
      job_id: job.id,
      section_name: section.id,
      status: 'pending'
    }));

    const { error: sectionsError } = await supabase
      .from('ai_evaluation_results')
      .insert(sectionInserts);

    if (sectionsError) {
      // rollback job
      await supabase.from('ai_evaluation_jobs').delete().eq('id', job.id);
      throw new Error(`Failed to create sections: ${sectionsError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      jobId: job.id,
      sections: evaluationSections
    });

  } catch (error: any) {
    console.error('Create Eval Job Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
