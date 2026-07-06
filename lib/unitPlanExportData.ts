import { createClient } from '@/utils/supabase/server';

export async function loadUnitPlanExportData(unitPlanId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized', status: 401 } as const;

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

