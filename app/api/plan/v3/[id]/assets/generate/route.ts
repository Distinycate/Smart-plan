import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { generateTeachingAssetPreview } from '@/lib/smartPlanV3/ai/teachingAssetService';

interface RouteContext {
  params: { id: string };
}

// POST /api/plan/v3/[id]/assets/generate - สร้างเนื้อหาสื่อการสอนเฉพาะชิ้น (1 Scoped Generation) สำหรับ Preview
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
    if (!body || !body.assetType) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุประเภทสื่อที่ต้องการสร้าง (assetType)' }, { status: 400 });
    }

    const result = await generateTeachingAssetPreview({
      planId,
      assetType: String(body.assetType).trim().toUpperCase(),
      supabase,
      userId: user.id,
      activityId: body.activityId,
      parentAssetId: body.parentAssetId,
      userPromptNotes: body.userPromptNotes,
      customApiKey: body.customApiKey,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'เกิดข้อผิดพลาดในการสร้างสื่อ' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        assetType: result.assetType,
        title: result.title,
        preview: result.preview,
        validationErrors: result.validationErrors,
      },
    });
  } catch (err: any) {
    console.error('Error generating teaching asset preview:', err);
    return NextResponse.json(
      { success: false, error: `เกิดข้อผิดพลาด: ${err.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
