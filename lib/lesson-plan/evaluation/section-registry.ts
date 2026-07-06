import type { LessonPlan } from '../schema';
import { getEvaluationSections } from './modes';
import type { SectionDefinition } from './types';

const curriculum = (plan: LessonPlan) => ({
  metadata: {
    subjectGroup: plan.metadata.subjectGroup,
    subjectName: plan.metadata.subjectName,
    subjectCode: plan.metadata.subjectCode,
    gradeLevel: plan.metadata.gradeLevel,
    unitName: plan.metadata.unitName,
    lessonTitle: plan.metadata.lessonTitle,
  },
  curriculum: plan.curriculum,
});

const activityDesign = (plan: LessonPlan) => ({
  objectives: plan.objectives,
  learningActivities: plan.learningActivities,
  activeLearning: plan.activeLearning,
  gpas: plan.gpas,
  media: plan.media,
});

const assessment = (plan: LessonPlan) => ({
  objectives: plan.objectives,
  indicators: plan.curriculum.indicators,
  learningActivities: plan.learningActivities.map(activity => ({
    step: activity.step,
    expectedEvidence: activity.expectedEvidence,
    relatedObjectives: activity.relatedObjectives,
    relatedIndicators: activity.relatedIndicators,
  })),
  assessment: plan.assessment,
  rubric: plan.rubric,
});

const learnerEvidence = (plan: LessonPlan) => ({
  objectives: plan.objectives,
  activityEvidence: plan.learningActivities.map(activity => ({
    step: activity.step,
    expectedEvidence: activity.expectedEvidence,
  })),
  assessmentEvidence: plan.assessment.evidence,
  reflection: plan.reflection,
  homework: plan.homework,
});

const readiness = (plan: LessonPlan) => ({
  metadata: {
    subjectName: plan.metadata.subjectName,
    gradeLevel: plan.metadata.gradeLevel,
    unitName: plan.metadata.unitName,
    lessonTitle: plan.metadata.lessonTitle,
    totalHours: plan.metadata.totalHours,
  },
  standardsCount: plan.curriculum.standards.length,
  indicatorsCount: plan.curriculum.indicators.length,
  objectiveCounts: {
    knowledge: plan.objectives.knowledge.length,
    process: plan.objectives.process.length,
    attitude: plan.objectives.attitude.length,
  },
  learningActivities: plan.learningActivities,
  media: plan.media,
  assessment: plan.assessment,
  rubric: plan.rubric,
});

const ruleSubset = (...keys: string[]) => (findings: unknown) => {
  if (!findings || typeof findings !== 'object') return {};
  const record = findings as Record<string, unknown>;
  return keys.reduce<Record<string, unknown>>((result, key) => {
    if (record[key] !== undefined) result[key] = record[key];
    return result;
  }, {});
};

