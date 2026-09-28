import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateCreateEvidenceInput, isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string };
}

// POST /api/plan/v3/[id]/evidence - สร้าง Evidence หรือเชื่อมโยง Objective-Evidence
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

    // กรณีต้องการเชื่อมโยง Objective ↔ Evidence (link_action = true)
    if (body?.link_action === true) {
      const { objective_id, evidence_id } = body;
      if (!isValidUuid(objective_id) || !isValidUuid(evidence_id)) {
        return NextResponse.json({ success: false, error: 'รหัส objective_id หรือ evidence_id ไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkObjectiveEvidence(objective_id, evidence_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // กรณีสร้าง Evidence ใหม่
    const validation = validateCreateEvidenceInput({ ...body, lesson_plan_id: planId });
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const evidence = await repo.createEvidence(validation.data);

    // หากมีการระบุ objective_id มาด้วย ให้เชื่อมโยงทันที
    if (body.linked_objective_id && isValidUuid(body.linked_objective_id)) {
      await repo.linkObjectiveEvidence(body.linked_objective_id, evidence.id);
    }

    return NextResponse.json({ success: true, data: evidence }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการจัดการหลักฐานการเรียนรู้' }, { status: 500 });
  }
}
