import type {
  EvaluationRubric,
  RubricAnchor,
} from './master-rubric';

const dimensionAnchors = (dimension: string): RubricAnchor[] => [
  { score: 0, label: 'ไม่พบหลักฐาน', description: `ไม่พบหลักฐานสำหรับมิติ ${dimension}` },
  { score: 8, label: 'ต้องปรับปรุง', description: `หลักฐานมิติ ${dimension} ยังไม่ครบและไม่เชื่อมโยง` },
  { score: 15, label: 'พอใช้', description: `หลักฐานมิติ ${dimension} เพียงพอในระดับพื้นฐาน` },
  { score: 20, label: 'ดี', description: `หลักฐานมิติ ${dimension} ชัดเจน เชื่อมโยงเกือบครบ` },
  { score: 25, label: 'ดีเยี่ยม', description: `หลักฐานมิติ ${dimension} ครบถ้วน มีคุณภาพ และตรวจสอบได้` },
];

export const committee4dRubric = {
  mode: 'committee_4d',
  totalScore: 100,
  criteria: [
    {
      key: 'curriculum_validator',
      title: 'Curriculum Validator',
      maxScore: 25,
      requiredEvidence: ['standards', 'indicators', 'contentAccuracy', 'curriculumAlignment'],
      anchors: dimensionAnchors('Curriculum Validator'),
    },
    {
      key: 'instructional_design_reviewer',
      title: 'Instructional Design Reviewer',
      maxScore: 25,
      requiredEvidence: ['objectivesKPA', 'learningSequence', 'activeLearning', 'gpas', 'feasibility'],
      anchors: dimensionAnchors('Instructional Design Reviewer'),
    },
    {
      key: 'assessment_expert',
      title: 'Assessment Expert',
      maxScore: 25,
      requiredEvidence: ['assessmentAlignment', 'methods', 'tools', 'rubric', 'learnerEvidence'],
      anchors: dimensionAnchors('Assessment Expert'),
    },
    {
      key: 'pa_w9_committee_reviewer',
      title: 'PA/W9 Committee Reviewer',
      maxScore: 25,
      requiredEvidence: ['learnerOutcomes', 'empiricalEvidence', 'reflection', 'improvement', 'professionalReadiness'],
      anchors: dimensionAnchors('PA/W9 Committee Reviewer'),
    },
  ],
} as const satisfies EvaluationRubric;
