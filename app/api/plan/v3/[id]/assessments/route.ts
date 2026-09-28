import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateCreateAssessmentInput, isValidUuid } from '@/lib/smartPlanV3/schemas';

interface RouteContext {
  params: { id: string };
}

// POST /api/plan/v3/[id]/assessments - สร้างการวัดผล หรือเชื่อมโยงการวัดผลกับหลักฐาน
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

    // กรณีเชื่อมโยง Assessment ↔ Evidence
    if (body?.link_evidence === true) {
      const { assessment_id, evidence_id } = body;
      if (!isValidUuid(assessment_id) || !isValidUuid(evidence_id)) {
        return NextResponse.json({ success: false, error: 'รหัส assessment_id หรือ evidence_id ไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkAssessmentEvidence(assessment_id, evidence_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // กรณีสร้าง Assessment ใหม่
    const validation = validateCreateAssessmentInput({ ...body, lesson_plan_id: planId });
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const assessment = await repo.createAssessment(validation.data);

    // หากระบุ linked_evidence_id มาด้วย ให้เชื่อมโยงทันที
    if (body.linked_evidence_id && isValidUuid(body.linked_evidence_id)) {
      await repo.linkAssessmentEvidence(assessment.id, body.linked_evidence_id);
    }

    return NextResponse.json({ success: true, data: assessment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการจัดการการวัดและประเมินผล' }, { status: 500 });
  }
}
