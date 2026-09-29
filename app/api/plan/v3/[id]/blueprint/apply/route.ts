import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { deriveLessonWorkflowStatus } from '@/lib/smartPlanV3/rules/activityRules';
import { V3BlueprintActivityDraft } from '@/lib/smartPlanV3/types';

interface RouteContext {
  params: { id: string };
}

/**
 * POST /api/plan/v3/[id]/blueprint/apply
 * Saves reviewed activities into database and updates lesson status.
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id, isAdmin);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.activities) || body.activities.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลกิจกรรมที่จะนำไปใช้' }, { status: 400 });
    }

    const activities: V3BlueprintActivityDraft[] = body.activities;
    const mode = body.mode === 'append' ? 'append' : 'replace';

    // Apply to database
    const savedActivities = await repo.applyBlueprint(planId, activities, mode);

    // Fetch objectives to derive new workflow status
    const objectives = await repo.getObjectives(planId);
    const newStatus = deriveLessonWorkflowStatus(lesson, {
      activities: savedActivities,
      objectives,
    });

    if (newStatus !== lesson.status) {
      await repo.updateLesson(planId, { status: newStatus }, user.id, isAdmin);
    }

    return NextResponse.json({
      success: true,
      data: savedActivities,
      status: newStatus,
      message: 'นำกิจกรรมไปใช้ในแผนการสอนเรียบร้อยแล้ว',
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Apply Blueprint Route] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการบันทึกกิจกรรมลงแผนการสอน',
    }, { status: 500 });
  }
}
