import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getOwnedJob } from '@/lib/lesson-plan/jobs/server';
import { RESULT_COLUMNS } from '@/lib/lesson-plan/jobs/types';
import { fail, ok } from '@/lib/api-response';
import { logApiError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const context = 'api/evaluations/result';
  let step = 'auth';
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return fail('AUTH_REQUIRED', 'กรุณาเข้าสู่ระบบก่อนดูผลประเมิน', { step });
    }

    step = 'fetch_job';
    const job = await getOwnedJob(params.jobId, user.id);
    
    step = 'fetch_results';
    const { data: sections, error } = await supabaseAdmin
      .from('evaluation_results')
      .select(RESULT_COLUMNS)
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });
      
    if (error) {
      logApiError(context, error, { step, jobId: job.id });
      return fail('SUPABASE_SELECT_FAILED', 'โหลดส่วนประเมินไม่สำเร็จ', { step, debugMessage: JSON.stringify(error) });
    }

    const cachedResult = job.metadata?.cachedResult;
    const storedResult = job.metadata?.result;
    
    // Using ok() with a custom status code for 202 if not completed
    const responsePayload = {
      jobId: job.id,
      status: job.status,
      completed: job.status === 'completed',
      result: storedResult || cachedResult || null,
      sections: sections || [],
      finalScore: job.final_score,
      finalLevel: job.final_level,
      readinessStatus: job.readiness_status,
      issues: job.status === 'lesson_plan_not_ready' ? job.metadata?.validation || null : null,
    };
    
    return ok(responsePayload, job.status === 'completed' ? 'โหลดผลประเมินสำเร็จ' : 'งานประเมินยังไม่เสร็จ');
  } catch (error) {
    logApiError(context, error, { step });
    return fail('UNKNOWN_ERROR', 'เกิดข้อผิดพลาดภายในระบบ', { step, debugMessage: error instanceof Error ? error.message : String(error) });
  }
}
