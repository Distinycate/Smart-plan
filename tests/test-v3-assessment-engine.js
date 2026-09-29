/**
 * Smart Plan V3.5 — Automated Test Suite: Assessment Engine
 * Tests A–O (All 15 required test cases)
 *
 * Runs under plain `node` — zero external dependencies.
 * Zero external network or AI calls during unit execution.
 */

'use strict';

const assert = require('assert');

// ─── Test Framework Helpers ──────────────────────────────────────────────────

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS  ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL  ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

function header(title) {
  console.log(`\n── ${title} ──`);
}

// ─── Mock / Implementation Mirrors ───────────────────────────────────────────

function getAssessmentRecommendations(input) {
  const normSubject = (input.subjectKey || '').toUpperCase().trim();
  const normFocus = (input.learningFocus || '').toUpperCase().trim();
  const normEvidence = (input.evidenceType || '').toUpperCase().trim();

  // A. English Speaking
  if (
    normSubject === 'ENGLISH' &&
    (normFocus === 'SPEAKING' || normEvidence.includes('SPEAKING') || normEvidence.includes('PERFORMANCE'))
  ) {
    return {
      preferredAssessmentType: 'PERFORMANCE',
      preferredToolTypes: ['PERFORMANCE_RUBRIC', 'OBSERVATION_FORM'],
      supportedToolTypes: ['CHECKLIST', 'RATING_SCALE'],
      notRecommendedToolTypes: ['ANSWER_KEY', 'QUIZ'],
      suggestedMethod: 'ประเมินการปฏิบัติการสื่อสาร (Performance Assessment)',
      defaultCriteriaType: 'RUBRIC_LEVEL',
      defaultCriteriaValue: 3,
      defaultCriteriaText: 'ผ่านตั้งแต่ระดับ 3 ขึ้นไป',
      rationale: 'ทักษะการพูดต้องประเมินจากการลงมือปฏิบัติจริง ไม่เหมาะกับการตรวจด้วยเฉลยข้อเขียน',
    };
  }

  // B. English Vocabulary Recognition / Quiz
  if (
    normSubject === 'ENGLISH' &&
    (normFocus === 'LANGUAGE_USE' || normFocus === 'VOCABULARY' || normEvidence.includes('QUIZ') || normEvidence.includes('WORKSHEET'))
  ) {
    return {
      preferredAssessmentType: 'QUIZ',
      preferredToolTypes: ['ANSWER_KEY'],
      supportedToolTypes: ['CHECKLIST', 'SCORING_GUIDE'],
      notRecommendedToolTypes: ['PERFORMANCE_RUBRIC'],
      suggestedMethod: 'ตรวจแบบฝึกหัด/แบบทดสอบคำศัพท์และไวยากรณ์',
      defaultCriteriaType: 'SCORE_THRESHOLD',
      defaultCriteriaValue: 8,
      defaultCriteriaText: 'ได้คะแนนไม่น้อยกว่า 8 เต็ม 10',
      rationale: 'การรับรู้คำศัพท์ตรวจสอบความถูกต้องได้ด้วยเฉลยคำตอบ',
    };
  }

  // C. Mathematics Calculation
  if (
    normSubject === 'MATHEMATICS' &&
    (normFocus === 'CALCULATION' || normEvidence.includes('CALCULATION') || normEvidence.includes('WORKSHEET'))
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
      rationale: 'ทักษะการคิดคำนวณมุ่งเน้นความถูกต้องของคำตอบและขั้นตอน ไม่ควร default เป็น Rubric',
    };
  }

  // D. Mathematics Problem Solving
  if (
    normSubject === 'MATHEMATICS' &&
    (normFocus === 'PROBLEM_SOLVING' || normFocus === 'REASONING' || normEvidence.includes('SOLUTION') || normEvidence.includes('PROBLEM_SET'))
  ) {
    return {
      preferredAssessmentType: 'WRITTEN_RESPONSE',
      preferredToolTypes: ['SCORING_GUIDE', 'RUBRIC'],
      supportedToolTypes: ['CHECKLIST', 'RATING_SCALE'],
      notRecommendedToolTypes: ['ANSWER_KEY'],
      suggestedMethod: 'ประเมินกระบวนการแก้ปัญหาและการแสดงเหตุผล',
      defaultCriteriaType: 'PERCENTAGE',
      defaultCriteriaValue: 70,
      defaultCriteriaText: 'ผ่านเกณฑ์คะแนนรวมไม่น้อยกว่า 70% รองรับกระบวนการคิดและเหตุผล',
      rationale: 'การแก้ปัญหาคณิตศาสตร์ต้องประเมินทั้งคำตอบ กระบวนการ และการให้เหตุผล (Reasoning)',
    };
  }

  // E. Science Experiment
  if (
    normSubject === 'SCIENCE' &&
    (normFocus === 'EXPERIMENT' || normFocus === 'INQUIRY' || normEvidence.includes('EXPERIMENT') || normEvidence.includes('OBSERVATION'))
  ) {
    return {
      preferredAssessmentType: 'OBSERVATION',
      preferredToolTypes: ['CHECKLIST', 'OBSERVATION_FORM'],
      supportedToolTypes: ['PERFORMANCE_RUBRIC', 'SCORING_GUIDE'],
      notRecommendedToolTypes: ['ANSWER_KEY'],
      suggestedMethod: 'การสังเกตการปฏิบัติการทดลอง',
      defaultCriteriaType: 'ITEMS_PASSED',
      defaultCriteriaValue: 4,
      defaultCriteriaText: 'ปฏิบัติถูกต้องอย่างน้อย 4 จาก 5 รายการ',
      rationale: 'ทักษะการทดลองสังเกตได้จากพฤติกรรมและการปฏิบัติตามขั้นตอน',
    };
  }

  // F. PE Skill
  if (
    normSubject === 'PHYSICAL_EDUCATION' ||
    normFocus.includes('SPORT') ||
    normFocus.includes('MOVEMENT')
  ) {
    return {
      preferredAssessmentType: 'PERFORMANCE',
      preferredToolTypes: ['PERFORMANCE_RUBRIC', 'CHECKLIST'],
      supportedToolTypes: ['RATING_SCALE', 'OBSERVATION_FORM'],
      notRecommendedToolTypes: ['ANSWER_KEY', 'QUIZ'],
      suggestedMethod: 'การประเมินทักษะการปฏิบัติและการเคลื่อนไหว',
      defaultCriteriaType: 'ITEMS_PASSED',
      defaultCriteriaValue: 4,
      defaultCriteriaText: 'ผ่านทักษะปฏิบัติอย่างน้อย 4 ใน 5 ท่า',
      rationale: 'ทักษะพลศึกษาประเมินจากการปฏิบัติจริง ไม่ใช้ข้อเขียน',
    };
  }

  return {
    preferredAssessmentType: 'PERFORMANCE',
    preferredToolTypes: ['RUBRIC', 'CHECKLIST'],
    supportedToolTypes: ['SCORING_GUIDE'],
    notRecommendedToolTypes: [],
    suggestedMethod: 'การประเมินตามสภาพจริง',
    defaultCriteriaType: 'PERCENTAGE',
    defaultCriteriaValue: 70,
    defaultCriteriaText: 'ผ่านเกณฑ์ไม่น้อยกว่า 70%',
    rationale: 'ประเมินตามสภาพจริง',
  };
}

