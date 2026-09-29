import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid, validateCreateTeachingAssetInput } from '@/lib/smartPlanV3/schemas';
import {
  deriveTeachingAssetRequirements,
  deriveTeachingPackageReadiness,
} from '@/lib/smartPlanV3/rules/teachingAssetRules';
import { deriveLessonWorkflowStatus } from '@/lib/smartPlanV3/rules/activityRules';
import { isLessonLocked } from '@/lib/smartPlanV3/types';

interface RouteContext {
  params: { id: string };
}

// GET /api/plan/v3/[id]/assets - ดึงรายการ Teaching Assets ทั้งหมดพร้อม requirements และ readiness
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
    const graph = await repo.getLessonGraph(planId, user.id);
    if (!graph) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    const [assets, requirements] = await Promise.all([
      repo.getTeachingAssets(planId),
      deriveTeachingAssetRequirements({
        subjectProfile: { key: graph.lesson.subject_key },
        learningFocus: graph.lesson.learning_focus,
        activities: graph.activities,
        evidence: graph.evidence,
        assessments: graph.assessments,
        assessmentTools: graph.assessmentTools,
      }),
    ]);

    const readiness = deriveTeachingPackageReadiness(graph, requirements);

    return NextResponse.json({
      success: true,
      data: assets,
      requirements,
      readiness,
    });
  } catch (err: any) {
    console.error('Error fetching teaching assets:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสื่อการสอน' },
      { status: 500 }
    );
  }
}

// POST /api/plan/v3/[id]/assets - สร้าง Teaching Asset (หรือเชื่อมโยง)
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
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);

    // Link helper triggers
    if (body?.link_objective === true) {
      const { asset_id, objective_id } = body;
      if (!isValidUuid(asset_id) || !isValidUuid(objective_id)) {
        return NextResponse.json({ success: false, error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkAssetObjective(asset_id, objective_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    if (body?.link_activity === true) {
      const { asset_id, activity_id } = body;
      if (!isValidUuid(asset_id) || !isValidUuid(activity_id)) {
        return NextResponse.json({ success: false, error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkAssetActivity(asset_id, activity_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    if (body?.link_evidence === true) {
      const { asset_id, evidence_id } = body;
      if (!isValidUuid(asset_id) || !isValidUuid(evidence_id)) {
        return NextResponse.json({ success: false, error: 'รหัสไม่ถูกต้อง' }, { status: 400 });
      }
      const link = await repo.linkAssetEvidence(asset_id, evidence_id);
      return NextResponse.json({ success: true, data: link }, { status: 201 });
    }

    // Normal Asset creation
    const validation = validateCreateTeachingAssetInput({ ...body, lesson_plan_id: planId });
    if (!validation.success || !validation.data) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const { objectiveIds, activityIds, evidenceIds, ...assetData } = validation.data;

    const created = await repo.createTeachingAsset(assetData, {
      objectiveIds,
      activityIds,
      evidenceIds,
    });

    // Recheck workflow status transition
    const updatedGraph = await repo.getLessonGraph(planId, user.id);
    let newStatus = lesson.status;
    if (updatedGraph) {
      const readiness = deriveTeachingPackageReadiness(updatedGraph);
      const targetStatus = deriveLessonWorkflowStatus(lesson, {
        activities: updatedGraph.activities,
        objectives: updatedGraph.objectives,
        packageReadiness: readiness,
      });

      if (targetStatus !== lesson.status) {
        await repo.updateLesson(planId, { status: targetStatus }, user.id);
        newStatus = targetStatus;
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: created,
        newStatus,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating teaching asset:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกสื่อการสอน' },
      { status: 500 }
    );
  }
}
