import type { LessonPlan } from '../schema';
import type { ValidationIssue } from './types';
import { meaningful } from './utils';

export const GPAS_STAGE_KEYS = [
  'gathering',
  'processing',
  'applying',
  'selfRegulating',
  'communication',
] as const;

export type GpasStage = typeof GPAS_STAGE_KEYS[number];

const stageLabels: Record<GpasStage, string> = {
  gathering: 'Gathering',
  processing: 'Processing',
  applying: 'Applying',
  selfRegulating: 'Self-Regulating',
  communication: 'Communication',
};

const stageType: Record<GpasStage, string> = {
  gathering: 'gathering',
  processing: 'processing',
  applying: 'applying',
  selfRegulating: 'self_regulating',
  communication: 'communication',
};

export interface GpasValidationResult {
  complete: boolean;
  score: number;
  maxScore: 5;
  presentStages: GpasStage[];
  missingStages: GpasStage[];
  evidence: Partial<Record<GpasStage, string[]>>;
  issues: ValidationIssue[];
}

export function validateGpas(plan: LessonPlan): GpasValidationResult {
  const evidence: Partial<Record<GpasStage, string[]>> = {};

  for (const stage of GPAS_STAGE_KEYS) {
    const values: string[] = [];
    const direct = plan.gpas[stage];
    if (meaningful(direct)) values.push(String(direct).trim());

    for (const activity of plan.learningActivities) {
      if (activity.stepType === stageType[stage]) {
        values.push(activity.step);
      }
    }

    if (values.length) evidence[stage] = Array.from(new Set(values));
  }

  const presentStages = GPAS_STAGE_KEYS.filter(stage => evidence[stage]?.length);
  const missingStages = GPAS_STAGE_KEYS.filter(stage => !evidence[stage]?.length);
  const issues: ValidationIssue[] = missingStages.length
    ? [{
        code: 'GPAS_INCOMPLETE',
        section: 'gpas',
        severity: 'medium',
        message: `GPAS ยังไม่ครบ: ${missingStages.map(stage => stageLabels[stage]).join(', ')}`,
        suggestion: 'ระบุหลักฐานกิจกรรมในแต่ละขั้น GPAS ให้ครบและสอดคล้องกับบทเรียน',
      }]
    : [];

  return {
    complete: missingStages.length === 0,
    score: presentStages.length,
    maxScore: 5,
    presentStages,
    missingStages,
    evidence,
    issues,
  };
}