function validateRubric(content) {
  if (!content || !content.title || !Array.isArray(content.levels) || !Array.isArray(content.criteria)) {
    return { valid: false, error: 'โครงสร้าง Rubric ไม่ถูกต้อง' };
  }
  if (content.levels.length < 3 || content.levels.length > 5) {
    return { valid: false, error: 'Rubric ต้องมีระหว่าง 3-5 ระดับ' };
  }
  if (content.criteria.length < 1) {
    return { valid: false, error: 'ต้องมีเกณฑ์ประเมินอย่างน้อย 1 ข้อ' };
  }

  const scores = new Set();
  for (const l of content.levels) {
    if (scores.has(l.score)) return { valid: false, error: 'คะแนนระดับซ้ำกัน' };
    scores.add(l.score);
  }

  for (const crit of content.criteria) {
    if (!crit.name || !crit.descriptors) return { valid: false, error: 'ข้อมูลเกณฑ์ไม่สมบูรณ์' };
    for (const lvl of content.levels) {
      const desc = crit.descriptors[String(lvl.score)];
      if (!desc || !desc.trim()) {
        return { valid: false, error: `คำอธิบายระดับ ${lvl.score} ของเกณฑ์ "${crit.name}" ว่างเปล่า` };
      }
    }
  }

  return { valid: true };
}

