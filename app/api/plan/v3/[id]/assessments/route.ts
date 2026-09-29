import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { validateCreateAssessmentInput, isValidUuid } from '@/lib/smartPlanV3/schemas';
import { deriveAssessmentReadiness, validateAssessmentRules } from '@/lib/smartPlanV3/rules/assessmentRules';

interface RouteContext {
  params: { id: string };
}

// GET /api/plan/v3/[id]/assessments - ดึงรายการ Assessment ทั้งหมดพร้อม links, tools และ readiness
export async function GET(req: NextRequest, { params }: RouteContext) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const [assessments, graph] = await Promise.all([
      repo.getAssessments(planId),
      repo.getLessonGraph(planId, user.id),
    ]);

    const readiness = graph ? deriveAssessmentReadiness(graph) : null;
    const ruleSummary = graph ? validateAssessmentRules(graph) : null;

    return NextResponse.json({
      success: true,
      data: assessments,
      readiness,
      ruleSummary,
    });
  } catch (err: any) {
    console.error('Error fetching assessments:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการวัดและประเมินผล' },
      { status: 500 }
    );
  }
}

// POST /api/plan/v3/[id]/assessments - สร้างการวัดผล พร้อม linked evidence, activity และ tool
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

    // กรณีเชื่อมโยง Assessment ↔ Evidence แบบเฉพาะกิจ
    if (body?.link_evidence === true) {
      const { assessment_id, evidence_id } = body;
      if (!isValidUuid(assessment_id) || !isValidUuid(evidence_id)) {
        return NextResponse.json({ success: false, error: 'รหัส assessment_id หรือ evidence_id ไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkAssessmentEvidence(assessment_id, evidence_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // กรณีเชื่อมโยง Assessment ↔ Activity แบบเฉพาะกิจ
    if (body?.link_activity === true) {
      const { assessment_id, activity_id } = body;
      if (!isValidUuid(assessment_id) || !isValidUuid(activity_id)) {
        return NextResponse.json({ success: false, error: 'รหัส assessment_id หรือ activity_id ไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkAssessmentActivity(assessment_id, activity_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // กรณีสร้าง Assessment ใหม่
    const validation = validateCreateAssessmentInput({ ...body, lesson_plan_id: planId });
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const evidenceIds: string[] = [];
    if (Array.isArray(body.evidenceIds)) {
      body.evidenceIds.forEach((id: string) => {
        if (isValidUuid(id)) evidenceIds.push(id);
      });
    } else if (body.linked_evidence_id && isValidUuid(body.linked_evidence_id)) {
      evidenceIds.push(body.linked_evidence_id);
    }

    const activityIds: string[] = [];
    if (Array.isArray(body.activityIds)) {
      body.activityIds.forEach((id: string) => {
        if (isValidUuid(id)) activityIds.push(id);
      });
    } else if (body.activity_id && isValidUuid(body.activity_id)) {
      activityIds.push(body.activity_id);
    }

    const tool = body.tool && typeof body.tool === 'object' && body.tool.tool_type && body.tool.title
      ? {
          tool_type: String(body.tool.tool_type).trim(),
          title: String(body.tool.title).trim(),
          content: body.tool.content || {},
          source: body.tool.source || 'MANUAL',
        }
      : undefined;

    const assessment = await repo.createAssessment(validation.data, {
      evidenceIds,
      activityIds,
      tool,
    });

    return NextResponse.json({ success: true, data: assessment }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating assessment:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการจัดการการวัดและประเมินผล' },
      { status: 500 }
    );
  }
}
