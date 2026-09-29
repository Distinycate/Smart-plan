import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';

interface RouteContext {
  params: { id: string; asmId: string };
}

// GET /api/plan/v3/[id]/assessments/[asmId] - ดึง Assessment เดียว
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, asmId } = params;
    if (!isValidUuid(planId) || !isValidUuid(asmId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนหรือรหัสการประเมินไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const assessment = await repo.getAssessmentById(asmId);
    if (!assessment || assessment.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการประเมินที่ระบุ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: assessment });
  } catch (err: any) {
    console.error('Error getting assessment:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  }
}

// PATCH /api/plan/v3/[id]/assessments/[asmId] - อัปเดต Assessment และ/หรือ links
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, asmId } = params;
    if (!isValidUuid(planId) || !isValidUuid(asmId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนหรือรหัสการประเมินไม่ถูกต้อง' }, { status: 400 });
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

    const existingAsm = await repo.getAssessmentById(asmId);
    if (!existingAsm || existingAsm.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการประเมินที่ระบุ' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'ข้อมูลสำหรับอัปเดตไม่ถูกต้อง' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof body.name === 'string' && body.name.trim()) updateData.name = body.name.trim();
    if (typeof body.assessment_type === 'string' && body.assessment_type.trim()) updateData.assessment_type = body.assessment_type.trim();
    if (typeof body.method === 'string' && body.method.trim()) updateData.method = body.method.trim();
    if (typeof body.criteria_type === 'string' && body.criteria_type.trim()) updateData.criteria_type = body.criteria_type.trim();
    if (body.criteria_value !== undefined) {
      updateData.criteria_value = body.criteria_value === null ? null : Number(body.criteria_value);
    }
    if (body.criteria_text !== undefined) {
      updateData.criteria_text = body.criteria_text ? String(body.criteria_text).trim() : null;
    }
    if (typeof body.formative === 'boolean') updateData.formative = body.formative;
    if (body.position !== undefined) updateData.position = Number(body.position);

    let options: { evidenceIds?: string[]; activityIds?: string[] } | undefined;
    if (Array.isArray(body.evidenceIds) || Array.isArray(body.activityIds)) {
      options = {};
      if (Array.isArray(body.evidenceIds)) {
        options.evidenceIds = body.evidenceIds.filter((id: string) => isValidUuid(id));
      }
      if (Array.isArray(body.activityIds)) {
        options.activityIds = body.activityIds.filter((id: string) => isValidUuid(id));
      }
    }

    const updated = await repo.updateAssessment(asmId, updateData, options);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    console.error('Error updating assessment:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตการวัดและประเมินผล' }, { status: 500 });
  }
}

// DELETE /api/plan/v3/[id]/assessments/[asmId] - ลบ Assessment
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, asmId } = params;
    if (!isValidUuid(planId) || !isValidUuid(asmId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนหรือรหัสการประเมินไม่ถูกต้อง' }, { status: 400 });
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

    const existingAsm = await repo.getAssessmentById(asmId);
    if (!existingAsm || existingAsm.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการประเมินที่ระบุ' }, { status: 404 });
    }

    await repo.deleteAssessment(asmId);

    return NextResponse.json({ success: true, message: 'ลบรายการประเมินเรียบร้อยแล้ว' });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    console.error('Error deleting assessment:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบการวัดและประเมินผล' }, { status: 500 });
  }
}
