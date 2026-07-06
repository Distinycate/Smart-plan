import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function errorResponse(errorCode: string, message: string, status: number) {
  return NextResponse.json({ ok: false, errorCode, message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { patchJobId: string } }
) {
  try {
    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบก่อน', 401);
    }

    const { patchJobId } = params;
    if (!patchJobId) {
      return errorResponse('E_MISSING_PARAM', 'กรุณาระบุ patchJobId', 400);
    }

    // 2. Query patch job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('patch_jobs')
      .select('*')
      .eq('id', patchJobId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (jobError || !job) {
      return errorResponse('E_JOB_NOT_FOUND', 'ไม่พบงานปรับปรุงแผน หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
    }

    // 3. Query job steps
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('patch_job_steps')
      .select('*')
      .eq('patch_job_id', patchJobId)
      .order('created_at', { ascending: true });

    if (stepsError || !steps) {
      return errorResponse('E_DATABASE_READ', 'ไม่สามารถโหลดรายการขั้นตอนได้', 500);
    }

    const completedSteps = steps.filter(s => s.status === 'completed').map(s => s.target_section);
    const failedSteps = steps.filter(s => s.status === 'failed').map(s => s.target_section);
    const skippedSteps = steps.filter(s => s.status === 'skipped').map(s => s.target_section);

    // 4. Query latest version details if job is completed
    let latestVersion = null;
    if (job.to_version_id) {
      const { data: version } = await supabaseAdmin
        .from('lesson_plan_versions')
        .select('version, change_summary, created_at')
        .eq('id', job.to_version_id)
        .maybeSingle();
      if (version) {
        latestVersion = version;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        patchJobId: job.id,
        lessonPlanId: job.lesson_plan_id,
        evaluationJobId: job.evaluation_job_id,
        status: job.status,
        progress: job.progress,
        currentStep: job.current_step,
        completedSteps,
        failedSteps,
        skippedSteps,
        latestVersion,
        error_message: job.error_message,
        recheckJobId: job.metadata?.recheck_job_id || null,
        recheckSections: job.metadata?.recheck_sections || [],
        carryOverSections: job.metadata?.carry_over_sections || [],
        created_at: job.created_at,
        completed_at: job.completed_at
      }
    });

  } catch (error) {
    console.error('Patch status route error:', error);
    return errorResponse('E_INTERNAL', 'เกิดข้อผิดพลาดภายในระบบ', 500);
  }
}
