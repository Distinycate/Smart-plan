import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';
import { validateUnitLesson } from '@/lib/unitLessonValidation';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data, error } = await supabase
      .from('UnitLessons')
      .select('*')
      .eq('unitPlanId', params.id)
      .neq('lessonStatus', 'archived')
      .order('lessonOrder');
    if (error) throw error;

    return unitSuccess(data || [], 'โหลดลำดับแผนรายคาบเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('GET UnitLessons failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถโหลดลำดับแผนรายคาบได้', 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data: parent, error: parentError } = await supabase
      .from('UnitPlans')
      .select('unitPlanId')
      .eq('unitPlanId', params.id)
      .single();
    if (parentError || !parent) return unitError('E_UNIT_NOT_FOUND', 'ไม่พบแผนระดับหน่วย', 404);

    const body = await req.json();
    const validation = validateUnitLesson(body);
    if (!validation.ok) {
      return unitError('E_VALIDATION_FAILED', validation.errors[0], 400, { errors: validation.errors });
    }

    const { data: duplicate } = await supabase
      .from('UnitLessons')
      .select('unitLessonId')
      .eq('unitPlanId', params.id)
      .eq('lessonOrder', Number(body.lessonOrder))
      .neq('lessonStatus', 'archived')
      .maybeSingle();
    if (duplicate) {
      return unitError('E_DUPLICATE_LESSON_ORDER', 'มีแผนรายคาบลำดับนี้แล้ว', 409);
    }

    const now = new Date().toISOString();
    const record = {
      unitLessonId: newEntityId('UNITLESSON'),
      unitPlanId: params.id,
      user_id: user.id,
      lessonOrder: Number(body.lessonOrder),
      lessonTitle: String(body.lessonTitle || body.lessonTopic || '').trim(),
      lessonTopic: String(body.lessonTopic || '').trim(),
      estimatedHours: Number(body.estimatedHours),
      learningFocus: String(body.learningFocus || '').trim(),
      lessonStatus: 'draft',
      teacherEdited: true,
      createdAt: now,
      updatedAt: now,
    };

    const { data, error } = await supabase.from('UnitLessons').insert(record).select().single();
    if (error) throw error;

    const adminDb = getSupabaseAdmin();
    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: now,
      action: 'CREATE_UNIT_LESSON',
      status: 'success',
      planId: params.id,
      message: `เพิ่มแผนรายคาบลำดับ ${record.lessonOrder}: ${record.lessonTitle}`,
      userEmail: user.email,
    });
    if (logError) console.error('CREATE_UNIT_LESSON log failed:', logError);

    return unitSuccess(data, 'เพิ่มแผนรายคาบเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('POST UnitLesson failed:', error);
    const duplicate = error?.code === '23505';
    return unitError(
      duplicate ? 'E_DUPLICATE_LESSON_ORDER' : 'E_UNKNOWN',
      duplicate ? 'มีแผนรายคาบลำดับนี้แล้ว' : 'ไม่สามารถเพิ่มแผนรายคาบได้',
      duplicate ? 409 : 500
    );
  }
}

