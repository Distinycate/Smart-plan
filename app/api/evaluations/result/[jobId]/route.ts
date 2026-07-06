import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evaluationErrorResponse } from '@/lib/lesson-plan/jobs/http';
import { getOwnedJob, qualityPlatformAdmin } from '@/lib/lesson-plan/jobs/server';
import { RESULT_COLUMNS } from '@/lib/lesson-plan/jobs/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_PERMISSION_DENIED',
        message: 'กรุณาเข้าสู่ระบบก่อนดูผลประเมิน',
        details: {},
        recoverable: true,
      }, { status: 401 });
    }

    const job = await getOwnedJob(params.jobId, user.id);
    const admin = qualityPlatformAdmin();
    const { data: sections, error } = await admin
      .from('evaluation_results')
      .select(RESULT_COLUMNS)
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const cachedResult = job.metadata?.cachedResult;
    const storedResult = job.metadata?.result;
    return NextResponse.json({
      ok: true,
      data: {
        jobId: job.id,
        status: job.status,
        completed: job.status === 'completed',
        result: storedResult || cachedResult || null,
        sections: sections || [],
        finalScore: job.final_score,
        finalLevel: job.final_level,
        readinessStatus: job.readiness_status,
        issues: job.status === 'lesson_plan_not_ready'
          ? job.metadata?.validation || null
          : null,
      },
      message: job.status === 'completed'
        ? 'โหลดผลประเมินสำเร็จ'
        : 'งานประเมินยังไม่เสร็จ',
      warnings: [],
    }, { status: job.status === 'completed' ? 200 : 202 });
  } catch (error) {
    return evaluationErrorResponse(error);
  }
}
