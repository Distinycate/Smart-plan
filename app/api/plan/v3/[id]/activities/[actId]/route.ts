import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { deriveLessonWorkflowStatus } from '@/lib/smartPlanV3/rules/activityRules';

interface RouteContext {
  params: { id: string; actId: string };
}

/**
 * PATCH /api/plan/v3/[id]/activities/[actId]
 * Updates a single activity node and its objective/evidence links.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
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

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (lesson.status === 'FINAL') {
      return NextResponse.json({ success: false, error: 'แผนการสอนอยู่ในสถานะ FINAL ไม่อนุญาตให้แก้ไข', code: 'LESSON_IS_FINAL' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (body.title !== undefined) updatePayload.title = body.title ? String(body.title).trim() : null;
    if (body.phase !== undefined) updatePayload.phase = String(body.phase).trim().toUpperCase();
    if (body.minutes !== undefined) {
      const mins = Number(body.minutes);
      if (isNaN(mins) || mins < 0) {
        return NextResponse.json({ success: false, error: 'เวลาที่ใช้ต้องไม่ติดลบ' }, { status: 400 });
      }
      updatePayload.minutes = mins;
    }
    if (body.teacher_actions !== undefined) updatePayload.teacher_actions = String(body.teacher_actions).trim();
    if (body.student_actions !== undefined) updatePayload.student_actions = String(body.student_actions).trim();
    if (body.assessment_moment !== undefined) {
      updatePayload.assessment_moment = body.assessment_moment ? String(body.assessment_moment).trim() : null;
    }
    if (body.feedback_moment !== undefined) {
      updatePayload.feedback_moment = body.feedback_moment ? String(body.feedback_moment).trim() : null;
    }

    if (Object.keys(updatePayload).length > 0) {
      await repo.updateActivity(actId, updatePayload);
    }

    // Update objective links if passed
    if (Array.isArray(body.linked_objective_ids)) {
      await repo.setActivityObjectiveLinks(actId, body.linked_objective_ids.filter(isValidUuid));
    }

    // Update evidence links if passed
    if (Array.isArray(body.linked_evidence_ids)) {
      await repo.setActivityEvidenceLinks(actId, body.linked_evidence_ids.filter(isValidUuid));
    }

    const updatedActivity = await repo.getActivityById(actId);

    // Re-evaluate lesson workflow status
    const allActivities = await repo.getActivities(planId);
    const objectives = await repo.getObjectives(planId);
    const newStatus = deriveLessonWorkflowStatus(lesson, {
      activities: allActivities,
      objectives,
    });

    if (newStatus !== lesson.status) {
      await repo.updateLesson(planId, { status: newStatus }, user.id);
    }

    return NextResponse.json({
      success: true,
      data: updatedActivity,
      status: newStatus,
    }, { status: 200 });

  } catch (err: any) {
    console.error('[Patch Activity Route] Error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการแก้ไขกิจกรรม' }, { status: 500 });
  }
}

/**
 * DELETE /api/plan/v3/[id]/activities/[actId]
 * Deletes a single activity node and downgrades status if needed.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
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

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (lesson.status === 'FINAL') {
      return NextResponse.json({ success: false, error: 'แผนการสอนอยู่ในสถานะ FINAL ไม่อนุญาตให้แก้ไข', code: 'LESSON_IS_FINAL' }, { status: 403 });
    }

    await repo.deleteActivity(actId);

    // Re-evaluate lesson status
    const allActivities = await repo.getActivities(planId);
    const objectives = await repo.getObjectives(planId);
    const newStatus = deriveLessonWorkflowStatus(lesson, {
      activities: allActivities,
      objectives,
    });

    if (newStatus !== lesson.status) {
      await repo.updateLesson(planId, { status: newStatus }, user.id);
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: 'ลบกิจกรรมเรียบร้อยแล้ว',
    }, { status: 200 });

  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    console.error('[Delete Activity Route] Error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบกิจกรรม' }, { status: 500 });
  }
}
