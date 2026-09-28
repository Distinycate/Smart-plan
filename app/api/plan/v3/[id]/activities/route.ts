import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateCreateActivityInput, isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string };
}

// POST /api/plan/v3/[id]/activities - สร้างกิจกรรม หรือเชื่อมโยงกิจกรรมกับจุดประสงค์/หลักฐาน
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

    const body = await req.json().catch(() => null);

    // กรณีเชื่อมโยง Activity ↔ Objective
    if (body?.link_objective === true) {
      const { activity_id, objective_id } = body;
      if (!isValidUuid(activity_id) || !isValidUuid(objective_id)) {
        return NextResponse.json({ success: false, error: 'รหัส activity_id หรือ objective_id ไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkActivityObjective(activity_id, objective_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // กรณีเชื่อมโยง Activity ↔ Evidence
    if (body?.link_evidence === true) {
      const { activity_id, evidence_id } = body;
      if (!isValidUuid(activity_id) || !isValidUuid(evidence_id)) {
        return NextResponse.json({ success: false, error: 'รหัส activity_id หรือ evidence_id ไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkActivityEvidence(activity_id, evidence_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // กรณีสร้าง Activity ใหม่
    const validation = validateCreateActivityInput({ ...body, lesson_plan_id: planId });
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const activity = await repo.createActivity(validation.data);

    // Auto link Objective IDs ถ้ามีส่งมา
    if (Array.isArray(body.linked_objective_ids)) {
      for (const objId of body.linked_objective_ids) {
        if (isValidUuid(objId)) {
          await repo.linkActivityObjective(activity.id, objId);
        }
      }
    }

    // Auto link Evidence IDs ถ้ามีส่งมา
    if (Array.isArray(body.linked_evidence_ids)) {
      for (const evdId of body.linked_evidence_ids) {
        if (isValidUuid(evdId)) {
          await repo.linkActivityEvidence(activity.id, evdId);
        }
      }
    }

    return NextResponse.json({ success: true, data: activity }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการจัดการกิจกรรมการเรียนรู้' }, { status: 500 });
  }
}
