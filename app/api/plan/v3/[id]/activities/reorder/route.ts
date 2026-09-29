import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';

interface RouteContext {
  params: { id: string };
}

/**
 * PUT /api/plan/v3/[id]/activities/reorder
 * Normalizes and persists sequential positions (0, 1, 2...) for activities.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
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

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.activity_ids)) {
      return NextResponse.json({ success: false, error: 'ต้องส่ง activity_ids เป็น array' }, { status: 400 });
    }

    const activityIds: string[] = body.activity_ids.filter(isValidUuid);
    await repo.reorderActivities(planId, activityIds);

    const reordered = await repo.getActivities(planId);
    return NextResponse.json({ success: true, data: reordered }, { status: 200 });

  } catch (err: any) {
    console.error('[Reorder Activities Route] Error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการจัดลำดับกิจกรรม' }, { status: 500 });
  }
}
