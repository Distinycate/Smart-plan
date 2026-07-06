import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';
import { validateUnitLesson } from '@/lib/unitLessonValidation';

async function getOwnedLesson(supabase: ReturnType<typeof createClient>, unitPlanId: string, lessonId: string) {
  return supabase
    .from('UnitLessons')
    .select('*')
    .eq('unitPlanId', unitPlanId)
    .eq('unitLessonId', lessonId)
    .single();
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data: existing, error: findError } = await getOwnedLesson(supabase, params.id, params.lessonId);
    if (findError || !existing) return unitError('E_LESSON_NOT_FOUND', 'ไม่พบแผนรายคาบ', 404);

    const body = await req.json();
    const merged = { ...existing, ...body };
    const validation = validateUnitLesson(merged);
    if (!validation.ok) {
      return unitError('E_VALIDATION_FAILED', validation.errors[0], 400, { errors: validation.errors });
    }

    if (Number(merged.lessonOrder) !== Number(existing.lessonOrder)) {
      const { data: duplicate } = await supabase
        .from('UnitLessons')
        .select('unitLessonId')
        .eq('unitPlanId', params.id)
        .eq('lessonOrder', Number(merged.lessonOrder))
        .neq('lessonStatus', 'archived')
        .neq('unitLessonId', params.lessonId)
        .maybeSingle();
      if (duplicate) return unitError('E_DUPLICATE_LESSON_ORDER', 'มีแผนรายคาบลำดับนี้แล้ว', 409);
    }

    const adminDb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error: backupError } = await adminDb.from('VersionHistory').insert({
      versionHistoryId: newEntityId('VER'),
      user_id: user.id,
      entityType: 'UnitLesson',
      entityId: params.lessonId,
      actionType: 'update',
      changeReason: body.changeReason || 'แก้ไขแผนรายคาบในหน่วย',
      snapshotJson: existing,
      createdAt: now,
    });
    if (backupError) {
      return unitError('E_BACKUP_FAILED', 'ไม่สามารถสำรองข้อมูลก่อนแก้ไข จึงยังไม่บันทึก', 500);
    }

    const updates = {
      lessonOrder: Number(merged.lessonOrder),
      lessonTitle: String(merged.lessonTitle || merged.lessonTopic || '').trim(),
      lessonTopic: String(merged.lessonTopic || '').trim(),
      estimatedHours: Number(merged.estimatedHours),
      learningFocus: String(merged.learningFocus || '').trim(),
      lessonStatus: merged.lessonStatus || 'draft',
      teacherEdited: true,
      updatedAt: now,
    };
    const { data, error } = await supabase
      .from('UnitLessons')
      .update(updates)
      .eq('unitLessonId', params.lessonId)
      .eq('unitPlanId', params.id)
      .select()
      .single();
    if (error) throw error;

    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: now,
      action: 'UPDATE_UNIT_LESSON',
      status: 'success',
      planId: params.id,
      message: `แก้ไขแผนรายคาบลำดับ ${updates.lessonOrder}: ${updates.lessonTitle}`,
      userEmail: user.email,
    });
    if (logError) console.error('UPDATE_UNIT_LESSON log failed:', logError);

    return unitSuccess(data, 'แก้ไขแผนรายคาบเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('PUT UnitLesson failed:', error);
    const duplicate = error?.code === '23505';
    return unitError(
      duplicate ? 'E_DUPLICATE_LESSON_ORDER' : 'E_UNKNOWN',
      duplicate ? 'มีแผนรายคาบลำดับนี้แล้ว' : 'ไม่สามารถแก้ไขแผนรายคาบได้',
      duplicate ? 409 : 500
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; lessonId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data: existing, error: findError } = await getOwnedLesson(supabase, params.id, params.lessonId);
    if (findError || !existing) return unitError('E_LESSON_NOT_FOUND', 'ไม่พบแผนรายคาบ', 404);

    const adminDb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error: backupError } = await adminDb.from('VersionHistory').insert({
      versionHistoryId: newEntityId('VER'),
      user_id: user.id,
      entityType: 'UnitLesson',
      entityId: params.lessonId,
      actionType: 'archive',
      changeReason: 'นำแผนรายคาบออกจากลำดับของหน่วย',
      snapshotJson: existing,
      createdAt: now,
    });
    if (backupError) {
      return unitError('E_BACKUP_FAILED', 'ไม่สามารถสำรองข้อมูลก่อนนำออก จึงยังไม่เปลี่ยนแปลง', 500);
    }

    const { error } = await supabase
      .from('UnitLessons')
      .update({ lessonStatus: 'archived', updatedAt: now })
      .eq('unitLessonId', params.lessonId)
      .eq('unitPlanId', params.id);
    if (error) throw error;

    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: now,
      action: 'ARCHIVE_UNIT_LESSON',
      status: 'success',
      planId: params.id,
      message: `นำแผนรายคาบออกจากลำดับ: ${existing.lessonTitle}`,
      userEmail: user.email,
    });
    if (logError) console.error('ARCHIVE_UNIT_LESSON log failed:', logError);

    return unitSuccess(null, 'นำแผนรายคาบออกจากลำดับเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('DELETE/Archive UnitLesson failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถนำแผนรายคาบออกได้', 500);
  }
}
