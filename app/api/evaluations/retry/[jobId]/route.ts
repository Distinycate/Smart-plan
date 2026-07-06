import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { evaluationErrorResponse, invalidRequest } from '@/lib/lesson-plan/jobs/http';
import { getOwnedJob, qualityPlatformAdmin } from '@/lib/lesson-plan/jobs/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_PERMISSION_DENIED',
        message: 'กรุณาเข้าสู่ระบบก่อน retry งานประเมิน',
        details: {},
        recoverable: true,
      }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) as Record<string, unknown> : {};
    } catch {
      return invalidRequest('รูปแบบ JSON ไม่ถูกต้อง');
    }
    const section = String(body.section || '').trim();
    const job = await getOwnedJob(params.jobId, user.id);
    if (job.status === 'completed') {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_RETRY_NOT_ALLOWED',
        message: 'งานประเมินนี้เสร็จสมบูรณ์แล้ว ไม่จำเป็นต้อง retry',
        details: { status: job.status },
        recoverable: false,
      }, { status: 409 });
    }

    const admin = qualityPlatformAdmin();
    let failedQuery = admin
      .from('evaluation_results')
      .select('id,section')
      .eq('job_id', job.id)
      .eq('status', 'failed')
      .order('created_at', { ascending: true })
      .limit(1);
    if (section) failedQuery = failedQuery.eq('section', section);
    const { data: failedRows, error } = await failedQuery;
    if (error) throw error;
    const failed = failedRows?.[0];
    if (!failed) {
      return NextResponse.json({
        ok: false,
        errorCode: 'E_FAILED_SECTION_NOT_FOUND',
        message: 'ไม่พบ section ที่ล้มเหลวสำหรับ retry',
        details: { section: section || null },
        recoverable: true,
      }, { status: 404 });
    }

    const { error: resetError } = await admin
      .from('evaluation_results')
      .update({
        status: 'pending',
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq('id', failed.id);
    if (resetError) throw resetError;

    await admin.from('evaluation_jobs').update({
      status: 'pending',
      current_section: null,
      error_message: null,
      completed_at: null,
    }).eq('id', job.id).eq('user_id', user.id);

    return NextResponse.json({
      ok: true,
      data: {
        jobId: job.id,
        section: failed.section,
        status: 'pending',
        processNext: true,
      },
      message: 'ตั้งค่า section สำหรับ retry แล้ว',
      warnings: [],
    });
  } catch (error) {
    return evaluationErrorResponse(error);
  }
}
