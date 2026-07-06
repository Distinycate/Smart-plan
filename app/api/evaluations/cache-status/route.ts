import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isEvaluationMode } from '@/lib/lesson-plan';
import { qualityPlatformAdmin } from '@/lib/lesson-plan/jobs/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false, errorCode: 'E_PERMISSION_DENIED',
        message: 'กรุณาเข้าสู่ระบบก่อน', details: {}, recoverable: true,
      }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hash = searchParams.get('hash') ?? '';
    const mode = searchParams.get('mode') ?? '';

    if (!hash || !/^[0-9a-f]{64}$/.test(hash)) {
      return NextResponse.json({
        ok: false, errorCode: 'E_INVALID_HASH',
        message: 'hash ต้องเป็น SHA-256 hex 64 ตัวอักษร', details: {}, recoverable: true,
      }, { status: 400 });
    }
    if (!isEvaluationMode(mode)) {
      return NextResponse.json({
        ok: false, errorCode: 'E_INVALID_MODE',
        message: 'evaluationMode ไม่ถูกต้อง', details: {}, recoverable: true,
      }, { status: 400 });
    }

    const admin = qualityPlatformAdmin();
    const { data, error } = await admin
      .from('evaluation_cache')
      .select('final_score, final_level, result_json, created_at')
      .eq('lesson_plan_hash', hash)
      .eq('evaluation_mode', mode)
      .maybeSingle();

    if (error) {
      console.error('Cache status query error:', error);
      return NextResponse.json({
        ok: false, errorCode: 'E_DATABASE_READ',
        message: 'ไม่สามารถอ่านข้อมูล cache ได้', details: {}, recoverable: false,
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        ok: true,
        hit: false,
        hash,
        mode,
        message: 'ยังไม่มีผลประเมินใน cache — ต้องประเมินใหม่',
        cached: null,
      });
    }

    return NextResponse.json({
      ok: true,
      hit: true,
      hash,
      mode,
      message: 'พบผลประเมินใน cache',
      cached: {
        final_score: data.final_score,
        final_level: data.final_level,
        result_json: data.result_json,
        cached_at: data.created_at,
      },
    });
  } catch (error) {
    console.error('Cache status error:', error);
    return NextResponse.json({
      ok: false, errorCode: 'E_INTERNAL',
      message: 'เกิดข้อผิดพลาดภายในระบบ', details: {}, recoverable: false,
    }, { status: 500 });
  }
}
