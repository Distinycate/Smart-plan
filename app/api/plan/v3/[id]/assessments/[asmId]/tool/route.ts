import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { validateToolContent } from '@/lib/smartPlanV3/assessmentTools/schemas';

interface RouteContext {
  params: { id: string; asmId: string };
}

// POST /api/plan/v3/[id]/assessments/[asmId]/tool - สร้างเครื่องมือประเมิน
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, asmId } = params;
    if (!isValidUuid(planId) || !isValidUuid(asmId)) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }

    const assessment = await repo.getAssessmentById(asmId);
    if (!assessment || assessment.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการประเมินที่ระบุ' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.tool_type || !body.title) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุประเภทและชื่อเครื่องมือประเมิน' }, { status: 400 });
    }

    const toolType = String(body.tool_type).trim();
    const title = String(body.title).trim();
    const content = body.content || {};
    const source = body.source === 'AI' ? 'AI' : 'MANUAL';

    // Validate content against schema
    const validation = validateToolContent(toolType, content);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Check if tool already exists for this assessment
    if (assessment.tool) {
      // Update existing tool instead
      const updated = await repo.updateAssessmentTool(assessment.tool.id, {
        tool_type: toolType,
        title,
        content: validation.data || content,
        source,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    const created = await repo.createAssessmentTool({
      assessment_id: asmId,
      tool_type: toolType,
      title,
      content: validation.data || content,
      source,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating tool:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการบันทึกเครื่องมือประเมิน' }, { status: 500 });
  }
}

// PATCH /api/plan/v3/[id]/assessments/[asmId]/tool - อัปเดตเครื่องมือประเมิน
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, asmId } = params;
    if (!isValidUuid(planId) || !isValidUuid(asmId)) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }

    const assessment = await repo.getAssessmentById(asmId);
    if (!assessment || assessment.lesson_plan_id !== planId || !assessment.tool) {
      return NextResponse.json({ success: false, error: 'ไม่พบเครื่องมือประเมินสำหรับรายการนี้' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'ข้อมูลสำหรับอัปเดตไม่ถูกต้อง' }, { status: 400 });
    }

    const toolType = body.tool_type ? String(body.tool_type).trim() : assessment.tool.tool_type;
    const title = body.title ? String(body.title).trim() : assessment.tool.title;
    const content = body.content !== undefined ? body.content : assessment.tool.content;

    // Validate content against schema if provided
    if (body.content !== undefined) {
      const validation = validateToolContent(toolType, content);
      if (!validation.success) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }
    }

    const updated = await repo.updateAssessmentTool(assessment.tool.id, {
      tool_type: toolType,
      title,
      content,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error updating tool:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตเครื่องมือประเมิน' }, { status: 500 });
  }
}

// DELETE /api/plan/v3/[id]/assessments/[asmId]/tool - ลบเครื่องมือประเมิน
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, asmId } = params;
    if (!isValidUuid(planId) || !isValidUuid(asmId)) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์แก้ไข' }, { status: 404 });
    }

    const assessment = await repo.getAssessmentById(asmId);
    if (!assessment || assessment.lesson_plan_id !== planId || !assessment.tool) {
      return NextResponse.json({ success: false, error: 'ไม่พบเครื่องมือประเมินสำหรับรายการนี้' }, { status: 404 });
    }

    await repo.deleteAssessmentTool(assessment.tool.id);

    return NextResponse.json({ success: true, message: 'ลบเครื่องมือประเมินเรียบร้อยแล้ว' });
  } catch (err: any) {
    console.error('Error deleting tool:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดในการลบเครื่องมือประเมิน' }, { status: 500 });
  }
}
