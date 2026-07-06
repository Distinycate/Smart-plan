import type { EvaluationMode, LessonPlan } from '../schema';
import type { ValidationIssue } from './types';
import {
  allObjectives,
  looselyMatches,
  meaningful,
  uniqueStrings,
} from './utils';

export interface AssessmentObjectiveCoverage {
  objective: string;
  methodMatches: string[];
  toolMatches: string[];
  covered: boolean;
}

export interface AssessmentValidationResult {
  valid: boolean;
  hasMethods: boolean;
  hasTools: boolean;
  hasRubric: boolean;
  hasEvidence: boolean;
  objectiveCoverage: AssessmentObjectiveCoverage[];
  uncoveredObjectives: string[];
  issues: ValidationIssue[];
}

export function validateAssessment(
  plan: LessonPlan,
  mode: EvaluationMode
): AssessmentValidationResult {
  const methods = plan.assessment.methods.filter(method => meaningful(method.name));
  const tools = plan.assessment.tools.filter(tool => meaningful(tool.name));
  const rubrics = plan.rubric.filter(rubric => meaningful(rubric.title));
  const objectives = allObjectives(plan);
  const issues: ValidationIssue[] = [];

  const objectiveCoverage = objectives.map(objective => {
    const methodMatches = methods
      .filter(method => method.targetObjectives.some(target =>
        looselyMatches(target, objective)
      ))
      .map(method => method.name);
    const toolMatches = tools
      .filter(tool => tool.targetObjectives.some(target =>
        looselyMatches(target, objective)
      ))
      .map(tool => tool.name);

    return {
      objective,
      methodMatches: uniqueStrings(methodMatches),
      toolMatches: uniqueStrings(toolMatches),
      covered: methodMatches.length > 0 && toolMatches.length > 0,
    };
  });
  const uncoveredObjectives = objectiveCoverage
    .filter(item => !item.covered)
    .map(item => item.objective);

  if (!methods.length) {
    issues.push({
      code: 'ASSESSMENT_METHODS_MISSING',
      section: 'assessment.methods',
      severity: 'critical',
      message: 'ไม่พบวิธีการวัดและประเมินผล',
      suggestion: 'เพิ่มวิธีประเมินที่เชื่อมกับจุดประสงค์ K/P/A',
    });
  }

  if (!tools.length) {
    issues.push({
      code: 'ASSESSMENT_TOOLS_MISSING',
      section: 'assessment.tools',
      severity: 'critical',
      message: 'ไม่พบเครื่องมือประเมิน',
      suggestion: 'เพิ่มเครื่องมือประเมินที่ตรวจสอบผลลัพธ์ของผู้เรียนได้',
    });
  }

  if (
    !rubrics.length
    && (mode === 'wpa_w9' || mode === 'committee_4d')
  ) {
    issues.push({
      code: 'RUBRIC_REQUIRED_FOR_MODE',
      section: 'rubric',
      severity: 'critical',
      message: `โหมด ${mode} ต้องมี rubric`,
      suggestion: 'เพิ่ม rubric ที่มีเกณฑ์และระดับคุณภาพสำหรับภาระงานสำคัญ',
    });
  } else if (!rubrics.length) {
    issues.push({
      code: 'RUBRIC_MISSING',
      section: 'rubric',
      severity: 'medium',
      message: 'ยังไม่มี rubric สำหรับการประเมิน',
      suggestion: 'เพิ่ม rubric เพื่อให้เกณฑ์การตัดสินชัดเจนและตรวจสอบได้',
    });
  }

  if (objectives.length && uncoveredObjectives.length) {
    issues.push({
      code: 'ASSESSMENT_OBJECTIVE_GAPS',
      section: 'assessment',
      severity: 'high',
      message: `มีจุดประสงค์ ${uncoveredObjectives.length} ข้อที่ยังไม่มีทั้งวิธีและเครื่องมือรองรับ`,
      suggestion: 'เชื่อม targetObjectives ของวิธีและเครื่องมือประเมินให้ครอบคลุมทุกจุดประสงค์',
    });
  }

  if (!plan.assessment.evidence.some(meaningful)) {
    issues.push({
      code: 'ASSESSMENT_EVIDENCE_MISSING',
      section: 'assessment.evidence',
      severity: mode === 'lesson_plan_basic' ? 'medium' : 'high',
      message: 'ไม่พบหลักฐานหรือชิ้นงานที่ใช้ยืนยันผลการเรียนรู้',
      suggestion: 'ระบุชิ้นงาน ผลงาน หรือหลักฐานที่เกิดจากการประเมิน',
    });
  }

  const hasCritical = issues.some(issue => issue.severity === 'critical');
  return {
    valid: !hasCritical && uncoveredObjectives.length === 0,
    hasMethods: methods.length > 0,
    hasTools: tools.length > 0,
    hasRubric: rubrics.length > 0,
    hasEvidence: plan.assessment.evidence.some(meaningful),
    objectiveCoverage,
    uncoveredObjectives,
    issues,
  };
}
