import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { generateAssessmentTool } from '@/lib/smartPlanV3/ai/assessmentToolService';

interface RouteContext {
  params: { id: string; asmId: string };
}

// POST /api/plan/v3/[id]/assessments/[asmId]/tool/generate - AI สร้างเครื่องมือประเมิน (Preview First)
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

    const body = await req.json().catch(() => ({}));
    const toolType = body.toolType || body.tool_type;
    if (!toolType || typeof toolType !== 'string') {
      return NextResponse.json({ success: false, error: 'กรุณาระบุประเภทเครื่องมือที่ต้องการสร้าง (toolType)' }, { status: 400 });
    }

    const levelsCount = body.levelsCount ? Number(body.levelsCount) : 4;

    const result = await generateAssessmentTool({
      planId,
      assessmentId: asmId,
      toolType: toolType.trim(),
      levelsCount,
      supabase,
      userId: user.id,
      customApiKey: body.apiKey,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      preview: result.preview,
      meta: result.meta,
    });
  } catch (err: any) {
    console.error('Error generating assessment tool:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างเครื่องมือประเมินด้วย AI' },
      { status: 500 }
    );
  }
}
