import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';
import { UnitPlanStatus, validateUnitPlan } from '@/lib/unitPlanValidation';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const { data, error } = await supabase
      .from('UnitPlans')
      .select('unitPlanId, unitPlanStatus, academicYear, semester, gradeLevel, subjectName, unitName, totalUnitHours, createdAt, updatedAt')
      .neq('unitPlanStatus', 'archived')
      .order('updatedAt', { ascending: false });
    if (error) throw error;

    return unitSuccess(data || [], 'โหลดรายการแผนระดับหน่วยเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('GET /api/unit-plans failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถโหลดรายการแผนระดับหน่วยได้', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const body = await req.json();
    const unitPlanStatus = (body.unitPlanStatus || 'draft') as UnitPlanStatus;
    const validation = validateUnitPlan(body, unitPlanStatus, 0);
    if (!validation.ok) {
      return unitError('E_VALIDATION_FAILED', validation.errors[0], 400, {
        errors: validation.errors,
      });
    }

    const now = new Date().toISOString();
    const unitPlanId = newEntityId('UNITPLAN');
    const record = {
      ...body,
      unitPlanId,
      user_id: user.id,
      unitPlanStatus,
      indicatorIds: Array.isArray(body.indicatorIds) ? body.indicatorIds : [],
      createdAt: now,
      updatedAt: now,
    };

    delete record.lessonCount;
    const { data, error } = await supabase.from('UnitPlans').insert(record).select().single();
    if (error) throw error;

    const adminDb = getSupabaseAdmin();
    const { error: logError } = await adminDb.from('System_Logs').insert({
      logId: newEntityId('LOG'),
      timestamp: now,
      action: 'CREATE_UNIT_PLAN',
      status: 'success',
      planId: unitPlanId,
      message: `สร้างแผนระดับหน่วย: ${body.unitName}`,
      userEmail: user.email,
    });
    if (logError) console.error('CREATE_UNIT_PLAN log failed:', logError);

    return unitSuccess(data, 'บันทึกร่างแผนระดับหน่วยเรียบร้อยแล้ว', validation.warnings);
  } catch (error: any) {
    console.error('POST /api/unit-plans failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถบันทึกแผนระดับหน่วยได้ ข้อมูลในแบบฟอร์มยังคงอยู่', 500);
  }
}

