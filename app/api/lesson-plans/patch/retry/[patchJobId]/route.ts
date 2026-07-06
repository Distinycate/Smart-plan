import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function errorResponse(errorCode: string, message: string, status: number) {
  return NextResponse.json({ ok: false, errorCode, message }, { status });
}

export async function POST(
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

    // 2. Query patch job to verify ownership
    const { data: job, error: jobError } = await supabaseAdmin
      .from('patch_jobs')
      .select('*')
      .eq('id', patchJobId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (jobError || !job) {
      return errorResponse('E_JOB_NOT_FOUND', 'ไม่พบงานปรับปรุงแผน หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
    }

    if (job.status === 'completed') {
      return errorResponse('E_RETRY_NOT_ALLOWED', 'งานปรับปรุงแผนนี้เสร็จสิ้นแล้ว ไม่สามารถ retry ได้', 409);
    }

    // 3. Reset failed steps back to pending
    const { data: updatedSteps, error: stepsResetError } = await supabaseAdmin
      .from('patch_job_steps')
      .update({
        status: 'pending',
        error_type: null,
        error_message: null,
      })
      .eq('patch_job_id', patchJobId)
      .eq('status', 'failed')
      .select('target_section');

    if (stepsResetError) {
      console.error('Failed to reset failed steps:', stepsResetError);
      return errorResponse('E_DATABASE_WRITE', 'ไม่สามารถรีเซ็ตสถานะขั้นตอนที่ล้มเหลวได้', 500);
    }

    if (!updatedSteps || updatedSteps.length === 0) {
      return errorResponse('E_NO_FAILED_STEPS', 'ไม่พบขั้นตอนที่ล้มเหลวให้เริ่มต้นใหม่', 404);
    }

    // 4. Set job status back to processing/pending
    await supabaseAdmin
      .from('patch_jobs')
      .update({
        status: 'processing',
        error_message: null
      })
      .eq('id', patchJobId);

    return NextResponse.json({
      ok: true,
      data: {
        patchJobId,
        status: 'processing',
        retriedSections: updatedSteps.map(s => s.target_section),
        processNext: true
      },
      message: 'เริ่มต้นใหม่สำหรับขั้นตอนที่ล้มเหลวเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Patch retry route error:', error);
    return errorResponse('E_INTERNAL', 'เกิดข้อผิดพลาดภายในระบบ', 500);
  }
}