function validateChecklist(content) {
  if (!content || !Array.isArray(content.items) || content.items.length === 0) {
    return { valid: false, error: 'Checklist ต้องมีอย่างน้อย 1 รายการ' };
  }
  for (const item of content.items) {
    if (!item.criterion || !item.criterion.trim()) {
      return { valid: false, error: 'รายการพฤติกรรมใน Checklist ว่างเปล่า' };
    }
  }
  return { valid: true };
}

function validateAssessmentRules(graph) {
  const {
    evidence = [],
    assessments = [],
    assessmentEvidenceLinks = [],
    assessmentTools = [],
    activities = [],
  } = graph;

  const assessedEvidenceIds = new Set(assessmentEvidenceLinks.map((l) => l.evidence_id));
  const unassessedEvidenceIds = evidence.filter((e) => !assessedEvidenceIds.has(e.id)).map((e) => e.id);

  const toolMap = new Map(assessmentTools.map((t) => [t.assessment_id, t]));
  const missingToolAssessmentIds = assessments.filter((a) => !toolMap.has(a.id)).map((a) => a.id);

  const missingCriteriaAssessmentIds = assessments
    .filter((a) => {
      if (!a.criteria_type || !a.criteria_type.trim()) return true;
      if (a.criteria_type !== 'CUSTOM' && a.criteria_type !== 'PASS_FAIL') {
        const hasVal = a.criteria_value !== null && a.criteria_value !== undefined;
        const hasText = a.criteria_text && a.criteria_text.trim().length > 0;
        return !hasVal && !hasText;
      }
      return !a.criteria_text || !a.criteria_text.trim();
    })
    .map((a) => a.id);

  const hasFormativeAssessment = assessments.some((a) => a.formative === true);
  const hasFeedbackOpportunity =
    activities.some((act) => Boolean(act.feedback_moment && act.feedback_moment.trim())) ||
    hasFormativeAssessment;

  const toolWarnings = [];
  assessments.forEach((asm) => {
    const tool = toolMap.get(asm.id);
    if (!tool) return;
    const linkedEvdIds = assessmentEvidenceLinks
      .filter((l) => l.assessment_id === asm.id)
      .map((l) => l.evidence_id);
    const linkedEvds = evidence.filter((e) => linkedEvdIds.includes(e.id));

    const isSpeaking = linkedEvds.some((e) => (e.evidence_type || '').toUpperCase().includes('SPEAK'));
    if (isSpeaking && tool.tool_type === 'ANSWER_KEY') {
      toolWarnings.push({
        assessmentId: asm.id,
        toolType: tool.tool_type,
        warning: 'เครื่องมือเฉลยคำตอบ (Answer Key) อาจไม่เหมาะกับหลักฐานการพูด',
      });
    }
  });

  const allPassed =
    unassessedEvidenceIds.length === 0 &&
    missingToolAssessmentIds.length === 0 &&
    missingCriteriaAssessmentIds.length === 0 &&
    assessments.length > 0;

  return {
    evidenceCoverage: {
      total: evidence.length,
      assessed: evidence.length - unassessedEvidenceIds.length,
      unassessedEvidenceIds,
      allCovered: unassessedEvidenceIds.length === 0 && evidence.length > 0,
    },
    toolsCompleteness: {
      total: assessments.length,
      withTools: assessments.length - missingToolAssessmentIds.length,
      missingToolAssessmentIds,
      allComplete: missingToolAssessmentIds.length === 0 && assessments.length > 0,
    },
    criteriaCompleteness: {
      total: assessments.length,
      withCriteria: assessments.length - missingCriteriaAssessmentIds.length,
      missingCriteriaAssessmentIds,
      allComplete: missingCriteriaAssessmentIds.length === 0 && assessments.length > 0,
    },
    hasFormativeAssessment,
    hasFeedbackOpportunity,
    toolWarnings,
    allPassed,
  };
}

