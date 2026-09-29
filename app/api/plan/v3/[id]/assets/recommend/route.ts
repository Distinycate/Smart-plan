import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { deriveTeachingAssetRequirements } from '@/lib/smartPlanV3/rules/teachingAssetRules';

interface RouteContext {
  params: { id: string };
}

// POST /api/plan/v3/[id]/assets/recommend - คำนวณคำแนะนำสื่อที่จำเป็น/แนะนำ/เพิ่มเติมตามธรรมชาติวิชา
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
    const graph = await repo.getLessonGraph(planId, user.id);
    if (!graph) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const requirements = deriveTeachingAssetRequirements({
      subjectProfile: { key: graph.lesson.subject_key },
      learningFocus: graph.lesson.learning_focus,
      activities: graph.activities,
      evidence: graph.evidence,
      assessments: graph.assessments,
      assessmentTools: graph.assessmentTools,
    });

    return NextResponse.json({
      success: true,
      data: requirements,
    });
  } catch (err: any) {
    console.error('Error generating asset recommendations:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการวิเคราะห์สื่อการสอน' },
      { status: 500 }
    );
  }
}
