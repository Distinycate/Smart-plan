/**
 * Smart Plan V3 — Assessment Rules & Recommendation Engine
 * Deterministic business logic — zero AI calls.
 * Ensures the pedagogical alignment:
 * Objective ↔ Evidence ↔ Assessment ↔ Tool ↔ Criteria ↔ Feedback
 */

import {
  V3Assessment,
  V3AssessmentActivityLink,
  V3AssessmentEvidenceLink,
  V3AssessmentReadiness,
  V3AssessmentRecommendation,
  V3AssessmentRuleSummary,
  V3AssessmentTool,
  V3AssessmentToolType,
  V3AssessmentType,
  V3CriteriaType,
  V3LearningEvidence,
  V3LessonActivity,
  V3LessonGraph,
} from '../types';
import { getSubjectProfile } from '../subjectProfiles/registry';

export interface AssessmentRecommendationInput {
  subjectKey: string;
  learningFocus?: string | null;
  evidenceType?: string | null;
}

/**
 * 1. Deterministic Recommendation Engine
 * Recommends assessment types, tool types, and criteria based on Subject Profile + Learning Focus + Evidence Type.
 */
export function getAssessmentRecommendations(
  input: AssessmentRecommendationInput
): V3AssessmentRecommendation {
  const normSubject = (input.subjectKey || '').toUpperCase().trim();
  const normFocus = (input.learningFocus || '').toUpperCase().trim();
  const normEvidence = (input.evidenceType || '').toUpperCase().trim();

  const profile = getSubjectProfile(normSubject);

  // A. English Speaking
  if (
    normSubject === 'ENGLISH' &&
    (normFocus === 'SPEAKING' || normEvidence.includes('SPEAKING') || normEvidence.includes('PERFORMANCE'))
  ) {
    return {
      preferredAssessmentType: 'PERFORMANCE',
      preferredToolTypes: ['PERFORMANCE_RUBRIC', 'OBSERVATION_FORM'],
      supportedToolTypes: ['CHECKLIST', 'RATING_SCALE'],
      notRecommendedToolTypes: ['ANSWER_KEY', 'QUIZ' as any],
      suggestedMethod: 'ประเมินการปฏิบัติการสื่อสาร (Performance Assessment)',
      defaultCriteriaType: 'RUBRIC_LEVEL',
      defaultCriteriaValue: 3,
      defaultCriteriaText: 'ผ่านตั้งแต่ระดับ 3 ขึ้นไป (หรือ ≥ 70%)',
      rationale: 'ทักษะการพูดต้องประเมินจากการลงมือปฏิบัติจริงและการสื่อสารในสถานการณ์จำลอง ไม่เหมาะกับการตรวจด้วยเฉลยข้อเขียน',
    };
  }

  // B. English Vocabulary Recognition / Grammar Quiz
  if (
    normSubject === 'ENGLISH' &&
    (normFocus === 'LANGUAGE_USE' || normFocus === 'VOCABULARY' || normEvidence.includes('QUIZ') || normEvidence.includes('WORKSHEET') || normEvidence.includes('EXERCISE'))
  ) {
    return {
      preferredAssessmentType: 'QUIZ',
      preferredToolTypes: ['ANSWER_KEY'],
      supportedToolTypes: ['CHECKLIST', 'SCORING_GUIDE'],
      notRecommendedToolTypes: ['PERFORMANCE_RUBRIC'],
      suggestedMethod: 'ตรวจแบบฝึกหัด/แบบทดสอบคำศัพท์และไวยากรณ์',
      defaultCriteriaType: 'SCORE_THRESHOLD',
      defaultCriteriaValue: 8,
      defaultCriteriaText: 'ได้คะแนนไม่น้อยกว่า 8 เต็ม 10 (≥ 80%)',
      rationale: 'การรับรู้ความหมายคำศัพท์และไวยากรณ์มีคำตอบชัดเจน ตรวจสอบความถูกต้องได้ด้วยเฉลยคำตอบ',
    };
  }

  // C. Mathematics Calculation
  if (
    normSubject === 'MATHEMATICS' &&
    (normFocus === 'CALCULATION' || normEvidence.includes('CALCULATION') || (!normFocus && normEvidence.includes('WORKSHEET')))
  ) {
    return {
      preferredAssessmentType: 'WRITTEN_RESPONSE',
      preferredToolTypes: ['ANSWER_KEY', 'SCORING_GUIDE'],
      supportedToolTypes: ['CHECKLIST'],
      notRecommendedToolTypes: ['PERFORMANCE_RUBRIC', 'RUBRIC'],
      suggestedMethod: 'ตรวจแบบฝึกหัดคำนวณและแสดงวิธีทำ',
      defaultCriteriaType: 'PERCENTAGE',
      defaultCriteriaValue: 70,
      defaultCriteriaText: 'ได้คะแนนไม่น้อยกว่า 70%',
      rationale: 'ทักษะการคิดคำนวณทางคณิตศาสตร์มุ่งเน้นความถูกต้องของคำตอบและลำดับขั้นตอนการคำนวณ ใช้เฉลยคำตอบหรือเกณฑ์การให้คะแนนแบบเป็นขั้น',
    };
  }

  // D. Mathematics Problem Solving & Reasoning
  if (
    normSubject === 'MATHEMATICS' &&
    (normFocus === 'PROBLEM_SOLVING' || normFocus === 'REASONING' || normEvidence.includes('SOLUTION') || normEvidence.includes('PROBLEM_SET') || normEvidence.includes('EXPLANATION'))
  ) {
    return {
      preferredAssessmentType: 'WRITTEN_RESPONSE',
      preferredToolTypes: ['SCORING_GUIDE', 'RUBRIC'],
      supportedToolTypes: ['CHECKLIST', 'RATING_SCALE'],
      notRecommendedToolTypes: ['ANSWER_KEY'],
      suggestedMethod: 'ประเมินกระบวนการแก้ปัญหาและการแสดงเหตุผล',
      defaultCriteriaType: 'PERCENTAGE',
      defaultCriteriaValue: 70,
      defaultCriteriaText: 'ผ่านเกณฑ์คะแนนรวมไม่น้อยกว่า 70% โดยต้องมีคะแนนขั้นตอนการแสดงเหตุผล',
      rationale: 'การแก้ปัญหาคณิตศาสตร์ต้องประเมินทั้งความเข้าใจปัญหา กระบวนการคิด การให้เหตุผล และความถูกต้องของคำตอบ',
    };
  }

  // E. Science Experiment Procedure & Inquiry
  if (
    normSubject === 'SCIENCE' &&
    (normFocus === 'EXPERIMENT' || normFocus === 'INQUIRY' || normEvidence.includes('EXPERIMENT') || normEvidence.includes('OBSERVATION'))
  ) {
    return {
      preferredAssessmentType: 'OBSERVATION',
      preferredToolTypes: ['CHECKLIST', 'OBSERVATION_FORM'],
      supportedToolTypes: ['PERFORMANCE_RUBRIC', 'SCORING_GUIDE'],
      notRecommendedToolTypes: ['ANSWER_KEY'],
      suggestedMethod: 'การสังเกตการปฏิบัติการทดลองและการบันทึกผล',
      defaultCriteriaType: 'ITEMS_PASSED',
      defaultCriteriaValue: 4,
      defaultCriteriaText: 'ปฏิบัติถูกต้องครบถ้วนอย่างน้อย 4 จาก 5 รายการ',
      rationale: 'ทักษะกระบวนการวิทยาศาสตร์ในการทดลองสังเกตได้จากพฤติกรรมการใช้อุปกรณ์ การเก็บข้อมูล และความปลอดภัย',
    };
  }

  // F. Science Explanation
  if (
    normSubject === 'SCIENCE' &&
    (normFocus === 'SCIENTIFIC_EXPLANATION' || normEvidence.includes('EXPLANATION'))
  ) {
    return {
      preferredAssessmentType: 'PRODUCT',
      preferredToolTypes: ['SCORING_GUIDE', 'RUBRIC'],
      supportedToolTypes: ['CHECKLIST'],
      notRecommendedToolTypes: ['ANSWER_KEY'],
      suggestedMethod: 'ประเมินการเขียนอธิบายเชิงวิทยาศาสตร์ (CER: Claim-Evidence-Reasoning)',
      defaultCriteriaType: 'RUBRIC_LEVEL',
      defaultCriteriaValue: 3,
      defaultCriteriaText: 'ผ่านเกณฑ์ระดับ 3 ขึ้นไป',
      rationale: 'การสร้างคำอธิบายเชิงวิทยาศาสตร์ต้องเชื่อมโยงหลักฐานและเหตุผลเชิงประจักษ์ จึงเหมาะกับ Scoring Guide หรือ CER Rubric',
    };
  }

  // G. Physical Education Skill
  if (
    normSubject === 'PHYSICAL_EDUCATION' ||
    normFocus.includes('SPORT') ||
    normFocus.includes('MOVEMENT')
  ) {
    return {
      preferredAssessmentType: 'PERFORMANCE',
      preferredToolTypes: ['CHECKLIST', 'PERFORMANCE_RUBRIC'],
      supportedToolTypes: ['RATING_SCALE', 'OBSERVATION_FORM'],
      notRecommendedToolTypes: ['ANSWER_KEY', 'QUIZ' as any],
      suggestedMethod: 'การประเมินทักษะการปฏิบัติและการเคลื่อนไหวทางกายภาพ',
      defaultCriteriaType: 'ITEMS_PASSED',
      defaultCriteriaValue: 4,
      defaultCriteriaText: 'ผ่านทักษะปฏิบัติอย่างน้อย 4 ใน 5 ท่า',
      rationale: 'ทักษะทางพลศึกษาเป็นพฤติกรรมการเคลื่อนไหวที่สังเกตได้โดยตรง จึงต้องใช้ Checklist หรือ Rubric การปฏิบัติ ไม่ใช้ข้อเขียน',
    };
  }

  // H. Art Product
  if (normSubject === 'ART' || normFocus === 'VISUAL_ART' || normEvidence.includes('PRODUCT') || normEvidence.includes('ARTWORK')) {
    return {
      preferredAssessmentType: 'PRODUCT',
      preferredToolTypes: ['PRODUCT_RUBRIC'],
      supportedToolTypes: ['CHECKLIST', 'RATING_SCALE'],
      notRecommendedToolTypes: ['ANSWER_KEY'],
      suggestedMethod: 'ประเมินชิ้นงานทัศนศิลป์/ผลงานสร้างสรรค์',
      defaultCriteriaType: 'RUBRIC_LEVEL',
      defaultCriteriaValue: 3,
      defaultCriteriaText: 'ผลงานผ่านระดับคุณภาพ 3 ขึ้นไป',
      rationale: 'ผลงานศิลปะมีความหลากหลายเชิงความคิดสร้างสรรค์และเทคนิคการสร้าง จึงต้องใช้ Product Rubric ที่มีตัวชี้วัดคุณภาพชัดเจน',
    };
  }

  // General Fallback
  return {
    preferredAssessmentType: 'PERFORMANCE',
    preferredToolTypes: ['RUBRIC', 'CHECKLIST'],
    supportedToolTypes: ['SCORING_GUIDE', 'RATING_SCALE'],
    notRecommendedToolTypes: [],
    suggestedMethod: 'การประเมินตามสภาพจริง',
    defaultCriteriaType: 'PERCENTAGE',
    defaultCriteriaValue: 70,
    defaultCriteriaText: 'ผ่านเกณฑ์ไม่น้อยกว่า 70%',
    rationale: 'ประเมินจากหลักฐานการเรียนรู้ของผู้เรียนตามธรรมชาติของกิจกรรม',
  };
}