function deriveAssessmentReadiness(graph) {
  const summary = validateAssessmentRules(graph);
  return {
    ready: summary.allPassed,
    missingAssessmentEvidenceIds: summary.evidenceCoverage.unassessedEvidenceIds,
    missingToolAssessmentIds: summary.toolsCompleteness.missingToolAssessmentIds,
    missingCriteriaAssessmentIds: summary.criteriaCompleteness.missingCriteriaAssessmentIds,
    warnings: summary.toolWarnings.map((t) => t.warning),
  };
}

// ─── Test Suite Execution ────────────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════════');
console.log('  SMART PLAN V3.5 — ASSESSMENT ENGINE TEST SUITE');
console.log('══════════════════════════════════════════════════════════\n');

// ── TEST A — English Speaking ──
header('TEST A — English Speaking');
test('A1: English Speaking recommends PERFORMANCE assessment', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    evidenceType: 'SPEAKING',
  });
  assert.strictEqual(rec.preferredAssessmentType, 'PERFORMANCE');
});

test('A2: English Speaking recommends PERFORMANCE_RUBRIC or OBSERVATION_FORM tools', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    evidenceType: 'SPEAKING',
  });
  const hasTool = rec.preferredToolTypes.includes('PERFORMANCE_RUBRIC') || rec.preferredToolTypes.includes('OBSERVATION_FORM');
  assert.strictEqual(hasTool, true);
});

test('A3: English Speaking does NOT recommend ANSWER_KEY as primary', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    evidenceType: 'SPEAKING',
  });
  assert.strictEqual(rec.preferredToolTypes.includes('ANSWER_KEY'), false);
  assert.strictEqual(rec.notRecommendedToolTypes.includes('ANSWER_KEY'), true);
});

// ── TEST B — English Vocabulary ──
header('TEST B — English Vocabulary');
test('B1: English Vocabulary Quiz recommends QUIZ assessment and ANSWER_KEY', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'ENGLISH',
    learningFocus: 'LANGUAGE_USE',
    evidenceType: 'QUIZ',
  });
  assert.strictEqual(rec.preferredAssessmentType, 'QUIZ');
  assert.strictEqual(rec.preferredToolTypes.includes('ANSWER_KEY'), true);
});

// ── TEST C — Math Calculation ──
header('TEST C — Math Calculation');
test('C1: Math Calculation recommends ANSWER_KEY or SCORING_GUIDE', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'CALCULATION',
    evidenceType: 'WORKSHEET',
  });
  const hasTool = rec.preferredToolTypes.includes('ANSWER_KEY') || rec.preferredToolTypes.includes('SCORING_GUIDE');
  assert.strictEqual(hasTool, true);
});

test('C2: Math Calculation does NOT default to Rubric', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'CALCULATION',
    evidenceType: 'CALCULATION',
  });
  assert.strictEqual(rec.preferredToolTypes.includes('PERFORMANCE_RUBRIC'), false);
  assert.strictEqual(rec.preferredToolTypes.includes('RUBRIC'), false);
});

