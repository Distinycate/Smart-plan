/**
 * POST /api/plan/v3/[id]/quality/review
 * On-demand AI qualitative review (Layer 2). 1 AI call per lesson.
 * Teacher must explicitly trigger this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { reviewLessonQuality } from '@/lib/smartPlanV3/ai/qualityReviewService';
import { V3Repository } from '@/lib/smartPlanV3/repository';
import { buildLessonAlignmentGraph, computeLessonHash } from '@/lib/smartPlanV3/quality/alignmentGraph';
import { runStructuralQualityRules } from '@/lib/smartPlanV3/quality/qualityRules';
import { deriveDocumentReadiness } from '@/lib/smartPlanV3/quality/qualityEngine';

export async function POST(
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

    // Verify lesson exists and user owns it
    const lesson = await repo.getLessonById(planId, user.id);
    if (!lesson) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Run AI review (1 call, with caching) — supabase created internally
    const aiResult = await reviewLessonQuality(planId, user.id);

    // After AI review, check if we can promote to REVIEWED status
    const graph = await repo.getLessonGraph(planId, user.id);
    if (graph) {
      const alignmentGraph = buildLessonAlignmentGraph(graph);
      const ruleResult = runStructuralQualityRules(graph, alignmentGraph);
      const documentReadiness = deriveDocumentReadiness(graph, ruleResult);

      if (documentReadiness.ready && graph.lesson.status === 'PACKAGE_READY') {
        // Promote to REVIEWED
        await repo.updateLesson(planId, { status: 'REVIEWED' }, user.id);

        // Save rule review too
        const ruleStatus = ruleResult.blockingErrorCount > 0
          ? 'FAILED'
          : ruleResult.warningCount > 0 ? 'WARNING' : 'PASSED';

        await repo.createPlanReview({
          lesson_plan_id: planId,
          review_type: 'RULE',
          status: ruleStatus,
          result: {
            ...ruleResult,
            documentReadiness,
            lessonHash: computeLessonHash(graph),
            reviewedAt: new Date().toISOString(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      aiReview: aiResult,
    });
  } catch (error: any) {
    console.error('[quality review POST]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