/**
 * 2. Validate Assessment Rules
 * Evaluates alignments, warnings, coverage, and missing links across the graph.
 */
export function validateAssessmentRules(graph: {
  evidence: V3LearningEvidence[];
  assessments: V3Assessment[];
  assessmentEvidenceLinks: V3AssessmentEvidenceLink[];
  assessmentTools: V3AssessmentTool[];
  assessmentActivityLinks?: V3AssessmentActivityLink[];
  activities?: V3LessonActivity[];
}): V3AssessmentRuleSummary {
  const {
    evidence = [],
    assessments = [],
    assessmentEvidenceLinks = [],
    assessmentTools = [],
    assessmentActivityLinks = [],
    activities = [],
  } = graph;

  // A. Evidence Coverage
  const assessedEvidenceIds = new Set<string>();
  assessmentEvidenceLinks.forEach((l) => assessedEvidenceIds.add(l.evidence_id));

  const unassessedEvidenceIds = evidence
    .filter((e) => !assessedEvidenceIds.has(e.id))
    .map((e) => e.id);

  const evidenceCoverage = {
    total: evidence.length,
    assessed: evidence.length - unassessedEvidenceIds.length,
    unassessedEvidenceIds,
    allCovered: unassessedEvidenceIds.length === 0 && evidence.length > 0,
    message:
      evidence.length === 0
        ? 'ยังไม่มีหลักฐานการเรียนรู้'
        : unassessedEvidenceIds.length === 0
        ? `${evidence.length} / ${evidence.length} หลักฐานการเรียนรู้ มีการประเมินครบถ้วน ✓`
        : `มี ${unassessedEvidenceIds.length} หลักฐานที่ยังไม่มีการประเมิน ⚠`,
  };

  // B. Tools Completeness
  const toolMap = new Map<string, V3AssessmentTool>();
  assessmentTools.forEach((t) => toolMap.set(t.assessment_id, t));

  const missingToolAssessmentIds = assessments
    .filter((a) => !toolMap.has(a.id))
    .map((a) => a.id);

  const toolsCompleteness = {
    total: assessments.length,
    withTools: assessments.length - missingToolAssessmentIds.length,
    missingToolAssessmentIds,
    allComplete: missingToolAssessmentIds.length === 0 && assessments.length > 0,
    message:
      assessments.length === 0
        ? 'ยังไม่มีรายการประเมิน'
        : missingToolAssessmentIds.length === 0
        ? `${assessments.length} / ${assessments.length} รายการประเมิน มีเครื่องมือกำหนดแล้ว ✓`
        : `มี ${missingToolAssessmentIds.length} การประเมินที่ยังไม่มีเครื่องมือ ⚠`,
  };

  // C. Criteria Completeness
  const missingCriteriaAssessmentIds = assessments
    .filter((a) => {
      if (!a.criteria_type || !a.criteria_type.trim()) return true;
      // If it's SCORE_THRESHOLD, PERCENTAGE, ITEMS_PASSED, RUBRIC_LEVEL, it should have criteria_value or criteria_text
      if (a.criteria_type !== 'CUSTOM' && a.criteria_type !== 'PASS_FAIL') {
        const hasVal = a.criteria_value !== null && a.criteria_value !== undefined;
        const hasText = a.criteria_text && a.criteria_text.trim().length > 0;
        return !hasVal && !hasText;
      }
      return !a.criteria_text || !a.criteria_text.trim();
    })
    .map((a) => a.id);

  const criteriaCompleteness = {
    total: assessments.length,
    withCriteria: assessments.length - missingCriteriaAssessmentIds.length,
    missingCriteriaAssessmentIds,
    allComplete: missingCriteriaAssessmentIds.length === 0 && assessments.length > 0,
    message:
      assessments.length === 0
        ? 'ยังไม่มีรายการประเมิน'
        : missingCriteriaAssessmentIds.length === 0
        ? `${assessments.length} / ${assessments.length} รายการประเมิน กำหนดเกณฑ์ผ่านแล้ว ✓`
        : `มี ${missingCriteriaAssessmentIds.length} การประเมินที่ยังไม่ระบุเกณฑ์ตัดสิน ⚠`,
  };

  // D. Formative Assessment & Feedback Checks
  const hasFormativeAssessment = assessments.some((a) => a.formative === true);
  const hasFeedbackOpportunity =
    activities.some((act) => Boolean(act.feedback_moment && act.feedback_moment.trim())) ||
    assessments.some((a) => a.formative === true);

  // E. Tool Warnings (Invalid / Mismatched combinations)
  const toolWarnings: Array<{
    assessmentId: string;
    toolType: string;
    warning: string;
  }> = [];

  assessments.forEach((asm) => {
    const tool = toolMap.get(asm.id);
    if (!tool) return;

    // Find linked evidences
    const linkedEvdIds = assessmentEvidenceLinks
      .filter((l) => l.assessment_id === asm.id)
      .map((l) => l.evidence_id);
    const linkedEvds = evidence.filter((e) => linkedEvdIds.includes(e.id));

    // Speaking/Performance evidence with Answer Key
    const isSpeakingOrPerformance = linkedEvds.some((e) => {
      const typeStr = ((e.evidence_type || '') + ' ' + (e.description || '')).toUpperCase();
      return typeStr.includes('SPEAK') || typeStr.includes('PERFORM') || typeStr.includes('พูด');
    });

    if (isSpeakingOrPerformance && tool.tool_type === 'ANSWER_KEY') {
      toolWarnings.push({
        assessmentId: asm.id,
        toolType: tool.tool_type,
        warning: 'เครื่องมือเฉลยคำตอบ (Answer Key) อาจไม่เหมาะกับหลักฐานการพูดหรือการปฏิบัติ แนะนำแบบประเมินการปฏิบัติหรือ Rubric',
      });
    }

    // RUBRIC_LEVEL criteria without Rubric tool
    if (
      asm.criteria_type === 'RUBRIC_LEVEL' &&
      !['RUBRIC', 'PERFORMANCE_RUBRIC', 'PRODUCT_RUBRIC'].includes(tool.tool_type)
    ) {
      toolWarnings.push({
        assessmentId: asm.id,
        toolType: tool.tool_type,
        warning: 'การตั้งเกณฑ์ระดับคุณภาพ (Rubric Level) ต้องใช้คู่กับเครื่องมือประเมินประเภท Rubric เท่านั้น',
      });
    }
  });

  const allPassed =
    evidenceCoverage.allCovered &&
    toolsCompleteness.allComplete &&
    criteriaCompleteness.allComplete &&
    assessments.length > 0;

  return {
    evidenceCoverage,
    toolsCompleteness,
    criteriaCompleteness,
    hasFormativeAssessment,
    hasFeedbackOpportunity,
    toolWarnings,
    allPassed,
  };
}