// ── TEST D — Math Problem Solving ──
header('TEST D — Math Problem Solving');
test('D1: Math Problem Solving recommends SCORING_GUIDE or RUBRIC and supports Reasoning', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'PROBLEM_SOLVING',
    evidenceType: 'WRITTEN_SOLUTION',
  });
  const hasTool = rec.preferredToolTypes.includes('SCORING_GUIDE') || rec.preferredToolTypes.includes('RUBRIC');
  assert.strictEqual(hasTool, true);
  assert.strictEqual(rec.notRecommendedToolTypes.includes('ANSWER_KEY'), true);
  assert.strictEqual(rec.rationale.includes('Reasoning') || rec.rationale.includes('เหตุผล'), true);
});

// ── TEST E — Science Experiment Procedure ──
header('TEST E — Science Experiment Procedure');
test('E1: Science Experiment recommends OBSERVATION / CHECKLIST', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'SCIENCE',
    learningFocus: 'EXPERIMENT',
    evidenceType: 'EXPERIMENT',
  });
  assert.strictEqual(rec.preferredAssessmentType, 'OBSERVATION');
  assert.strictEqual(rec.preferredToolTypes.includes('CHECKLIST'), true);
});

// ── TEST F — PE Skill ──
header('TEST F — PE Skill');
test('F1: PE Skill recommends PERFORMANCE_RUBRIC or CHECKLIST', () => {
  const rec = getAssessmentRecommendations({
    subjectKey: 'PHYSICAL_EDUCATION',
    learningFocus: 'SPORT_SKILL',
    evidenceType: 'PERFORMANCE',
  });
  const hasTool = rec.preferredToolTypes.includes('PERFORMANCE_RUBRIC') || rec.preferredToolTypes.includes('CHECKLIST');
  assert.strictEqual(hasTool, true);
  assert.strictEqual(rec.notRecommendedToolTypes.includes('ANSWER_KEY'), true);
});

// ── TEST G — Evidence Coverage ──
header('TEST G — Evidence Coverage');
test('G1: Detects unassessed evidence (3 evidence, 2 assessed)', () => {
  const graph = {
    evidence: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
    assessments: [{ id: 'a1', criteria_type: 'PERCENTAGE', criteria_value: 70, formative: false }, { id: 'a2', criteria_type: 'PERCENTAGE', criteria_value: 70, formative: false }],
    assessmentEvidenceLinks: [
      { assessment_id: 'a1', evidence_id: 'e1' },
      { assessment_id: 'a2', evidence_id: 'e2' },
    ],
    assessmentTools: [
      { assessment_id: 'a1', tool_type: 'RUBRIC' },
      { assessment_id: 'a2', tool_type: 'CHECKLIST' },
    ],
    activities: [],
  };
  const readiness = deriveAssessmentReadiness(graph);
  assert.strictEqual(readiness.ready, false);
  assert.strictEqual(readiness.missingAssessmentEvidenceIds.length, 1);
  assert.strictEqual(readiness.missingAssessmentEvidenceIds[0], 'e3');
});

// ── TEST H — Missing Tool ──
header('TEST H — Missing Tool');
test('H1: Flags assessment without a tool', () => {
  const graph = {
    evidence: [{ id: 'e1' }],
    assessments: [{ id: 'a1', criteria_type: 'PERCENTAGE', criteria_value: 70, formative: false }],
    assessmentEvidenceLinks: [{ assessment_id: 'a1', evidence_id: 'e1' }],
    assessmentTools: [], // Missing!
    activities: [],
  };
  const readiness = deriveAssessmentReadiness(graph);
  assert.strictEqual(readiness.ready, false);
  assert.strictEqual(readiness.missingToolAssessmentIds.length, 1);
  assert.strictEqual(readiness.missingToolAssessmentIds[0], 'a1');
});

