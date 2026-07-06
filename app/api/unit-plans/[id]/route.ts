import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';
import { UnitPlanStatus, validateUnitPlan } from '@/lib/unitPlanValidation';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data, error } = await supabase
      .from('UnitPlans')
      .select('*, UnitLessons(*)')
      .eq('unitPlanId', params.id)
      .single();
    if (error || !data) return unitError('E_UNIT_NOT_FOUND', 'ไม่พบแผนระดับหน่วย', 404);

    return unitSuccess(data, 'โหลดแผนระดับหน่วยเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('GET /api/unit-plans/[id] failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถโหลดแผนระดับหน่วยได้', 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data: existing, error: findError } = await supabase
      .from('UnitPlans')
      .select('*, UnitLessons(unitLessonId, lessonStatus, estimatedHours)')
      .eq('unitPlanId', params.id)
      .single();
    if (findError || !existing) return unitError('E_UNIT_NOT_FOUND', 'ไม่พบแผนระดับหน่วย', 404);

    const body = await req.json();
    const merged = { ...existing, ...body };
    const status = (merged.unitPlanStatus || 'draft') as UnitPlanStatus;
    const activeLessons = (existing.UnitLessons || []).filter(
      (lesson: any) => lesson.lessonStatus !== 'archived'
    );
    const lessonHours = activeLessons.reduce(
      (sum: number, lesson: any) => sum + Number(lesson.estimatedHours || 0),
      0
    );
    const validation = validateUnitPlan(merged, status, activeLessons.length, lessonHours);
    if (!validation.ok) {
      return unitError('E_VALIDATION_FAILED', validation.errors[0], 400, {
        errors: validation.errors,
      });
    }

    const adminDb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error: backupError } = await adminDb.from('VersionHistory').insert({
      versionHistoryId: newEntityId('VER'),
      user_id: user.id,
      entityType: 'UnitPlan',
      entityId: params.id,
      actionType: 'update',
      changeReason: body.changeReason || 'แก้ไขแผนระดับหน่วย',
      snapshotJson: existing,
      createdAt: now,
    });
    if (backupError) {
      console.error('UnitPlan backup failed:', backupError);
      return unitError('E_BACKUP_FAILED', 'ไม่สามารถสำรองข้อมูลก่อนแก้ไข จึงยังไม่บันทึกการเปลี่ยนแปลง', 500);
    }

    const updates = { ...body, updatedAt: now };
    delete updates.unitPlanId;
    delete updates.user_id;
    delete updates.createdAt;
    delete updates.changeReason;
    delete updates.UnitLessons;

    const { data, error } = await supabase
      .from('UnitPlans')
      .update(updates)
      .eq('unitPlanId', params.id)
      .select()
      .single();
    if (error) throw error;

    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: now,
      action: 'UPDATE_UNIT_PLAN',
      status: 'success',
      planId: params.id,
      message: `อัปเดตแผนระดับหน่วย: ${data.unitName}`,
      userEmail: user.email,
    });
    if (logError) console.error('UPDATE_UNIT_PLAN log failed:', logError);

    return unitSuccess(data, 'บันทึกการแก้ไขแผนระดับหน่วยเรียบร้อยแล้ว', validation.warnings);
  } catch (error: any) {
    console.error('PUT /api/unit-plans/[id] failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถบันทึกการแก้ไขได้ ข้อมูลในแบบฟอร์มยังคงอยู่', 500);
  }
}
