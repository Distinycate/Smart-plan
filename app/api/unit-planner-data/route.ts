import { createClient } from '@/utils/supabase/server';
import { unitError, unitSuccess } from '@/lib/unitPlanApi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unitError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบ', 401);

    const [configResult, subjectsResult, unitsResult, indicatorsResult] = await Promise.all([
      supabase.from('AppConfig').select('*').eq('isActive', true),
      supabase.from('Subjects').select('*').eq('isActive', true).order('subjectName'),
      supabase.from('Units').select('*').eq('isActive', true).order('unitNumber'),
      supabase.from('Indicators').select('*').eq('isActive', true).order('indicatorCode'),
    ]);

    const firstError = [
      configResult.error,
      subjectsResult.error,
      unitsResult.error,
      indicatorsResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const config = Object.fromEntries(
      (configResult.data || []).map(item => [item.configKey, item.configValue])
    );

    return unitSuccess({
      config,
      subjects: subjectsResult.data || [],
      units: unitsResult.data || [],
      indicators: indicatorsResult.data || [],
      statuses: ['draft', 'ready'],
    }, 'โหลดข้อมูลสำหรับแผนระดับหน่วยเรียบร้อยแล้ว');
  } catch (error: any) {
    console.error('GET /api/unit-planner-data failed:', error);
    return unitError('E_UNKNOWN', 'ไม่สามารถโหลดข้อมูลแผนระดับหน่วยได้', 500);
  }
}