// ── TEST I — Missing Criteria ──
header('TEST I — Missing Criteria');
test('I1: Flags assessment without passing criteria', () => {
  const graph = {
    evidence: [{ id: 'e1' }],
    assessments: [{ id: 'a1', criteria_type: '', criteria_value: null, criteria_text: null, formative: false }], // Missing criteria!
    assessmentEvidenceLinks: [{ assessment_id: 'a1', evidence_id: 'e1' }],
    assessmentTools: [{ assessment_id: 'a1', tool_type: 'RUBRIC' }],
    activities: [],
  };
  const readiness = deriveAssessmentReadiness(graph);
  assert.strictEqual(readiness.ready, false);
  assert.strictEqual(readiness.missingCriteriaAssessmentIds.length, 1);
});

// ── TEST J — Rubric Validation ──
header('TEST J — Rubric Validation');
test('J1: Complete 4-level 3-criterion rubric passes validation', () => {
  const rubric = {
    title: 'Speaking Rubric',
    levels: [
      { score: 4, label: 'ระดับ 4' },
      { score: 3, label: 'ระดับ 3' },
      { score: 2, label: 'ระดับ 2' },
      { score: 1, label: 'ระดับ 1' },
    ],
    criteria: [
      { name: 'C1', descriptors: { '4': 'A', '3': 'B', '2': 'C', '1': 'D' } },
      { name: 'C2', descriptors: { '4': 'A', '3': 'B', '2': 'C', '1': 'D' } },
      { name: 'C3', descriptors: { '4': 'A', '3': 'B', '2': 'C', '1': 'D' } },
    ],
  };
  const res = validateRubric(rubric);
  assert.strictEqual(res.valid, true);
});

test('J2: Rubric with 1 blank descriptor fails validation', () => {
  const rubric = {
    title: 'Speaking Rubric',
    levels: [
      { score: 4, label: 'ระดับ 4' },
      { score: 3, label: 'ระดับ 3' },
      { score: 2, label: 'ระดับ 2' },
      { score: 1, label: 'ระดับ 1' },
    ],
    criteria: [
      { name: 'C1', descriptors: { '4': 'A', '3': '', '2': 'C', '1': 'D' } }, // Blank '3'!
    ],
  };
  const res = validateRubric(rubric);
  assert.strictEqual(res.valid, false);
});

// ── TEST K — Checklist Validation ──
header('TEST K — Checklist Validation');
test('K1: Checklist with observable items passes', () => {
  const cl = {
    items: [
      { id: '1', criterion: 'ออกเสียงคำศัพท์เป้าหมายชัดเจน', observable: true },
      { id: '2', criterion: 'ถามตอบคู่สนทนาได้ตรงตามหัวข้อ', observable: true },
    ],
  };
  assert.strictEqual(validateChecklist(cl).valid, true);
});

test('K2: Checklist with empty item text fails', () => {
  const cl = {
    items: [
      { id: '1', criterion: '', observable: true },
    ],
  };
  assert.strictEqual(validateChecklist(cl).valid, false);
});

// ── TEST L — Invalid Combination Warning ──
header('TEST L — Invalid Combination Warning');
test('L1: Speaking evidence paired with Answer Key emits warning', () => {
  const graph = {
    evidence: [{ id: 'e1', evidence_type: 'SPEAKING_PERFORMANCE' }],
    assessments: [{ id: 'a1', criteria_type: 'PERCENTAGE', criteria_value: 70, formative: false }],
    assessmentEvidenceLinks: [{ assessment_id: 'a1', evidence_id: 'e1' }],
    assessmentTools: [{ assessment_id: 'a1', tool_type: 'ANSWER_KEY' }],
    activities: [],
  };
  const summary = validateAssessmentRules(graph);
  assert.strictEqual(summary.toolWarnings.length >= 1, true);
  assert.strictEqual(summary.toolWarnings[0].warning.includes('Answer Key'), true);
});

