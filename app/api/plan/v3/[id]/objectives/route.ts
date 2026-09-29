import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateCreateObjectiveInput, isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string };
}

// POST /api/plan/v3/[id]/objectives - เพิ่ม Objective เข้าแผน
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

    const repo = new V3Repository(supabase);
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }
    if (lesson.status === 'FINAL') {
      return NextResponse.json({ success: false, error: 'แผนการสอนอยู่ในสถานะ FINAL ไม่อนุญาตให้แก้ไข', code: 'LESSON_IS_FINAL' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const validation = validateCreateObjectiveInput({ ...body, lesson_plan_id: planId });

    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const objective = await repo.createObjective(validation.data);
    return NextResponse.json({ success: true, data: objective }, { status: 201 });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการสร้างจุดประสงค์การเรียนรู้' }, { status: 500 });
  }
}

// DELETE /api/plan/v3/[id]/objectives?objectiveId=... - ลบ Objective
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId } = params;
    const { searchParams } = new URL(req.url);
    const objectiveId = searchParams.get('objectiveId');

    if (!isValidUuid(planId) || !objectiveId || !isValidUuid(objectiveId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนหรือรหัสจุดประสงค์ไม่ถูกต้อง' }, { status: 400 });
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

    await repo.deleteObjective(objectiveId);
    return NextResponse.json({ success: true, message: 'ลบจุดประสงค์การเรียนรู้สำเร็จ' });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบจุดประสงค์การเรียนรู้' }, { status: 500 });
  }
}
