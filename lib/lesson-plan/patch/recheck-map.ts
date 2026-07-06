import type { PatchTarget } from './patch-schema';

/**
 * RECHECK_MAP
 *
 * Defines which evaluation sections must be re-evaluated after a patch
 * modifies a given PatchTarget in the LessonPlan.
 *
 * Rules follow pedagogical causality:
 * - objectives affect KPA scoring, activity design, assessment coherence
 * - activities directly affect active-learning and assessment
 * - assessment changes invalidate rubric/evidence coverage
 * - curriculum/standard changes require re-alignment check
 */
export const RECHECK_MAP: Readonly<Record<PatchTarget, readonly string[]>> = {
  'objectives.knowledge': [
    'objectives_kpa',
    'learning_activities',
    'assessment_quality',
    'constructive_alignment',
  ],
  'objectives.process': [
    'objectives_kpa',
    'learning_activities',
    'assessment_quality',
    'constructive_alignment',
  ],
  'objectives.attitude': [
    'objectives_kpa',
    'learning_activities',
    'assessment_quality',
    'constructive_alignment',
  ],
  'curriculum.standards': [
    'curriculum_alignment',
    'constructive_alignment',
  ],
  'curriculum.indicators': [
    'curriculum_alignment',
    'objectives_kpa',
    'constructive_alignment',
  ],
  'curriculum.coreContent': [
    'curriculum_alignment',
  ],
  'learningActivities': [
    'learning_activities',
    'active_learning',
    'assessment_quality',
    'constructive_alignment',
  ],
  'assessment.methods': [
    'assessment_quality',
    'constructive_alignment',
  ],
  'assessment.tools': [
    'assessment_quality',
  ],
  'assessment.rubrics': [
    'assessment_quality',
  ],
  'essence.mainConcept': [
    'curriculum_alignment',
  ],
  'essence.keyConcepts': [
    'curriculum_alignment',
  ],
} as const;

/**
 * Given a list of PatchTargets that were applied in a bundle,
 * return the unique set of evaluation sections that need rechecking.
 */
export function getSectionsToRecheck(targets: readonly PatchTarget[]): string[] {
  const sections = new Set<string>();
  for (const target of targets) {
    const affected = RECHECK_MAP[target] ?? [];
    for (const section of affected) {
      sections.add(section);
    }
  }
  return Array.from(sections).sort();
}

/**
 * Given a full list of evaluation sections and a set of sections to recheck,
 * return the sections that can be safely copied from the previous job.
 */
export function getSectionsToCarryOver(
  allSections: readonly string[],
  recheckSections: readonly string[],
): string[] {
  const recheckSet = new Set(recheckSections);
  return allSections.filter(section => !recheckSet.has(section));
}
