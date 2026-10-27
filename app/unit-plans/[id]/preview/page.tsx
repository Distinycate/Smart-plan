import UnitPlanPreviewClient from './UnitPlanPreviewClient';
import { loadUnitPlanExportData } from '@/lib/unitPlanExportData';

export default async function UnitPlanPreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const result = await loadUnitPlanExportData(params.id);
  if ('error' in result) {
    return <div className="p-10 text-center font-bold text-red-600">{result.error}</div>;
  }
  return <UnitPlanPreviewClient unitPlan={result.data} />;
}

