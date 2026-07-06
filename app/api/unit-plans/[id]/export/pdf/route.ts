import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { loadUnitPlanExportData } from '@/lib/unitPlanExportData';
import { newEntityId, unitError, unitSuccess } from '@/lib/unitPlanApi';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await loadUnitPlanExportData(params.id);
  if ('error' in result) return unitError('E_UNIT_NOT_FOUND', 'ไม่พบแผนระดับหน่วย', result.status || 500);

  const url = new URL(`/unit-plans/${params.id}/preview`, req.url).toString();
  const adminDb = getSupabaseAdmin();
  const { error: logError } = await adminDb.from('System_Logs').insert({
    logId: newEntityId('LOG'),
    timestamp: new Date().toISOString(),
    action: 'EXPORT_UNIT_PLAN_PDF',
    status: 'success',
    planId: params.id,
    message: `เปิดหน้าพิมพ์ PDF แผนระดับหน่วย: ${result.data.unitName}`,
    userEmail: result.user.email,
  });
  if (logError) console.error('EXPORT_UNIT_PLAN_PDF log failed:', logError);

  return unitSuccess({ url }, 'เตรียมหน้าพิมพ์ PDF เรียบร้อยแล้ว');
}
