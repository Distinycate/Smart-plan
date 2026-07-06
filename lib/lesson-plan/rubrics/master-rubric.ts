import type { EvaluationMode } from '../schema';
import { committee4dRubric } from './committee-4d';
import { lessonPlanBasicRubric } from './lesson-plan-basic';
import { wpaW9Rubric } from './wpa-w9';

export interface RubricAnchor {
  score: number;
  label: string;
  description: string;
}

export interface EvaluationRubricCriterion {
  key: string;
  title: string;
  maxScore: number;
  anchors: readonly RubricAnchor[];
  requiredEvidence: readonly string[];
}

export interface EvaluationRubric {
  mode: EvaluationMode;
  totalScore: number;
  criteria: readonly EvaluationRubricCriterion[];
}

export const MASTER_RUBRICS = {
  lesson_plan_basic: lessonPlanBasicRubric,
  wpa_w9: wpaW9Rubric,
  committee_4d: committee4dRubric,
} as const satisfies Record<EvaluationMode, EvaluationRubric>;

export function getEvaluationRubric(mode: EvaluationMode): EvaluationRubric {
  return MASTER_RUBRICS[mode];
}

export function getRubricCriterion(
  mode: EvaluationMode,
  section: string
): EvaluationRubricCriterion | undefined {
  return getEvaluationRubric(mode).criteria
    .find(criterion => criterion.key === section);
}

export function getRubricMaxScore(rubric: EvaluationRubric): number {
  return rubric.criteria
    .reduce((total, criterion) => total + criterion.maxScore, 0);
}
