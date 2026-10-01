import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { isLessonLocked } from '@/lib/smartPlanV3/types';
import { deriveTeachingPackageReadiness } from '@/lib/smartPlanV3/rules/teachingAssetRules';
import { deriveLessonWorkflowStatus } from '@/lib/smartPlanV3/rules/activityRules';

interface RouteContext {
  params: { id: string; assetId: string };
}

// GET /api/plan/v3/[id]/assets/[assetId]
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, assetId } = params;
    if (!isValidUuid(planId) || !isValidUuid(assetId)) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    const asset = await repo.getTeachingAssetById(assetId);
    if (!asset || asset.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบสื่อการสอนที่ระบุ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (err: any) {
    console.error('Error fetching teaching asset:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสื่อการสอน' },
      { status: 500 }
    );
  }
}

// PATCH /api/plan/v3/[id]/assets/[assetId]
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, assetId } = params;
    if (!isValidUuid(planId) || !isValidUuid(assetId)) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const existingAsset = await repo.getTeachingAssetById(assetId);
    if (!existingAsset || existingAsset.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบสื่อการสอนที่ระบุ หรือสื่อไม่ได้อยู่ในแผนนี้' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'ข้อมูลสำหรับอัปเดตไม่ถูกต้อง' }, { status: 400 });
    }

    const updateFields: any = {};
    if (typeof body.title === 'string' && body.title.trim()) {
      updateFields.title = body.title.trim();
    }
    if (typeof body.asset_type === 'string' && body.asset_type.trim()) {
      updateFields.asset_type = body.asset_type.trim().toUpperCase();
    }
    if (body.audience && ['TEACHER', 'STUDENT', 'BOTH'].includes(body.audience)) {
      updateFields.audience = body.audience;
    }
    if (body.generation_status && ['DRAFT', 'READY', 'FAILED'].includes(body.generation_status)) {
      updateFields.generation_status = body.generation_status;
    }
    if (body.needs_review !== undefined) {
      updateFields.needs_review = Boolean(body.needs_review);
    }
    if (body.content && typeof body.content === 'object') {
      updateFields.content = body.content;
    }

    const linkOptions: any = {};
    if (Array.isArray(body.objectiveIds)) {
      linkOptions.objectiveIds = body.objectiveIds.filter(isValidUuid);
    }
    if (Array.isArray(body.activityIds)) {
      linkOptions.activityIds = body.activityIds.filter(isValidUuid);
    }
    if (Array.isArray(body.evidenceIds)) {
      linkOptions.evidenceIds = body.evidenceIds.filter(isValidUuid);
    }

    const updated = await repo.updateTeachingAsset(assetId, updateFields, linkOptions);

    // Recheck workflow status transition
    const [updatedGraph, activities] = await Promise.all([
      repo.getLessonGraph(planId, user.id),
      repo.getActivities(planId),
    ]);
    let newStatus: string = lesson.status;
    if (updatedGraph) {
      const readiness = deriveTeachingPackageReadiness(updatedGraph);
      const targetStatus = deriveLessonWorkflowStatus(lesson, {
        activities,
        objectives: updatedGraph.objectives,
        packageReadiness: readiness,
      });

      if (targetStatus !== lesson.status) {
        await repo.updateLesson(planId, { status: targetStatus }, user.id);
        newStatus = targetStatus;
      }
    }

    return NextResponse.json({ success: true, data: updated, newStatus });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    console.error('Error updating teaching asset:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการอัปเดตสื่อการสอน' },
      { status: 500 }
    );
  }
}

// DELETE /api/plan/v3/[id]/assets/[assetId]
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId, assetId } = params;
    if (!isValidUuid(planId) || !isValidUuid(assetId)) {
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
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }
    if (isLessonLocked(lesson.status)) {
      return NextResponse.json({ success: false, error: `แผนการสอนอยู่ในสถานะ ${lesson.status} ไม่อนุญาตให้แก้ไข`, code: 'LESSON_IS_LOCKED' }, { status: 403 });
    }

    const existingAsset = await repo.getTeachingAssetById(assetId);
    if (!existingAsset || existingAsset.lesson_plan_id !== planId) {
      return NextResponse.json({ success: false, error: 'ไม่พบสื่อการสอนที่ระบุ หรือสื่อไม่ได้อยู่ในแผนนี้' }, { status: 404 });
    }

    await repo.deleteTeachingAsset(assetId);

    // Recheck workflow status transition (downgrades if required asset was deleted)
    const [updatedGraph, activities] = await Promise.all([
      repo.getLessonGraph(planId, user.id),
      repo.getActivities(planId),
    ]);
    let newStatus: string = lesson.status;
    if (updatedGraph) {
      const readiness = deriveTeachingPackageReadiness(updatedGraph);
      const targetStatus = deriveLessonWorkflowStatus(lesson, {
        activities,
        objectives: updatedGraph.objectives,
        packageReadiness: readiness,
      });

      if (targetStatus !== lesson.status) {
        await repo.updateLesson(planId, { status: targetStatus }, user.id);
        newStatus = targetStatus;
      }
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (err: any) {
    if (err.statusCode === 403 || err.code === 'LESSON_IS_FINAL') {
      return NextResponse.json({ success: false, error: err.message, code: 'LESSON_IS_FINAL' }, { status: 403 });
    }
    console.error('Error deleting teaching asset:', err);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการลบสื่อการสอน' },
      { status: 500 }
    );
  }
}
