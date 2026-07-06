import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isEvaluationMode } from '@/lib/lesson-plan';
import { qualityPlatformAdmin } from '@/lib/lesson-plan/jobs/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/evaluations/invalidate-cache
 * Removes the cache entry for a given hash+mode pair.
 * Called automatically by the Patch API after writing back to LessonPlans
 * (since the canonical hash changes after any patch).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false, errorCode: 'E_PERMISSION_DENIED',
        message: 'กรุณาเข้าสู่ระบบก่อน', details: {}, recoverable: true,
      }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = await req.json();
      body = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return NextResponse.json({
        ok: false, errorCode: 'E_INVALID_JSON',
        message: 'รูปแบบ JSON ไม่ถูกต้อง', details: {}, recoverable: true,
      }, { status: 400 });
    }

    const hash = String(body.hash ?? '').trim();
    const mode = body.mode;

    if (!hash || !/^[0-9a-f]{64}$/.test(hash)) {
      return NextResponse.json({
        ok: false, errorCode: 'E_INVALID_HASH',
        message: 'hash ต้องเป็น SHA-256 hex 64 ตัวอักษร', details: {}, recoverable: true,
      }, { status: 400 });
    }

    const admin = qualityPlatformAdmin();
    let query = admin.from('evaluation_cache').delete().eq('lesson_plan_hash', hash);
    if (mode && isEvaluationMode(mode)) {
      query = query.eq('evaluation_mode', mode) as typeof query;
    }
    const { error } = await query;

    if (error) {
      console.error('Cache invalidation error:', error);
      return NextResponse.json({
        ok: false, errorCode: 'E_DATABASE_WRITE',
        message: 'ไม่สามารถลบ cache ได้', details: {}, recoverable: false,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      hash,
      mode: mode ?? 'all',
      message: mode ? `ลบ cache สำหรับ mode ${mode} แล้ว` : 'ลบ cache ทุก mode สำหรับ hash นี้แล้ว',
    });
  } catch (error) {
    console.error('Invalidate cache error:', error);
    return NextResponse.json({
      ok: false, errorCode: 'E_INTERNAL',
      message: 'เกิดข้อผิดพลาดภายในระบบ', details: {}, recoverable: false,
    }, { status: 500 });
  }
}
