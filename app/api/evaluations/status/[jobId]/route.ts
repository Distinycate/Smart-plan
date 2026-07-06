import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOwnedJob } from '@/lib/lesson-plan/jobs/server';
import { fail, ok } from '@/lib/api-response';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const context = 'api/evaluations/status';
  let step = 'auth';
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return fail('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบก่อนดูสถานะงานประเมิน', { step });
    }

    step = 'fetch_job';
    const job = await getOwnedJob(params.jobId, user.id);
    
    step = 'fetch_results';
    const { data: sections, error } = await supabaseAdmin
      .from('evaluation_results')
      .select('section,status,score,max_score,level,error_message,attempt_count')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });
      
    if (error) {
      logApiError(context, error, { step, jobId: job.id });
      return fail('SUPABASE_SELECT_FAILED', 'โหลดสถานะส่วนประเมินไม่สำเร็จ', { step, debugMessage: JSON.stringify(error) });
    }

    return ok({
      jobId: job.id,
      lessonPlanId: job.lesson_plan_id,
      evaluationMode: job.evaluation_mode,
      status: job.status,
      progress: job.progress,
      currentSection: job.current_section,
      finalScore: job.final_score,
      finalLevel: job.final_level,
      readinessStatus: job.readiness_status,
      errorMessage: job.error_message,
      sections: sections || [],
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt: job.completed_at,
    }, 'โหลดสถานะงานประเมินสำเร็จ');
  } catch (error) {
    logApiError(context, error, { step });
    return fail('UNKNOWN_ERROR', 'เกิดข้อผิดพลาดภายในระบบ', { step, debugMessage: error instanceof Error ? error.message : String(error) });
  }
}
