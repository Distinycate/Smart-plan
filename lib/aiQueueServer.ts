import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function validateAiQueueAdmission(req: Request) {
  const jobId = req.headers.get('x-ai-queue-job');
  if (!jobId) {
    return NextResponse.json({
      success: false,
      error: 'กรุณาเรียกบริการ AI ผ่านระบบคิว',
      errorCode: 'E_QUEUE_ADMISSION_REQUIRED',
    }, { status: 409 });
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({
      success: false,
      error: 'กรุณาเข้าสู่ระบบก่อนใช้บริการ AI',
      errorCode: 'E_PERMISSION_DENIED',
    }, { status: 401 });
  }

  const adminDb = getSupabaseAdmin();
  const { data: job, error } = await adminDb
    .from('ai_jobs')
    .select('job_id, user_id, status, lease_expires_at')
    .eq('job_id', jobId)
    .single();

  const leaseValid = job?.lease_expires_at &&
    new Date(job.lease_expires_at).getTime() > Date.now();

  if (error || !job || job.user_id !== user.id || job.status !== 'processing' || !leaseValid) {
    return NextResponse.json({
      success: false,
      error: 'คิว AI ไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง',
      errorCode: 'E_QUEUE_ADMISSION_INVALID',
    }, { status: 409 });
  }

  return null;
}

