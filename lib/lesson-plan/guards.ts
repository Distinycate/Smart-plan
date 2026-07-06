import type { LessonPlan } from './schema';
import { normalizeLegacyLessonPlan } from './normalizer';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function isCanonicalLessonPlan(value: unknown): value is LessonPlan {
  if (!isRecord(value)) return false;

  return isRecord(value.metadata)
    && isRecord(value.curriculum)
    && Array.isArray(value.curriculum.standards)
    && Array.isArray(value.curriculum.indicators)
    && isRecord(value.essence)
    && isRecord(value.objectives)
    && Array.isArray(value.objectives.knowledge)
    && Array.isArray(value.objectives.process)
    && Array.isArray(value.objectives.attitude)
    && Array.isArray(value.competencies)
    && Array.isArray(value.desirableCharacteristics)
    && Array.isArray(value.learningActivities)
    && isRecord(value.activeLearning)
    && isRecord(value.gpas)
    && Array.isArray(value.media)
    && isRecord(value.assessment)
    && Array.isArray(value.assessment.methods)
    && Array.isArray(value.assessment.tools)
    && Array.isArray(value.assessment.evidence)
    && Array.isArray(value.rubric);
}

export function toCanonicalLessonPlan(value: unknown): LessonPlan {
  return isCanonicalLessonPlan(value)
    ? value
    : normalizeLegacyLessonPlan(value);
}
