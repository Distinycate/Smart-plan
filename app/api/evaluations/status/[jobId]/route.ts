import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evaluationErrorResponse } from '@/lib/lesson-plan/jobs/http';
import { getOwnedJob, qualityPlatformAdmin } from '@/lib/lesson-plan/jobs/server';

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
        message: 'กรุณาเข้าสู่ระบบก่อนดูสถานะงานประเมิน',
        details: {},
        recoverable: true,
      }, { status: 401 });
    }

    const job = await getOwnedJob(params.jobId, user.id);
    const admin = qualityPlatformAdmin();
    const { data: sections, error } = await admin
      .from('evaluation_results')
      .select('section,status,score,max_score,level,error_message,attempt_count')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: {
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
      },
      message: 'โหลดสถานะงานประเมินสำเร็จ',
      warnings: [],
    });
  } catch (error) {
    return evaluationErrorResponse(error);
  }
}
