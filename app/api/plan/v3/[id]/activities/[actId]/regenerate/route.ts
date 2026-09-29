import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { regenerateSingleActivity } from '@/lib/smartPlanV3/ai/activityRegenService';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string; actId: string };
}

export const maxDuration = 45;

/**
 * POST /api/plan/v3/[id]/activities/[actId]/regenerate
 * Generates an alternative proposal for a single activity without modifying the DB.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, actId } = params;
    if (!isValidUuid(planId) || !isValidUuid(actId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนหรือกิจกรรมไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    const result = await regenerateSingleActivity(planId, actId, supabase, user.id, { isAdmin });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'ไม่สามารถขอแนวทางกิจกรรมใหม่ได้ กรุณาลองใหม่อีกครั้ง',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        originalActivity: result.originalActivity,
        alternativeDraft: result.alternativeDraft,
      },
    }, { status: 200 });

  } catch (err: any) {
    console.error('[Regenerate Activity Route] Error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการประมวลผล' }, { status: 500 });
  }
}
