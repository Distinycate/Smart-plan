import { NextRequest, NextResponse } from 'next/server';
import { getLessonPlanById } from '@/lib/lesson-plan/lesson-plan-repository';
import { normalizeLegacyLessonPlan } from '@/lib/lesson-plan/normalizer';
import { createLessonPlanHash } from '@/lib/lesson-plan/hash';
import { preValidateLessonPlan } from '@/lib/lesson-plan';
import { fail, ok } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { lessonPlanId } = await request.json();
    if (!lessonPlanId) {
      return fail('UNKNOWN_ERROR', 'Missing lessonPlanId', { status: 400 });
    }

    const { data: rawPlan, error } = await getLessonPlanById(lessonPlanId);
    if (error || !rawPlan) {
      return fail('LESSON_PLAN_NOT_FOUND', 'Lesson plan not found');
    }

    let normalizedPlan;
    try {
      normalizedPlan = normalizeLegacyLessonPlan(rawPlan);
    } catch (normErr: any) {
      return fail('LESSON_PLAN_NORMALIZE_FAILED', 'Normalizer crashed', { debugMessage: normErr.stack });
    }

    let hash;
    let hashValid = false;
    try {
      hash = createLessonPlanHash(normalizedPlan);
      hashValid = /^[0-9a-f]{64}$/.test(hash);
    } catch (hashErr: any) {
      return fail('UNKNOWN_ERROR', 'Hashing failed', { debugMessage: hashErr.stack });
    }

    const preValidation = preValidateLessonPlan(normalizedPlan, 'lesson_plan_basic');

    return ok({
      planId: lessonPlanId,
      rawFound: true,
      rawUserId: rawPlan.user_id,
      normalizedSummary: {
        standardsCount: normalizedPlan.curriculum.standards.length,
        indicatorsCount: normalizedPlan.curriculum.indicators.length,
        objectivesKCount: normalizedPlan.objectives.knowledge.length,
        objectivesPCount: normalizedPlan.objectives.process.length,
        objectivesACount: normalizedPlan.objectives.attitude.length,
        activitiesCount: normalizedPlan.learningActivities.length,
        assessmentMethodsCount: normalizedPlan.assessment.methods.length,
        assessmentToolsCount: normalizedPlan.assessment.tools.length,
        rubricCount: normalizedPlan.rubric.length
      },
      hash,
      hashValid,
      preValidation: {
        ready: preValidation.ready,
        issues: preValidation.issues
      }
    });

  } catch (err: any) {
    return fail('UNKNOWN_ERROR', err.message);
  }
}
