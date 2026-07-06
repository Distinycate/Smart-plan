import type { EvaluationMode, LessonPlan } from '../schema';
import { validateAssessment } from './assessment-validator';
import { validateGpas } from './gpas-validator';
import type { ValidationIssue } from './types';
import {
  allObjectives,
  dedupeIssues,
  meaningful,
} from './utils';

export type PreValidationIssue = ValidationIssue;

export interface PreValidationResult {
  ready: boolean;
  status: 'ready' | 'lesson_plan_not_ready';
  issues: PreValidationIssue[];
  missingRequiredSections: string[];
}

export function preValidateLessonPlan(
  plan: LessonPlan,
  mode: EvaluationMode
): PreValidationResult {
  const issues: ValidationIssue[] = [];
  const objectives = allObjectives(plan);

  const hasStandards = plan.curriculum.standards.some(standard =>
    meaningful(standard.code) || meaningful(standard.description)
  );
  const hasIndicators = plan.curriculum.indicators.some(indicator =>
    meaningful(indicator.code) || meaningful(indicator.description)
  );
  const meaningfulActivities = plan.learningActivities.filter(activity =>
    meaningful(activity.step)
    || meaningful(activity.teacherRole)
    || meaningful(activity.studentRole)
  );

  if (!hasStandards) {
    issues.push({
      code: 'STANDARDS_MISSING',
      section: 'curriculum.standards',
      severity: 'critical',
      message: 'ไม่พบมาตรฐานการเรียนรู้',
      suggestion: 'เพิ่มมาตรฐานการเรียนรู้ให้ตรงกับกลุ่มสาระและระดับชั้น',
    });
  }

  if (!hasIndicators) {
    issues.push({
      code: 'INDICATORS_MISSING',
      section: 'curriculum.indicators',
      severity: 'critical',
      message: 'ไม่พบตัวชี้วัด',
      suggestion: 'เพิ่มตัวชี้วัดระหว่างทางหรือปลายทางตามแผนจริง',
    });
  }

  if (!objectives.length) {
    issues.push({
      code: 'OBJECTIVES_MISSING',
      section: 'objectives',
      severity: 'critical',
      message: 'ไม่พบจุดประสงค์การเรียนรู้',
      suggestion: 'เพิ่มจุดประสงค์ด้านความรู้ กระบวนการ และเจตคติ',
    });
  } else if (
    !plan.objectives.knowledge.some(meaningful)
    || !plan.objectives.process.some(meaningful)
    || !plan.objectives.attitude.some(meaningful)
  ) {
    issues.push({
      code: 'OBJECTIVES_KPA_INCOMPLETE',
      section: 'objectives',
      severity: 'high',
      message: 'จุดประสงค์ K/P/A ยังไม่ครบ',
      suggestion: 'เพิ่มจุดประสงค์ด้านความรู้ กระบวนการ และเจตคติให้ครบ',
    });
  }

  if (!meaningfulActivities.length) {
    issues.push({
      code: 'LEARNING_ACTIVITIES_MISSING',
      section: 'learningActivities',
      severity: 'critical',
      message: 'ไม่พบกิจกรรมการเรียนรู้',
      suggestion: 'เพิ่มลำดับกิจกรรม พร้อมบทบาทครูและผู้เรียน',
    });
  } else {
    const missingStudentRole = meaningfulActivities
      .filter(activity => !meaningful(activity.studentRole));
    if (missingStudentRole.length) {
      issues.push({
        code: 'STUDENT_ROLE_MISSING',
        section: 'learningActivities.studentRole',
        severity: 'high',
        message: `มีกิจกรรม ${missingStudentRole.length} ขั้นที่ไม่ระบุบทบาทผู้เรียน`,
        suggestion: 'ระบุว่าผู้เรียนลงมือคิด ทำ สื่อสาร หรือสร้างผลงานอย่างไร',
      });
    }

    const missingEvidence = meaningfulActivities
      .filter(activity => !(activity.expectedEvidence || []).some(meaningful));
    if (missingEvidence.length) {
      issues.push({
        code: 'ACTIVITY_EVIDENCE_MISSING',
        section: 'learningActivities.expectedEvidence',
        severity: 'high',
        message: `มีกิจกรรม ${missingEvidence.length} ขั้นที่ไม่ระบุหลักฐานผลการเรียนรู้`,
        suggestion: 'เพิ่ม expectedEvidence เช่น คำตอบ ชิ้นงาน พฤติกรรม หรือผลการปฏิบัติ',
      });
    }
  }

  const unspecifiedIndicators = plan.curriculum.indicators
    .filter(indicator => indicator.type === 'unspecified');
  if (unspecifiedIndicators.length) {
    issues.push({
      code: 'INDICATOR_TYPE_UNSPECIFIED',
      section: 'curriculum.indicators',
      severity: 'high',
      message: `มีตัวชี้วัด ${unspecifiedIndicators.length} รายการที่ไม่ระบุประเภทระหว่างทาง/ปลายทาง`,
      suggestion: 'กำหนด indicator type เป็น during หรือ terminal ตามหลักสูตร',
    });
  }

  const hasActiveLearningEvidence =
    plan.activeLearning.techniques.some(meaningful)
    || plan.activeLearning.evidence.some(meaningful)
    || plan.learningActivities.some(activity =>
      (activity.activeLearningTechniques || []).some(meaningful)
      && meaningful(activity.studentRole)
    );
  if (!hasActiveLearningEvidence) {
    issues.push({
      code: 'ACTIVE_LEARNING_EVIDENCE_MISSING',
      section: 'activeLearning',
      severity: 'medium',
      message: 'ไม่พบหลักฐาน Active Learning ที่ชัดเจน',
      suggestion: 'ระบุเทคนิค บทบาทผู้เรียน และหลักฐานการลงมือปฏิบัติ',
    });
  }

  if (plan.competencies.some(item =>
    !(item.observableBehaviors || []).some(meaningful)
  )) {
    issues.push({
      code: 'COMPETENCY_BEHAVIOR_MISSING',
      section: 'competencies',
      severity: 'medium',
      message: 'สมรรถนะบางรายการไม่มีพฤติกรรมที่สังเกตได้',
      suggestion: 'ระบุ observable behaviors และหลักฐานการประเมินสมรรถนะ',
    });
  }

  if (plan.desirableCharacteristics.some(item =>
    !(item.assessmentEvidence || []).some(meaningful)
  )) {
    issues.push({
      code: 'CHARACTERISTIC_EVIDENCE_MISSING',
      section: 'desirableCharacteristics',
      severity: 'medium',
      message: 'คุณลักษณะบางรายการไม่มีหลักฐานการประเมิน',
      suggestion: 'เพิ่มพฤติกรรมหรือหลักฐานที่ใช้ประเมินคุณลักษณะ',
    });
  }

  if (!meaningful(plan.metadata.teacherName) || !meaningful(plan.metadata.schoolName)) {
    issues.push({
      code: 'TEACHER_OR_SCHOOL_MISSING',
      section: 'metadata',
      severity: 'low',
      message: 'ข้อมูลครูหรือโรงเรียนยังไม่ครบ',
      suggestion: 'กรอกชื่อผู้สอนและโรงเรียนก่อนจัดทำเอกสารฉบับสมบูรณ์',
    });
  }

  if (plan.media.some(item => !meaningful(item.purpose))) {
    issues.push({
      code: 'MEDIA_PURPOSE_MISSING',
      section: 'media',
      severity: 'low',
      message: 'สื่อบางรายการไม่ระบุวัตถุประสงค์การใช้',
      suggestion: 'ระบุว่าสื่อแต่ละรายการสนับสนุนกิจกรรมหรือจุดประสงค์ใด',
    });
  }

  const hasReflection = Boolean(
    plan.reflection
    && (
      plan.reflection.studentReflection?.some(meaningful)
      || plan.reflection.teacherReflection?.some(meaningful)
      || plan.reflection.improvementPlan?.some(meaningful)
    )
  );
  if (!hasReflection) {
    issues.push({
      code: 'REFLECTION_MISSING',
      section: 'reflection',
      severity: 'low',
      message: 'ยังไม่มีข้อมูล reflection หรือแผนปรับปรุง',
      suggestion: 'เพิ่มแนวทางสะท้อนผลของผู้เรียน/ครูและการพัฒนาครั้งต่อไป',
    });
  }

  issues.push(...validateAssessment(plan, mode).issues);
  issues.push(...validateGpas(plan).issues);

  const normalizedIssues = dedupeIssues(issues);
  const missingRequiredSections = Array.from(new Set(
    normalizedIssues
      .filter(issue => issue.severity === 'critical')
      .map(issue => issue.section)
  ));
  const ready = missingRequiredSections.length === 0;

  return {
    ready,
    status: ready ? 'ready' : 'lesson_plan_not_ready',
    issues: normalizedIssues,
    missingRequiredSections,
  };
}
