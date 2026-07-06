import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const body = await req.json();
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map(String) : [];
    if (orderedIds.length < 1 || new Set(orderedIds).size !== orderedIds.length) {
      return unitError('E_VALIDATION_FAILED', 'ลำดับแผนรายคาบไม่ถูกต้อง', 400);
    }

    const { data: lessons, error: findError } = await supabase
      .from('UnitLessons')
      .select('*')
      .eq('unitPlanId', params.id)
      .neq('lessonStatus', 'archived')
      .order('lessonOrder');
    if (findError) throw findError;
    if (!lessons || lessons.length !== orderedIds.length) {
      return unitError('E_VALIDATION_FAILED', 'รายการแผนรายคาบไม่ตรงกับข้อมูลล่าสุด กรุณาโหลดใหม่', 409);
    }

    const adminDb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error: backupError } = await adminDb.from('VersionHistory').insert({
      versionHistoryId: newEntityId('VER'),
      user_id: user.id,
      entityType: 'UnitLessonSequence',
      entityId: params.id,
      actionType: 'reorder',
      changeReason: 'จัดลำดับแผนรายคาบ',
      snapshotJson: lessons,
      createdAt: now,
    });
    if (backupError) {
      return unitError('E_BACKUP_FAILED', 'ไม่สามารถสำรองลำดับเดิม จึงยังไม่จัดลำดับใหม่', 500);
    }

    const { error: reorderError } = await adminDb.rpc('reorder_unit_lessons', {
      p_unit_plan_id: params.id,
      p_user_id: user.id,
      p_ordered_ids: orderedIds,
    });
    if (reorderError) throw reorderError;

    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: now,
      action: 'REORDER_UNIT_LESSONS',
      status: 'success',
      planId: params.id,
      message: `จัดลำดับแผนรายคาบใหม่ ${orderedIds.length} รายการ`,
      userEmail: user.email,
    });
    if (logError) console.error('REORDER_UNIT_LESSONS log failed:', logError);

    return unitSuccess(null, 'จัดลำดับแผนรายคาบเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('POST reorder UnitLessons failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถจัดลำดับแผนรายคาบได้', 500);
  }
}