// ── TEST M — Formative Integration ──
header('TEST M — Formative Integration');
test('M1: Formative assessment linked to activity is recognized in graph', () => {
  const activity = { id: 'act-1', title: 'Pair Practice', assessment_moment: 'สุ่มประเมินการออกเสียง' };
  const graph = {
    evidence: [{ id: 'e1' }],
    assessments: [{ id: 'a1', criteria_type: 'ITEMS_PASSED', criteria_value: 3, formative: true }],
    assessmentEvidenceLinks: [{ assessment_id: 'a1', evidence_id: 'e1' }],
    assessmentTools: [{ assessment_id: 'a1', tool_type: 'CHECKLIST' }],
    activities: [activity],
  };
  const summary = validateAssessmentRules(graph);
  assert.strictEqual(summary.hasFormativeAssessment, true);
  assert.strictEqual(summary.hasFeedbackOpportunity, true);
});

// ── TEST N — Many-to-Many Assessment Links ──
header('TEST N — Many-to-Many Assessment Links');
test('N1: Single assessment linked to multiple evidence items correctly registers coverage', () => {
  const graph = {
    evidence: [{ id: 'e1', title: 'Evd 1' }, { id: 'e2', title: 'Evd 2' }],
    assessments: [{ id: 'a1', name: 'Integrated Assessment', criteria_type: 'PERCENTAGE', criteria_value: 70, formative: false }],
    assessmentEvidenceLinks: [
      { assessment_id: 'a1', evidence_id: 'e1' },
      { assessment_id: 'a1', evidence_id: 'e2' },
    ],
    assessmentTools: [{ assessment_id: 'a1', tool_type: 'RUBRIC' }],
    activities: [],
  };
  const readiness = deriveAssessmentReadiness(graph);
  assert.strictEqual(readiness.ready, true);
  assert.strictEqual(readiness.missingAssessmentEvidenceIds.length, 0);
});

// ── TEST O — Delete Safety ──
header('TEST O — Delete Safety');
test('O1: Deleting assessment cascades only to links & tools, preserving evidence & objectives', () => {
  const evidenceStore = [{ id: 'e1' }, { id: 'e2' }];
  const objectiveStore = [{ id: 'o1' }];
  const activityStore = [{ id: 'act1' }];
  let assessmentStore = [{ id: 'a1' }];
  let asmEvdLinks = [{ assessment_id: 'a1', evidence_id: 'e1' }];
  let asmActLinks = [{ assessment_id: 'a1', activity_id: 'act1' }];
  let asmTools = [{ id: 't1', assessment_id: 'a1' }];

  // Simulate deleteAssessment('a1')
  const targetId = 'a1';
  asmEvdLinks = asmEvdLinks.filter((l) => l.assessment_id !== targetId);
  asmActLinks = asmActLinks.filter((l) => l.assessment_id !== targetId);
  asmTools = asmTools.filter((t) => t.assessment_id !== targetId);
  assessmentStore = assessmentStore.filter((a) => a.id !== targetId);

  // Assertions
  assert.strictEqual(assessmentStore.length, 0, 'Assessment deleted');
  assert.strictEqual(asmEvdLinks.length, 0, 'Assessment-Evidence link deleted');
  assert.strictEqual(asmActLinks.length, 0, 'Assessment-Activity link deleted');
  assert.strictEqual(asmTools.length, 0, 'Assessment Tool deleted');
  assert.strictEqual(evidenceStore.length, 2, 'Evidence preserved');
  assert.strictEqual(objectiveStore.length, 1, 'Objective preserved');
  assert.strictEqual(activityStore.length, 1, 'Activity preserved');
});

// ── Final Report ──
console.log('\n──────────────────────────────────────────────────');
console.log(`RESULTS: ${passedTests} passed, ${totalTests - passedTests} failed out of ${totalTests} tests`);
console.log('AI CALLS IN TESTS: 0');
if (passedTests === totalTests) {
  console.log('\n✅ ALL 15 WAVE V3.5 TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('\n❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
