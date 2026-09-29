/**
 * GET  /api/plan/v3/[id]/quality
 * Returns deterministic rule check + document readiness (fast, no AI).
 * Also returns cached AI review if available and not stale.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph, computeLessonHash } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { runStructuralQualityRules } from '@/lib/smartPlanV3/quality/qualityRules';
import { deriveDocumentReadiness } from '@/lib/smartPlanV3/quality/qualityEngine';

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

    // Run deterministic checks (fast, no AI)
    const alignmentGraph = buildLessonAlignmentGraph(graph);
    const ruleResult = runStructuralQualityRules(graph, alignmentGraph);
    const documentReadiness = deriveDocumentReadiness(graph, ruleResult);
    const lessonHash = computeLessonHash(graph);

    // Get cached AI review if any
    const cachedAiReview = await repo.getLatestPlanReview(planId, 'AI');
    const aiReviewStale = cachedAiReview
      ? cachedAiReview.result?.lessonHash !== lessonHash
      : true;

    // Get latest PA readiness review if any
    const cachedPaReview = await repo.getLatestPlanReview(planId, 'PA_READINESS');
    const paReviewStale = cachedPaReview
      ? cachedPaReview.result?.lessonHash !== lessonHash
      : true;

    return NextResponse.json({
      planId,
      lessonHash,
      lessonStatus: graph.lesson.status,
      ruleResult,
      documentReadiness,
      alignmentGraph: {
        orphans: alignmentGraph.orphans,
        edgeCount: alignmentGraph.edges.length,
        nodeCount: alignmentGraph.nodes.length,
      },
      cachedAiReview: cachedAiReview
        ? {
            issues: cachedAiReview.result?.issues || [],
            reviewedAt: cachedAiReview.created_at,
            isStale: aiReviewStale,
            status: cachedAiReview.status,
          }
        : null,
      cachedPaReview: cachedPaReview
        ? {
            result: cachedPaReview.result,
            reviewedAt: cachedPaReview.created_at,
            isStale: paReviewStale,
            status: cachedPaReview.status,
          }
        : null,
    });
  } catch (error: any) {
    console.error('[quality GET]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