export const SECTION_REGISTRY = {
  structure: {
    key: 'structure',
    title: 'โครงสร้างแผน',
    critical: true,
    extractPlanData: (plan: LessonPlan) => ({
      metadata: plan.metadata,
      essence: plan.essence,
      objectiveCounts: {
        knowledge: plan.objectives.knowledge.length,
        process: plan.objectives.process.length,
        attitude: plan.objectives.attitude.length,
      },
      activitiesCount: plan.learningActivities.length,
      assessmentMethodsCount: plan.assessment.methods.length,
      assessmentToolsCount: plan.assessment.tools.length,
    }),
    extractRuleBasedFindings: ruleSubset('preValidation'),
  },
  curriculum_alignment: {
    key: 'curriculum_alignment',
    title: 'ความสอดคล้องกับหลักสูตร',
    critical: true,
    extractPlanData: curriculum,
    extractRuleBasedFindings: ruleSubset('alignment', 'preValidation'),
  },
  objectives_kpa: {
    key: 'objectives_kpa',
    title: 'จุดประสงค์ K/P/A',
    critical: true,
    extractPlanData: (plan: LessonPlan) => ({
      indicators: plan.curriculum.indicators,
      objectives: plan.objectives,
      competencies: plan.competencies,
      desirableCharacteristics: plan.desirableCharacteristics,
    }),
    extractRuleBasedFindings: ruleSubset('alignment', 'preValidation'),
  },
  learning_activities: {
    key: 'learning_activities',
    title: 'กิจกรรมการเรียนรู้',
    critical: false,
    extractPlanData: activityDesign,
    extractRuleBasedFindings: ruleSubset('gpas', 'alignment'),
  },
  active_learning: {
    key: 'active_learning',
    title: 'Active Learning',
    critical: false,
    extractPlanData: activityDesign,
    extractRuleBasedFindings: ruleSubset('gpas', 'preValidation'),
  },
  assessment_quality: {
    key: 'assessment_quality',
    title: 'การวัดและประเมินผล',
    critical: true,
    extractPlanData: assessment,
    extractRuleBasedFindings: ruleSubset('assessment', 'alignment'),
  },
  constructive_alignment: {
    key: 'constructive_alignment',
    title: 'Constructive Alignment',
    critical: true,
    extractPlanData: (plan: LessonPlan) => ({
      curriculum: plan.curriculum,
      objectives: plan.objectives,
      learningActivities: plan.learningActivities,
      assessment: plan.assessment,
      rubric: plan.rubric,
    }),
    extractRuleBasedFindings: ruleSubset('alignment'),
  },
  readiness: {
    key: 'readiness',
    title: 'ความพร้อมใช้จริง',
    critical: true,
    extractPlanData: readiness,
    extractRuleBasedFindings: ruleSubset(
      'preValidation',
      'alignment',
      'gpas',
      'assessment'
    ),
  },
  active_learning_design: {
    key: 'active_learning_design',
    title: 'การออกแบบ Active Learning และกระบวนการเรียนรู้',
    critical: false,
    extractPlanData: activityDesign,
    extractRuleBasedFindings: ruleSubset('gpas', 'alignment'),
  },
  learner_outcome_evidence: {
    key: 'learner_outcome_evidence',
    title: 'ผลลัพธ์ผู้เรียนและหลักฐานเชิงประจักษ์',
    critical: true,
    extractPlanData: learnerEvidence,
    extractRuleBasedFindings: ruleSubset('assessment', 'preValidation'),
  },
  authentic_assessment: {
    key: 'authentic_assessment',
    title: 'การวัดและประเมินผลตามสภาพจริง',
    critical: true,
    extractPlanData: assessment,
    extractRuleBasedFindings: ruleSubset('assessment', 'alignment'),
  },
  reflection_improvement: {
    key: 'reflection_improvement',
    title: 'การใช้ข้อมูลสะท้อนผลและพัฒนา',
    critical: false,
    extractPlanData: (plan: LessonPlan) => ({
      reflection: plan.reflection,
      assessmentEvidence: plan.assessment.evidence,
    }),
    extractRuleBasedFindings: ruleSubset('preValidation'),
  },
  innovation_media: {
    key: 'innovation_media',
    title: 'ความเป็นนวัตกรรม / สื่อ / เทคโนโลยี',
    critical: false,
    extractPlanData: (plan: LessonPlan) => ({
      media: plan.media,
      activeLearning: plan.activeLearning,
      learningActivities: plan.learningActivities.map(activity => ({
        step: activity.step,
        activeLearningTechniques: activity.activeLearningTechniques,
        expectedEvidence: activity.expectedEvidence,
      })),
    }),
  },
  wpa_w9_readiness: {
    key: 'wpa_w9_readiness',
    title: 'ความพร้อมสำหรับการประเมินวิทยฐานะ',
    critical: true,
    extractPlanData: readiness,
    extractRuleBasedFindings: ruleSubset(
      'preValidation',
      'alignment',
      'gpas',
      'assessment'
    ),
  },
  curriculum_validator: {
    key: 'curriculum_validator',
    title: 'Curriculum Validator',
    critical: true,
    extractPlanData: curriculum,
    extractRuleBasedFindings: ruleSubset('alignment', 'preValidation'),
  },
  instructional_design_reviewer: {
    key: 'instructional_design_reviewer',
    title: 'Instructional Design Reviewer',
    critical: true,
    extractPlanData: activityDesign,
    extractRuleBasedFindings: ruleSubset('gpas', 'alignment', 'preValidation'),
  },
  assessment_expert: {
    key: 'assessment_expert',
    title: 'Assessment Expert',
    critical: true,
    extractPlanData: assessment,
    extractRuleBasedFindings: ruleSubset('assessment', 'alignment'),
  },
  pa_w9_committee_reviewer: {
    key: 'pa_w9_committee_reviewer',
    title: 'PA/W9 Committee Reviewer',
    critical: true,
    extractPlanData: (plan: LessonPlan) => ({
      curriculum: plan.curriculum,
      objectives: plan.objectives,
      activeLearning: plan.activeLearning,
      learnerEvidence: learnerEvidence(plan),
      assessment: plan.assessment,
      rubric: plan.rubric,
      reflection: plan.reflection,
    }),
    extractRuleBasedFindings: ruleSubset(
      'preValidation',
      'alignment',
      'gpas',
      'assessment'
    ),
  },
} as const satisfies Record<string, SectionDefinition>;

export type RegisteredEvaluationSection = keyof typeof SECTION_REGISTRY;

export function getSectionDefinition(section: string): SectionDefinition {
  const definition = SECTION_REGISTRY[
    section as RegisteredEvaluationSection
  ];
  if (!definition) throw new Error(`Unknown evaluation section: ${section}`);
  return definition;
}

export function getModeSectionDefinitions(
  mode: Parameters<typeof getEvaluationSections>[0]
): SectionDefinition[] {
  return getEvaluationSections(mode).map(getSectionDefinition);
}

export function extractRelevantPlanSection(
  plan: LessonPlan,
  section: string
): unknown {
  return getSectionDefinition(section).extractPlanData(plan);
}

export function extractRelevantRuleFindings(
  findings: unknown,
  section: string
): unknown {
  const definition = getSectionDefinition(section);
  return definition.extractRuleBasedFindings
    ? definition.extractRuleBasedFindings(findings)
    : {};
}
