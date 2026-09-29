/**
 * GET /api/plan/v3/[id]/pa-readiness
 * Returns PA readiness result. Deterministic + optional AI semantic pass.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph, computeLessonHash } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { evaluatePaReadiness } from '@/lib/smartPlanV3/pa/paReadinessEngine';
import { getActivePaCriteriaVersion } from '@/lib/smartPlanV3/pa/registry';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planId = params.id;
    const repo = new V3Repository(supabase);

    const graph = await repo.getLessonGraph(planId, user.id);
    if (!graph) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const criteriaVersion = getActivePaCriteriaVersion();
    const lessonHash = computeLessonHash(graph);

    // Check for cached PA review
    const cached = await repo.getLatestPlanReview(planId, 'PA_READINESS');
    if (cached && cached.result?.lessonHash === lessonHash) {
      return NextResponse.json({
        ...cached.result,
        fromCache: true,
        criteriaVersionMeta: {
          id: criteriaVersion.id,
          label: criteriaVersion.label,
          authority: criteriaVersion.authority,
          effectiveFrom: criteriaVersion.effectiveFrom,
        },
      });
    }

    // Run fresh PA readiness evaluation
    const alignmentGraph = buildLessonAlignmentGraph(graph);
    const paResult = evaluatePaReadiness(graph, alignmentGraph, lessonHash);

    // Persist
    const status = paResult.summary.notEvidenced > 0 ? 'WARNING' : 'PASSED';
    await repo.createPlanReview({
      lesson_plan_id: planId,
      review_type: 'PA_READINESS',
      status,
      result: {
        ...paResult,
        metadata: {
          criteriaVersion: criteriaVersion.id,
          criteriaVersionLabel: criteriaVersion.label,
          sourceDocument: criteriaVersion.baseDocument.code,
        },
      },
    });

    return NextResponse.json({
      ...paResult,
      fromCache: false,
      criteriaVersionMeta: {
        id: criteriaVersion.id,
        label: criteriaVersion.label,
        authority: criteriaVersion.authority,
        effectiveFrom: criteriaVersion.effectiveFrom,
      },
    });
  } catch (error: any) {
    console.error('[pa-readiness GET]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
