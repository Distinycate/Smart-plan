import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateLessonBlueprint } from '@/lib/smartPlanV3/ai/blueprintService';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string };
}

export const maxDuration = 60; // Vercel timeout setting

/**
 * POST /api/plan/v3/[id]/blueprint/generate
 * Calls Gemini to generate structured Lesson Blueprint preview.
 * DOES NOT save to database until teacher reviews and clicks Apply.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId } = params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    // Check user profile for admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    // Verify ownership
    const { data: plan, error: planErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id')
      .eq('id', planId)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    if (plan.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ success: false, error: 'คุณไม่มีสิทธิ์แก้ไขแผนการสอนนี้' }, { status: 403 });
    }

    const result = await generateLessonBlueprint(planId, supabase, user.id, { isAdmin });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'ยังสร้างกิจกรรมไม่สำเร็จ ข้อมูลแผนของคุณยังอยู่ครบ กรุณาลองใหม่อีกครั้ง',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        blueprint: result.blueprint,
        previewActivities: result.previewActivities,
        ruleSummary: result.ruleSummary,
        meta: result.meta,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Generate Blueprint Route] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'บริการ AI ขัดข้องชั่วคราว ข้อมูลแผนของคุณยังอยู่ครบ กรุณาลองใหม่อีกครั้ง',
    }, { status: 500 });
  }
}
