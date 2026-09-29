import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';

type Ctx = { params: { id: string; objId: string } };

/**
 * PATCH /api/plan/v3/[id]/objectives/[objId]
 * Update an objective's statement, position, objective_type, or observable_behavior.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id: planId, objId } = await params;

    if (!isValidUuid(planId) || !isValidUuid(objId)) {
      return NextResponse.json({ success: false, error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const allowed: Record<string, any> = {};
    if (typeof body.statement === 'string' && body.statement.trim()) {
      allowed.statement = body.statement.trim();
    }
    if (body.position !== undefined) {
      const p = Number(body.position);
      if (!isNaN(p) && p >= 0) allowed.position = p;
    }
    if (body.objective_type !== undefined) {
      allowed.objective_type = body.objective_type ? String(body.objective_type).trim() : null;
    }
    if (body.observable_behavior !== undefined) {
      allowed.observable_behavior = body.observable_behavior ? String(body.observable_behavior).trim() : null;
    }

    const { data: updated, error } = await supabase
      .from('v3_lesson_objectives')
      .update(allowed)
      .eq('id', objId)
      .eq('lesson_plan_id', planId)
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json({ success: false, error: 'ไม่สามารถอัปเดตจุดประสงค์ได้' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

/**
 * DELETE /api/plan/v3/[id]/objectives/[objId]
 * Delete a specific objective by ID (cascade removes junction links).
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id: planId, objId } = await params;

    if (!isValidUuid(planId) || !isValidUuid(objId)) {
      return NextResponse.json({ success: false, error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const { data: existingObj } = await supabase
      .from('v3_lesson_objectives')
      .select('id, lesson_plan_id')
      .eq('id', objId)
      .eq('lesson_plan_id', planId)
      .maybeSingle();

    if (!existingObj) {
      return NextResponse.json({ success: false, error: 'ไม่พบจุดประสงค์ที่ระบุ หรือไม่ได้อยู่ในแผนนี้' }, { status: 404 });
    }

    await repo.deleteObjective(objId);
    return NextResponse.json({ success: true, message: 'ลบจุดประสงค์สำเร็จ' });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบ' }, { status: 500 });
  }
}
