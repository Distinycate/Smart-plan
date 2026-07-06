import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const getConcurrencyLimit = () => {
  const configured = Number(process.env.AI_CONCURRENCY_LIMIT || '');
  if (Number.isInteger(configured) && configured > 0) {
    return Math.min(configured, 20);
  }

  // Unknown/expired keys cannot be detected safely at startup. Default to one
  // shared slot unless the operator explicitly raises AI_CONCURRENCY_LIMIT.
  return 1;
};

const errorResponse = (message: string, status: number, errorCode: string) =>
  NextResponse.json({ success: false, error: message, errorCode }, { status });

async function getAuthenticatedUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
      return errorResponse('กรุณาเข้าสู่ระบบก่อนใช้บริการ AI', 401, 'E_PERMISSION_DENIED');
    }

    const body = await req.json();
    const { action, jobId } = body;
    const adminDb = getSupabaseAdmin();

    if (action === 'enqueue') {
      const { data, error } = await adminDb
        .from('ai_jobs')
        .insert({
          user_id: user.id,
          status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .select('job_id')
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, jobId: data.job_id });
    }

    if (['complete', 'cancel', 'failed'].includes(action)) {
      if (!jobId) return errorResponse('Missing jobId', 400, 'E_QUEUE_JOB_ID_REQUIRED');

      const { data: job, error: findError } = await adminDb
        .from('ai_jobs')
        .select('job_id, user_id, status')
        .eq('job_id', jobId)
        .single();

      if (findError || !job) return errorResponse('ไม่พบคิวงาน AI', 404, 'E_QUEUE_JOB_NOT_FOUND');
      if (job.user_id !== user.id) {
        return errorResponse('ไม่มีสิทธิ์จัดการคิวนี้', 403, 'E_PERMISSION_DENIED');
      }

      const nextStatus = action === 'complete' ? 'complete' : action;
      const { error } = await adminDb
        .from('ai_jobs')
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
          lease_expires_at: null,
          error_code: action === 'failed' ? (body.errorCode || 'E_AI_REQUEST_FAILED') : null,
        })
        .eq('job_id', jobId)
        .eq('user_id', user.id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return errorResponse('Invalid action', 400, 'E_QUEUE_ACTION_INVALID');
  } catch (error: any) {
    console.error('Queue POST Error:', error);
    return errorResponse(
      'ระบบคิว AI ยังไม่พร้อม กรุณาลองใหม่อีกครั้ง',
      503,
      error?.code === '42P01' ? 'E_QUEUE_SCHEMA_MISSING' : 'E_QUEUE_UNAVAILABLE'
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser();
    if (authError || !user) {
      return errorResponse('กรุณาเข้าสู่ระบบก่อนใช้บริการ AI', 401, 'E_PERMISSION_DENIED');
    }

    const jobId = new URL(req.url).searchParams.get('jobId');
    if (!jobId) return errorResponse('Missing jobId', 400, 'E_QUEUE_JOB_ID_REQUIRED');

    const adminDb = getSupabaseAdmin();
    const { data: job, error: jobError } = await adminDb
      .from('ai_jobs')
      .select('job_id, user_id, status')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) return errorResponse('ไม่พบคิวงาน AI', 404, 'E_QUEUE_JOB_NOT_FOUND');
    if (job.user_id !== user.id) {
      return errorResponse('ไม่มีสิทธิ์ดูคิวนี้', 403, 'E_PERMISSION_DENIED');
    }

    const { data, error } = await adminDb.rpc('claim_ai_job', {
      p_job_id: jobId,
      p_concurrency_limit: getConcurrencyLimit(),
      p_lease_seconds: 90,
    });
    if (error) throw error;

    const claim = Array.isArray(data) ? data[0] : data;
    const status = claim?.job_status || job.status;
    const position = Number(claim?.queue_position || 0);

    if (status === 'not_found') {
      return errorResponse('ไม่พบคิวงาน AI', 404, 'E_QUEUE_JOB_NOT_FOUND');
    }

    return NextResponse.json({ success: true, status, position });
  } catch (error: any) {
    console.error('Queue GET Error:', error);
    return errorResponse(
      'ไม่สามารถตรวจสอบคิว AI ได้ กรุณาลองใหม่อีกครั้ง',
      503,
      error?.code === '42883' || error?.code === '42P01'
        ? 'E_QUEUE_SCHEMA_MISSING'
        : 'E_QUEUE_UNAVAILABLE'
    );
  }
}
