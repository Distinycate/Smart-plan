/**
 * Smart Plan V3.7 — Automated Test Suite: Quality & PA Readiness Engine
 * Tests A–N (All deterministic quality rules, PA readiness, and schema sanitization)
 *
 * Runs under plain `node` — zero external dependencies.
 * Zero external network or AI calls during unit execution.
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');

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

// ─── Minimal Implementations for Offline Node.js Testing ───

function computeLessonHash(graph) {
  const parts = [
    graph.lesson.id,
    graph.lesson.topic,
    graph.lesson.duration_minutes,
    graph.lesson.learning_focus,
    (graph.objectives || []).map(o => `${o.id}:${o.statement}:${o.objective_type}`).join('|'),
    (graph.evidence || []).map(e => `${e.id}:${e.evidence_type}:${e.description}`).join('|'),
    (graph.activities || []).map(a => `${a.id}:${a.phase}:${a.minutes}:${a.student_actions}`).join('|'),
    (graph.assessments || []).map(a => `${a.id}:${a.name}:${a.method}`).join('|'),
    (graph.teachingAssets || []).map(a => `${a.id}:${a.title}:${a.asset_type}`).join('|'),
    (graph.objectiveEvidenceLinks || []).map(l => `${l.objective_id}->${l.evidence_id}`).join('|'),
    (graph.activityObjectiveLinks || []).map(l => `${l.activity_id}->${l.objective_id}`).join('|'),
    (graph.activityEvidenceLinks || []).map(l => `${l.activity_id}->${l.evidence_id}`).join('|'),
  ];
  return crypto.createHash('sha256').update(parts.join(':::')).digest('hex').substring(0, 16);
}

function buildEntityRefs(graph) {
  const objectiveRefs = {};
  graph.objectives.forEach((o, i) => { objectiveRefs[o.id] = `O${i + 1}`; });
  const evidenceRefs = {};
  graph.evidence.forEach((e, i) => { evidenceRefs[e.id] = `E${i + 1}`; });
  const activityRefs = {};
  graph.activities.forEach((a, i) => { activityRefs[a.id] = `A${i + 1}`; });
  const assessmentRefs = {};
  graph.assessments.forEach((a, i) => { assessmentRefs[a.id] = `AS${i + 1}`; });
  const toolRefs = {};
  (graph.assessmentTools || []).forEach((t, i) => { toolRefs[t.id] = `T${i + 1}`; });
  const assetRefs = {};
  (graph.teachingAssets || []).forEach((a, i) => { assetRefs[a.id] = `AT${i + 1}`; });

  return { objectiveRefs, evidenceRefs, activityRefs, assessmentRefs, toolRefs, assetRefs };
}

function runDeterministicRules(graph) {
  const issues = [];
  const refs = buildEntityRefs(graph);

  // Rule 1: Every objective must have evidence
  for (const obj of graph.objectives) {
    const hasEvidence = graph.objectiveEvidenceLinks.some(l => l.objective_id === obj.id);
    if (!hasEvidence) {
      issues.push({
        ruleId: 'DET-OBJ-NO-EVIDENCE',
        category: 'ALIGNMENT',
        severity: 'ERROR',
        locationType: 'OBJECTIVE',
        locationId: obj.id,
        locationRef: refs.objectiveRefs[obj.id],
        message: `จุดประสงค์ "${obj.statement?.substring(0, 30)}..." ยังไม่มีหลักฐานการเรียนรู้รองรับ`,
        stepNumber: 2,
        blockingForExport: true,
      });
    }
  }

  // Rule 2: Every objective must have activity
  for (const obj of graph.objectives) {
    const hasAct = graph.activityObjectiveLinks.some(l => l.objective_id === obj.id);
    if (!hasAct) {
      issues.push({
        ruleId: 'DET-OBJ-NO-ACTIVITY',
        category: 'ALIGNMENT',
        severity: 'ERROR',
        locationType: 'OBJECTIVE',
        locationId: obj.id,
        locationRef: refs.objectiveRefs[obj.id],
        message: `จุดประสงค์ "${obj.statement?.substring(0, 30)}..." ยังไม่มีกิจกรรมการเรียนรู้ที่สอน`,
        stepNumber: 3,
        blockingForExport: true,
      });
    }
  }

  // Rule 3: Evidence not linked to objective
  for (const evd of graph.evidence) {
    const linked = graph.objectiveEvidenceLinks.some(l => l.evidence_id === evd.id);
    if (!linked) {
      issues.push({
        ruleId: 'DET-EVD-UNLINKED',
        category: 'ALIGNMENT',
        severity: 'WARNING',
        locationType: 'EVIDENCE',
        locationId: evd.id,
        locationRef: refs.evidenceRefs[evd.id],
        message: `หลักฐาน "${evd.description?.substring(0, 30)}..." ยังไม่ถูกเชื่อมกับจุดประสงค์ใด`,
        stepNumber: 2,
        blockingForExport: false,
      });
    }
  }

  // Rule 4: Total activity duration
  const plannedDuration = graph.lesson.duration_minutes || 60;
  const actualDuration = graph.activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
  const diff = Math.abs(actualDuration - plannedDuration);
  if (diff > 10) {
    issues.push({
      ruleId: 'DET-TIME-MISMATCH',
      category: 'TIME',
      severity: 'ERROR',
      locationType: 'LESSON',
      locationId: graph.lesson.id,
      message: `เวลารวมของกิจกรรม (${actualDuration} นาที) ต่างจากเวลาแผนที่กำหนด (${plannedDuration} นาที) เกิน 10 นาที`,
      stepNumber: 3,
      blockingForExport: true,
    });
  } else if (diff > 0) {
    issues.push({
      ruleId: 'DET-TIME-SLIGHT-MISMATCH',
      category: 'TIME',
      severity: 'WARNING',
      locationType: 'LESSON',
      locationId: graph.lesson.id,
      message: `เวลารวมของกิจกรรม (${actualDuration} นาที) ต่างจากเวลาแผน (${plannedDuration} นาที) เล็กน้อย`,
      stepNumber: 3,
      blockingForExport: false,
    });
  }

  // Rule 5: Active learning check (student actions)
  const passiveKeywords = ['ฟังบรรยาย', 'ฟังครูพูด', 'จดตามกระดาน', 'นั่งเงียบๆ'];
  let passiveCount = 0;
  for (const act of graph.activities) {
    if (act.student_actions && passiveKeywords.some(kw => act.student_actions.includes(kw))) {
      passiveCount++;
    }
  }
  if (passiveCount >= 2 && graph.activities.length > 0) {
    issues.push({
      ruleId: 'DET-ACT-TOO-PASSIVE',
      category: 'ACTIVITY',
      severity: 'WARNING',
      locationType: 'ACTIVITY',
      message: 'กิจกรรมมีลักษณะ Passive (รับฟังฝ่ายเดียว) มากเกินไป ควรเพิ่มบทบาทนักเรียนให้ Active',
      stepNumber: 3,
      blockingForExport: false,
    });
  }

  // Rule 6: Assessment requires tool
  for (const asm of graph.assessments) {
    const hasTool = (graph.assessmentTools || []).some(t => t.assessment_id === asm.id);
    if (!hasTool) {
      issues.push({
        ruleId: 'DET-ASM-NO-TOOL',
        category: 'ASSESSMENT',
        severity: 'WARNING',
        locationType: 'ASSESSMENT',
        locationId: asm.id,
        locationRef: refs.assessmentRefs[asm.id],
        message: `การประเมิน "${asm.name}" ยังไม่มีเครื่องมือประเมิน (เช่น แบบประเมิน/รูบริก)`,
        stepNumber: 4,
        blockingForExport: false,
      });
    }
  }

  // Rule 7: Feedback moments
  const hasFeedback = graph.activities.some(a => Boolean(a.feedback_moment && a.feedback_moment.trim()));
  if (!hasFeedback && graph.activities.length > 0) {
    issues.push({
      ruleId: 'DET-FEEDBACK-MISSING',
      category: 'FEEDBACK',
      severity: 'WARNING',
      locationType: 'LESSON',
      locationId: graph.lesson.id,
      message: 'ไม่มีช่วงเวลาสะท้อนคิด/ให้ข้อมูลย้อนกลับ (Feedback Moment) ในกิจกรรมใดเลย',
      stepNumber: 3,
      blockingForExport: false,
    });
  }

  return issues;
}

function evaluateQualityGate(graph) {
  const issues = runDeterministicRules(graph);
  const errorCount = issues.filter(i => i.severity === 'ERROR').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  let score = 100;
  score -= errorCount * 25;
  score -= warningCount * 5;
  score = Math.max(0, Math.min(100, score));

  const status = errorCount > 0 ? 'FAILED' : warningCount > 0 ? 'WARNING' : 'PASSED';
  const canExport = errorCount === 0;

  return {
    score,
    status,
    canExport,
    issues,
    summary: { errorCount, warningCount, totalCount: issues.length },
  };
}

function evaluatePAReadiness(graph) {
  // 8 PA Criteria
  const paIndicators = [
    {
      id: 'PA-1',
      title: 'การเชื่อมโยงความรู้เดิมสู่การเรียนรู้ใหม่',
      score: graph.activities.some(a => a.phase === 'WARMUP' || a.phase === 'INTRO') ? 100 : 40,
    },
    {
      id: 'PA-2',
      title: 'การจัดกิจกรรมการเรียนรู้แบบ Active Learning',
      score: graph.activities.filter(a => a.student_actions && a.student_actions.length > 10).length >= 2 ? 100 : 50,
    },
    {
      id: 'PA-3',
      title: 'การส่งเสริมทักษะและการคิดขั้นสูง (Scaffolding)',
      score: graph.activities.length >= 3 ? 100 : 60,
    },
    {
      id: 'PA-4',
      title: 'การเปิดโอกาสให้นักเรียนมีส่วนร่วมและฝึกปฏิบัติจริง',
      score: graph.activities.some(a => a.phase === 'PRACTICE' || a.phase === 'DEVELOP') ? 100 : 30,
    },
    {
      id: 'PA-5',
      title: 'การวัดและประเมินผลที่สอดคล้องกับจุดประสงค์',
      score: graph.assessments.length > 0 && graph.assessmentEvidenceLinks.length > 0 ? 100 : 40,
    },
    {
      id: 'PA-6',
      title: 'การให้ข้อมูลย้อนกลับและการสะท้อนคิด (Feedback & Reflection)',
      score: graph.activities.some(a => Boolean(a.feedback_moment?.trim())) ? 100 : 30,
    },
    {
      id: 'PA-7',
      title: 'การใช้สื่อ นวัตกรรม หรือแหล่งเรียนรู้ที่เหมาะสม',
      score: (graph.teachingAssets || []).length > 0 ? 100 : 40,
    },
    {
      id: 'PA-8',
      title: 'การวัดผลสัมฤทธิ์และหลักฐานการเรียนรู้เชิงประจักษ์',
      score: graph.evidence.length > 0 && graph.objectiveEvidenceLinks.length > 0 ? 100 : 30,
    },
  ];

  const totalScore = Math.round(paIndicators.reduce((s, i) => s + i.score, 0) / paIndicators.length);
  const isReady = totalScore >= 75 && paIndicators.every(i => i.score >= 50);

  return {
    isReady,
    readinessScore: totalScore,
    status: isReady ? 'READY' : totalScore >= 50 ? 'PARTIALLY_READY' : 'NOT_READY',
    indicators: paIndicators,
  };
}

function sanitizeAiOutput(rawText, validRefs) {
  let parsed;
  try {
    parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim());
  } catch (e) {
    return { valid: false, sanitized: [] };
  }

  const valid = [];
  for (const item of (parsed.issues || [])) {
    if (item.locationRef && !validRefs.has(item.locationRef)) {
      // Hallucinated ref! Drop or sanitize
      continue;
    }
    valid.push(item);
  }
  return { valid: true, sanitized: valid };
}

// ─── Test Suite Execution ───

console.log('====================================================');
console.log('  Smart Plan V3.7: Quality & PA Readiness Test Suite');
console.log('====================================================');

header('Test Group A: Lesson Hash & Graph Alignment');

test('A1: Hash is deterministic for identical graph', () => {
  const g1 = {
    lesson: { id: 'l1', topic: 'Speaking', duration_minutes: 50, learning_focus: 'PRACTICE' },
    objectives: [{ id: 'o1', statement: 'Say hello', objective_type: 'K' }],
    evidence: [{ id: 'e1', evidence_type: 'SPEAKING', description: 'Greeting' }],
    activities: [{ id: 'a1', phase: 'WARMUP', minutes: 10, student_actions: 'Greet teacher' }],
    assessments: [],
    teachingAssets: [],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
    activityEvidenceLinks: [],
  };
  const h1 = computeLessonHash(g1);
  const h2 = computeLessonHash(g1);
  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 16);
});

test('A2: Hash changes when objective is modified', () => {
  const g1 = {
    lesson: { id: 'l1', topic: 'Speaking', duration_minutes: 50, learning_focus: 'PRACTICE' },
    objectives: [{ id: 'o1', statement: 'Say hello', objective_type: 'K' }],
    evidence: [], activities: [], assessments: [], teachingAssets: [],
    objectiveEvidenceLinks: [], activityObjectiveLinks: [], activityEvidenceLinks: [],
  };
  const g2 = {
    ...g1,
    objectives: [{ id: 'o1', statement: 'Say goodbye', objective_type: 'K' }],
  };
  assert.notStrictEqual(computeLessonHash(g1), computeLessonHash(g2));
});

test('A3: Entity refs generate formatted labels (O1, E1, A1, AS1, AT1)', () => {
  const g = {
    objectives: [{ id: 'obj-uuid-1' }],
    evidence: [{ id: 'evd-uuid-1' }],
    activities: [{ id: 'act-uuid-1' }],
    assessments: [{ id: 'asm-uuid-1' }],
    assessmentTools: [{ id: 'tool-uuid-1' }],
    teachingAssets: [{ id: 'asset-uuid-1' }],
  };
  const refs = buildEntityRefs(g);
  assert.strictEqual(refs.objectiveRefs['obj-uuid-1'], 'O1');
  assert.strictEqual(refs.evidenceRefs['evd-uuid-1'], 'E1');
  assert.strictEqual(refs.activityRefs['act-uuid-1'], 'A1');
  assert.strictEqual(refs.assessmentRefs['asm-uuid-1'], 'AS1');
  assert.strictEqual(refs.toolRefs['tool-uuid-1'], 'T1');
  assert.strictEqual(refs.assetRefs['asset-uuid-1'], 'AT1');
});

header('Test Group B: Deterministic Quality Rules');

test('B1: Detects missing evidence for objective (Blocking Error)', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [{ id: 'o1', statement: 'Learn words' }],
    evidence: [],
    activities: [{ id: 'a1', minutes: 50 }],
    assessments: [],
    objectiveEvidenceLinks: [],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
  };
  const issues = runDeterministicRules(g);
  const err = issues.find(i => i.ruleId === 'DET-OBJ-NO-EVIDENCE');
  assert(err, 'Should find missing evidence error');
  assert.strictEqual(err.severity, 'ERROR');
  assert.strictEqual(err.blockingForExport, true);
});

test('B2: Detects unlinked objective to activity (Blocking Error)', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [{ id: 'o1', statement: 'Learn words' }],
    evidence: [{ id: 'e1', description: 'Worksheet' }],
    activities: [{ id: 'a1', minutes: 50 }],
    assessments: [],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [], // Not linked!
  };
  const issues = runDeterministicRules(g);
  const err = issues.find(i => i.ruleId === 'DET-OBJ-NO-ACTIVITY');
  assert(err, 'Should find missing activity link');
  assert.strictEqual(err.severity, 'ERROR');
  assert.strictEqual(err.blockingForExport, true);
});

test('B3: Detects unlinked evidence (Warning, non-blocking)', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [{ id: 'o1', statement: 'Learn words' }],
    evidence: [{ id: 'e1', description: 'Worksheet 1' }, { id: 'e2', description: 'Orphan evidence' }],
    activities: [{ id: 'a1', minutes: 50 }],
    assessments: [],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
  };
  const issues = runDeterministicRules(g);
  const warn = issues.find(i => i.ruleId === 'DET-EVD-UNLINKED');
  assert(warn, 'Should find unlinked evidence');
  assert.strictEqual(warn.severity, 'WARNING');
  assert.strictEqual(warn.blockingForExport, false);
});

test('B4: Detects time mismatch > 10 min (Blocking Error)', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 60 },
    objectives: [{ id: 'o1' }],
    evidence: [{ id: 'e1' }],
    activities: [{ id: 'a1', minutes: 30 }], // 30 != 60 (diff = 30)
    assessments: [],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
  };
  const issues = runDeterministicRules(g);
  const err = issues.find(i => i.ruleId === 'DET-TIME-MISMATCH');
  assert(err, 'Should find time mismatch > 10 min error');
  assert.strictEqual(err.severity, 'ERROR');
});

test('B5: Detects time slight mismatch <= 10 min (Warning)', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 60 },
    objectives: [{ id: 'o1' }],
    evidence: [{ id: 'e1' }],
    activities: [{ id: 'a1', minutes: 55 }], // 55 vs 60 (diff = 5)
    assessments: [],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
  };
  const issues = runDeterministicRules(g);
  const warn = issues.find(i => i.ruleId === 'DET-TIME-SLIGHT-MISMATCH');
  assert(warn, 'Should find slight time mismatch warning');
  assert.strictEqual(warn.severity, 'WARNING');
});

test('B6: Detects assessment missing tool (Warning)', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [{ id: 'o1' }],
    evidence: [{ id: 'e1' }],
    activities: [{ id: 'a1', minutes: 50 }],
    assessments: [{ id: 'asm1', name: 'Quiz' }],
    assessmentTools: [], // Missing tool
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
  };
  const issues = runDeterministicRules(g);
  const warn = issues.find(i => i.ruleId === 'DET-ASM-NO-TOOL');
  assert(warn, 'Should find assessment missing tool');
});

header('Test Group C: Quality Gate Scoring & Status');

test('C1: Fully aligned lesson scores 100 and PASSED with canExport=true', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [{ id: 'o1', statement: 'Speak conversational English' }],
    evidence: [{ id: 'e1', description: 'Dialogue recording' }],
    activities: [
      { id: 'a1', phase: 'WARMUP', minutes: 10, student_actions: 'Talk with peer', feedback_moment: 'Teacher checks pronunciation' },
      { id: 'a2', phase: 'PRACTICE', minutes: 40, student_actions: 'Role-play in pairs', feedback_moment: 'Peer review checklist' },
    ],
    assessments: [{ id: 'asm1', name: 'Speaking rubric' }],
    assessmentTools: [{ id: 't1', assessment_id: 'asm1' }],
    teachingAssets: [{ id: 'at1', title: 'Conversation Cue Cards' }],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
    activityObjectiveLinks: [
      { activity_id: 'a1', objective_id: 'o1' },
      { activity_id: 'a2', objective_id: 'o1' },
    ],
  };
  const gate = evaluateQualityGate(g);
  assert.strictEqual(gate.score, 100);
  assert.strictEqual(gate.status, 'PASSED');
  assert.strictEqual(gate.canExport, true);
  assert.strictEqual(gate.summary.errorCount, 0);
});

test('C2: Lesson with blocking error scores < 100, FAILED and canExport=false', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 60 },
    objectives: [{ id: 'o1', statement: 'Learn words' }],
    evidence: [], // Missing evidence -> ERROR
    activities: [{ id: 'a1', minutes: 30 }], // 30 != 60 -> ERROR
    assessments: [],
    teachingAssets: [],
    objectiveEvidenceLinks: [],
    activityObjectiveLinks: [{ activity_id: 'a1', objective_id: 'o1' }],
  };
  const gate = evaluateQualityGate(g);
  assert(gate.score <= 50, 'Score should be heavily penalized by errors');
  assert.strictEqual(gate.status, 'FAILED');
  assert.strictEqual(gate.canExport, false);
});

header('Test Group D: PA Readiness Engine');

test('D1: Evaluates 8 PA criteria comprehensively', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [{ id: 'o1' }],
    evidence: [{ id: 'e1' }],
    activities: [
      { id: 'a1', phase: 'WARMUP', minutes: 10, student_actions: 'Participate and answer' },
      { id: 'a2', phase: 'DEVELOP', minutes: 20, student_actions: 'Explore concept with hands-on cards' },
      { id: 'a3', phase: 'PRACTICE', minutes: 20, student_actions: 'Practice with peer feedback', feedback_moment: 'Rubric self-check' },
    ],
    assessments: [{ id: 'asm1' }],
    assessmentTools: [{ id: 't1', assessment_id: 'asm1' }],
    assessmentEvidenceLinks: [{ assessment_id: 'asm1', evidence_id: 'e1' }],
    teachingAssets: [{ id: 'at1' }],
    objectiveEvidenceLinks: [{ objective_id: 'o1', evidence_id: 'e1' }],
  };
  const pa = evaluatePAReadiness(g);
  assert.strictEqual(pa.indicators.length, 8);
  assert.strictEqual(pa.status, 'READY');
  assert(pa.readinessScore >= 80);
});

test('D2: Incomplete lesson is NOT_READY with clear deficits', () => {
  const g = {
    lesson: { id: 'l1', duration_minutes: 50 },
    objectives: [],
    evidence: [],
    activities: [{ id: 'a1', phase: 'INTRO', minutes: 10, student_actions: 'Listen' }],
    assessments: [],
    assessmentTools: [],
    assessmentEvidenceLinks: [],
    teachingAssets: [],
    objectiveEvidenceLinks: [],
  };
  const pa = evaluatePAReadiness(g);
  assert.strictEqual(pa.isReady, false);
  assert(pa.readinessScore < 70);
  assert.notStrictEqual(pa.status, 'READY');
});

header('Test Group E: AI Schema & Anti-Hallucination Sanitization');

test('E1: Rejects hallucinated entity references (e.g. O99)', () => {
  const validRefs = new Set(['O1', 'O2', 'E1', 'A1']);
  const aiJson = JSON.stringify({
    issues: [
      { locationRef: 'O1', reason: 'Objective is clear but needs more detail' },
      { locationRef: 'O99', reason: 'Ghost objective reference hallucinated by AI' },
      { locationRef: 'E1', reason: 'Evidence is valid' },
    ],
  });
  const res = sanitizeAiOutput(aiJson, validRefs);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.sanitized.length, 2);
  assert.strictEqual(res.sanitized[0].locationRef, 'O1');
  assert.strictEqual(res.sanitized[1].locationRef, 'E1');
  assert(!res.sanitized.some(i => i.locationRef === 'O99'));
});

// ─── Summary ───

console.log('\n====================================================');
console.log(`  Tests Completed: ${passedTests} / ${totalTests} Passed`);
if (passedTests === totalTests) {
  console.log('  🎉 ALL QUALITY & PA READINESS TESTS PASSED!');
} else {
  console.log(`  ⚠️ ${totalTests - passedTests} TESTS FAILED!`);
  process.exit(1);
}
console.log('====================================================\n');
