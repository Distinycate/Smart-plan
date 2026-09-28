import { requireUnitPlanOwner } from '@/lib/auth/authorization';

export async function loadUnitPlanExportData(unitPlanId: string) {
  let ownership;
  try {
    ownership = await requireUnitPlanOwner(unitPlanId);
  } catch (error: any) {
    return {
      error: error?.httpStatus === 401 ? 'Unauthorized' : 'Unit plan not found or unauthorized',
      status: error?.httpStatus || 404,
    } as const;
  }
  const { supabase, user } = ownership;

  // Re-query nested data only after the explicit parent ownership check.
  const { data: unitPlan, error } = await supabase
    .from('UnitPlans')
    .select('*, UnitLessons(*), UnitAssessments(*)')
    .eq('unitPlanId', unitPlanId)
    .single();
  if (error || !unitPlan) return { error: 'Unit plan not found', status: 404 } as const;

  const indicatorIds = Array.isArray(unitPlan.indicatorIds) ? unitPlan.indicatorIds : [];
  const { data: indicators, error: indicatorError } = indicatorIds.length
    ? await supabase.from('Indicators').select('*').in('indicatorId', indicatorIds).order('indicatorCode')
    : { data: [], error: null };
  if (indicatorError) return { error: 'Cannot load indicators', status: 500 } as const;

  const { data: rubrics, error: rubricError } = await supabase
    .from('Rubrics')
    .select('*')
    .eq('ownerScope', 'unitPlan')
    .eq('ownerId', unitPlanId)
    .eq('isArchived', false);
  if (rubricError) return { error: 'Cannot load rubrics', status: 500 } as const;

  return {
    data: {
      ...unitPlan,
      UnitLessons: (unitPlan.UnitLessons || [])
        .filter((lesson: any) => lesson.lessonStatus !== 'archived')
        .sort((a: any, b: any) => Number(a.lessonOrder) - Number(b.lessonOrder)),
      UnitAssessments: unitPlan.UnitAssessments || [],
      indicators: indicators || [],
      rubrics: rubrics || [],
    },
    user,
  } as const;
}
