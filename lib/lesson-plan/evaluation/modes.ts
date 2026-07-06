import type { EvaluationMode } from '../schema';

export const EVALUATION_MODES = {
  lesson_plan_basic: {
    label: 'ตรวจแผนทั่วไป',
    description: 'ตรวจความครบถ้วน ความสอดคล้อง และความพร้อมใช้ในชั้นเรียน',
    sections: [
      'structure',
      'curriculum_alignment',
      'objectives_kpa',
      'learning_activities',
      'active_learning',
      'assessment_quality',
      'constructive_alignment',
      'readiness',
    ],
  },
  wpa_w9: {
    label: 'ตรวจ วPA / ว9',
    description: 'ตรวจผลลัพธ์ผู้เรียน หลักฐานเชิงประจักษ์ และความพร้อมด้านวิทยฐานะ',
    sections: [
      'curriculum_alignment',
      'active_learning_design',
      'learner_outcome_evidence',
      'authentic_assessment',
      'reflection_improvement',
      'innovation_media',
      'wpa_w9_readiness',
    ],
  },
  committee_4d: {
    label: 'กรรมการ 4 มิติ',
    description: 'ตรวจในมิติหลักสูตร การออกแบบ การประเมิน และ วPA/ว9',
    sections: [
      'curriculum_validator',
      'instructional_design_reviewer',
      'assessment_expert',
      'pa_w9_committee_reviewer',
    ],
  },
} as const satisfies Record<
  EvaluationMode,
  {
    label: string;
    description: string;
    sections: readonly string[];
  }
>;

export type EvaluationSection =
  typeof EVALUATION_MODES[EvaluationMode]['sections'][number];

export const EVALUATION_MODE_KEYS =
  Object.keys(EVALUATION_MODES) as EvaluationMode[];

export function isEvaluationMode(value: unknown): value is EvaluationMode {
  return typeof value === 'string' && value in EVALUATION_MODES;
}

export function getEvaluationMode(mode: EvaluationMode) {
  return EVALUATION_MODES[mode];
}

export function getEvaluationSections(mode: EvaluationMode): readonly string[] {
  return EVALUATION_MODES[mode].sections;
}

export function isSectionInMode(
  mode: EvaluationMode,
  section: string
): boolean {
  return EVALUATION_MODES[mode].sections
    .some(candidate => candidate === section);
}