/**
 * 3. Assessment Readiness Helper
 * Single Source of Truth for Assessment readiness.
 * Returns boolean and specific missing items for UI badges.
 */
export function deriveAssessmentReadiness(graph: {
  evidence: V3LearningEvidence[];
  assessments: V3Assessment[];
  assessmentEvidenceLinks: V3AssessmentEvidenceLink[];
  assessmentTools: V3AssessmentTool[];
  assessmentActivityLinks?: V3AssessmentActivityLink[];
  activities?: V3LessonActivity[];
}): V3AssessmentReadiness {
  const summary = validateAssessmentRules(graph);

  const warnings: string[] = [];
  if (!summary.evidenceCoverage.allCovered) {
    warnings.push(summary.evidenceCoverage.message);
  }
  if (!summary.toolsCompleteness.allComplete) {
    warnings.push(summary.toolsCompleteness.message);
  }
  if (!summary.criteriaCompleteness.allComplete) {
    warnings.push(summary.criteriaCompleteness.message);
  }
  if (!summary.hasFormativeAssessment) {
    warnings.push('ยังไม่มีการประเมินระหว่างเรียน (Formative Assessment) ⚠');
  }
  summary.toolWarnings.forEach((tw) => warnings.push(tw.warning));

  const ready =
    summary.evidenceCoverage.allCovered &&
    summary.toolsCompleteness.allComplete &&
    summary.criteriaCompleteness.allComplete &&
    graph.assessments.length > 0;

  return {
    ready,
    totalEvidenceCount: summary.evidenceCoverage.total,
    assessedEvidenceCount: summary.evidenceCoverage.assessed,
    missingAssessmentEvidenceIds: summary.evidenceCoverage.unassessedEvidenceIds,
    missingToolAssessmentIds: summary.toolsCompleteness.missingToolAssessmentIds,
    missingCriteriaAssessmentIds: summary.criteriaCompleteness.missingCriteriaAssessmentIds,
    warnings,
    summary: {
      evidenceCoverage: summary.evidenceCoverage.allCovered,
      toolsComplete: summary.toolsCompleteness.allComplete,
      criteriaComplete: summary.criteriaCompleteness.allComplete,
      hasFormative: summary.hasFormativeAssessment,
      hasFeedback: summary.hasFeedbackOpportunity,
    },
  };
}
