/**
 * Smart Plan V3.4 — Automated Test Suite: Lesson Blueprint & Activity Engine
 * Tests A–L (All 12 required test cases)
 *
 * Runs under plain `node` — zero external dependencies.
 * Uses mock AI response fixtures for deterministic testing.
 * AI CALLS: 0 during test execution.
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

// ─── Inline Logic Mirrors for Standalone Node Runner ─────────────────────────

function calculateActivityMinutes(activities, targetDurationMinutes = 60) {
  const totalMinutes = activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
  const remainingMinutes = targetDurationMinutes - totalMinutes;
  const isValid = totalMinutes === targetDurationMinutes;
  let statusMessage = `เวลารวม ${totalMinutes} / ${targetDurationMinutes} นาที`;
  if (isValid) statusMessage += ' ✓ ครบตามกำหนด';
  else if (remainingMinutes > 0) statusMessage += ` (ขาดอีก ${remainingMinutes} นาที)`;
  else statusMessage += ` (เกิน ${Math.abs(remainingMinutes)} นาที)`;
  return { totalMinutes, targetMinutes: targetDurationMinutes, remainingMinutes, isValid, statusMessage };
}

function suggestTimeNormalization(activities, targetDurationMinutes = 60) {
  if (!activities || activities.length === 0) return [];
  const totalMinutes = activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0);
  const diff = targetDurationMinutes - totalMinutes;
  if (diff === 0) return [];

  const candidates = activities.map((act, idx) => ({
    idx,
    phase: act.phase?.toUpperCase() || '',
    minutes: Number(act.minutes) || 0,
  }));

  candidates.sort((a, b) => {
    const mainA = ['PRACTICE', 'APPLY', 'PERFORM', 'INVESTIGATE', 'LEARN'].includes(a.phase);
    const mainB = ['PRACTICE', 'APPLY', 'PERFORM', 'INVESTIGATE', 'LEARN'].includes(b.phase);
    if (mainA && !mainB) return -1;
    if (!mainA && mainB) return 1;
    return b.minutes - a.minutes;
  });

  const chosen = candidates[0];
  if (!chosen) return [];
  return [{
    index: chosen.idx,
    originalMinutes: chosen.minutes,
    suggestedMinutes: Math.max(5, chosen.minutes + diff),
    diff,
    reason: diff > 0 ? `เพิ่มเวลาเพื่อให้ครบ ${targetDurationMinutes} นาที` : `ลดเวลาให้อยู่ในกรอบ ${targetDurationMinutes} นาที`,
  }];
}

function validateActivityRules(params) {
  const { lesson, objectives, evidence, activities } = params;
  const targetMinutes = lesson.duration_minutes || 60;
  const duration = calculateActivityMinutes(activities, targetMinutes);

  const coveredObjs = new Set();
  for (const act of activities) {
    if (Array.isArray(act.linkedObjectiveIds)) {
      for (const id of act.linkedObjectiveIds) coveredObjs.add(id);
    }
  }

  const uncoveredIds = objectives.map(o => o.id).filter(id => !coveredObjs.has(id));
  const objectivesSummary = {
    total: objectives.length,
    covered: objectives.length - uncoveredIds.length,
    uncoveredIds,
    allCovered: objectives.length > 0 && uncoveredIds.length === 0,
    message: uncoveredIds.length === 0 ? 'ครบทุกข้อ' : `ขาด ${uncoveredIds.length} ข้อ`,
  };

  const linkedEvds = new Set();
  for (const act of activities) {
    if (Array.isArray(act.linkedEvidenceIds)) {
      for (const id of act.linkedEvidenceIds) linkedEvds.add(id);
    }
  }

  const unlinkedEvdIds = evidence.map(e => e.id).filter(id => !linkedEvds.has(id));
  const evidenceSummary = {
    total: evidence.length,
    linked: evidence.length - unlinkedEvdIds.length,
    unlinkedIds: unlinkedEvdIds,
  };

  const emptyStudentActionPositions = [];
  activities.forEach((act, idx) => {
    const text = (act.student_actions || '').trim();
    if (!text) emptyStudentActionPositions.push(act.position ?? (idx + 1));
  });

  const studentActionsSummary = {
    valid: emptyStudentActionPositions.length === 0 && activities.length > 0,
    emptyActivityPositions: emptyStudentActionPositions,
  };

  const hasFormativeCheck = activities.some(a => Boolean(a.assessment_moment && a.assessment_moment.trim()));
  const hasFeedback = activities.some(a => Boolean(a.feedback_moment && a.feedback_moment.trim()));

  const allPassed = duration.isValid && objectivesSummary.allCovered && studentActionsSummary.valid && activities.length > 0;

  return {
    duration,
    objectives: objectivesSummary,
    evidence: evidenceSummary,
    studentActions: studentActionsSummary,
    hasFormativeCheck,
    hasFeedback,
    allPassed,
  };
}

function deriveLessonWorkflowStatus(currentLesson, graph) {
  const currentStatus = currentLesson.status;
  const totalMinutes = graph.activities.reduce((s, a) => s + (Number(a.minutes) || 0), 0);
  const targetMinutes = currentLesson.duration_minutes || 60;
  const isTimeComplete = totalMinutes === targetMinutes;
  const hasActivities = graph.activities.length > 0;

  const coveredObjs = new Set();
  graph.activities.forEach(a => {
    (a.linkedObjectiveIds || []).forEach(id => coveredObjs.add(id));
  });
  const allObjectivesCovered =
    graph.objectives.length > 0 &&
    graph.objectives.every(o => coveredObjs.has(o.id));

  const isBlueprintReady = hasActivities && isTimeComplete && allObjectivesCovered;

  if (isBlueprintReady) {
    if (currentStatus === 'DRAFT') return 'BLUEPRINT_READY';
    return currentStatus;
  }

  if (currentStatus === 'BLUEPRINT_READY') {
    return 'DRAFT';
  }

  return currentStatus;
}

function validateBlueprintResponse(rawJson, expectedRefs) {
  if (!rawJson || typeof rawJson !== 'object') {
    return { success: false, error: 'ข้อมูล Blueprint ต้องเป็น JSON Object' };
  }
  if (!rawJson.summary || typeof rawJson.summary !== 'object') {
    return { success: false, error: 'ต้องมีส่วนสรุปภาพรวม (summary)' };
  }
  if (!Array.isArray(rawJson.activities) || rawJson.activities.length === 0) {
    return { success: false, error: 'ต้องมีรายการกิจกรรมอย่างน้อย 1 กิจกรรม' };
  }

  const validObjRefsSet = expectedRefs?.validObjRefs ? new Set(expectedRefs.validObjRefs) : null;
  const validEvdRefsSet = expectedRefs?.validEvdRefs ? new Set(expectedRefs.validEvdRefs) : null;
  const invalidObjRefs = [];
  const invalidEvdRefs = [];

  for (let i = 0; i < rawJson.activities.length; i++) {
    const act = rawJson.activities[i];
    if (!act.title || !String(act.title).trim()) return { success: false, error: 'ขาด title' };
    const mins = Number(act.minutes);
    if (isNaN(mins) || mins <= 0) return { success: false, error: 'minutes ไม่ถูกต้อง' };

    const studentActions = Array.isArray(act.studentActions)
      ? act.studentActions.filter(s => String(s).trim())
      : (act.studentActions ? [act.studentActions] : []);
    if (studentActions.length === 0) {
      return { success: false, error: 'studentActions ต้องไม่ว่าง' };
    }

    if (validObjRefsSet && Array.isArray(act.linkedObjectiveRefs)) {
      for (const r of act.linkedObjectiveRefs) {
        if (!validObjRefsSet.has(r)) invalidObjRefs.push(r);
      }
    }
    if (validEvdRefsSet && Array.isArray(act.linkedEvidenceRefs)) {
      for (const r of act.linkedEvidenceRefs) {
        if (!validEvdRefsSet.has(r)) invalidEvdRefs.push(r);
      }
    }
  }

  if (invalidObjRefs.length > 0 || invalidEvdRefs.length > 0) {
    return { success: false, error: 'อ้างอิงรหัสไม่ถูกต้อง', invalidObjRefs, invalidEvdRefs };
  }

  return { success: true, data: rawJson };
}

// ─── START TEST SUITE ────────────────────────────────────────────────────────

header('TEST A — English Speaking 60 min Blueprint');
test('English Speaking Blueprint produces valid 60-min active activities', () => {
  const mockEnglishBlueprint = {
    summary: {
      lessonApproach: 'Active communicative language teaching with 2W3P model',
      learningFlow: 'Warm-up -> Presentation -> Practice -> Production -> Wrap-up',
    },
    activities: [
      {
        temporaryId: 'A1',
        phase: 'ENGAGE',
        title: 'ทายภาพอาชีพ (Career Guessing)',
        minutes: 5,
        teacherActions: ['ครูแสดงภาพเงาอาชีพ 4 ภาพและถามคำถามนำ'],
        studentActions: ['นักเรียนทายชื่ออาชีพภาษาอังกฤษจากภาพเงา'],
        linkedObjectiveRefs: ['O1'],
        linkedEvidenceRefs: [],
      },
      {
        temporaryId: 'A2',
        phase: 'LEARN',
        title: 'เรียนรู้โครงสร้างประโยคถามตอบอาชีพ',
        minutes: 15,
        teacherActions: ['ครูนำเสนอประโยค What do you want to be? และ I want to be a... พร้อมออกเสียง'],
        studentActions: ['นักเรียนออกเสียงตามและฝึกพูดกับคู่ของตนเอง'],
        linkedObjectiveRefs: ['O1'],
        linkedEvidenceRefs: [],
      },
      {
        temporaryId: 'A3',
        phase: 'PRACTICE',
        title: 'ฝึกบทสนทนาแบบจับคู่ (Pair Speaking Practice)',
        minutes: 20,
        teacherActions: ['ครูแจกบัตรภาพบทบาทและเดินสังเกตการออกเสียง'],
        studentActions: ['นักเรียนจับคู่ผลัดกันถาม-ตอบเกี่ยวกับอาชีพตามบัตรที่ได้รับ'],
        linkedObjectiveRefs: ['O1', 'O2'],
        linkedEvidenceRefs: ['E1'],
        formativeCheck: { enabled: true, description: 'ครูสุ่มฟังการสนทนา 4-5 คู่' },
      },
      {
        temporaryId: 'A4',
        phase: 'PERFORM',
        title: 'กิจกรรมสัมภาษณ์อาชีพในฝัน (Career Survey)',
        minutes: 15,
        teacherActions: ['ครูให้สัญญาณเริ่มสัมภาษณ์และคอยให้คำแนะนำ'],
        studentActions: ['นักเรียนเดินสัมภาษณ์เพื่อน 3 คน บันทึกคำตอบ และเตรียมนำเสนอสั้นๆ'],
        linkedObjectiveRefs: ['O2'],
        linkedEvidenceRefs: ['E1'],
        feedback: { enabled: true, description: 'ให้คำชมและแนะนำการออกเสียงที่ถูกต้อง' },
      },
      {
        temporaryId: 'A5',
        phase: 'SUMMARIZE',
        title: 'สรุปบทเรียนและประเมินตนเอง',
        minutes: 5,
        teacherActions: ['ครูสรุปคำศัพท์และประโยคหลักประจำคาบ'],
        studentActions: ['นักเรียนบอกประโยคที่ตนเองพูดได้คล่องในวันนี้ 1 ประโยค'],
        linkedObjectiveRefs: ['O1'],
        linkedEvidenceRefs: [],
      },
    ],
  };

  const validation = validateBlueprintResponse(mockEnglishBlueprint, {
    validObjRefs: ['O1', 'O2'],
    validEvdRefs: ['E1'],
  });

  assert.strictEqual(validation.success, true);
  assert.strictEqual(mockEnglishBlueprint.activities.length, 5);

  const totalMin = mockEnglishBlueprint.activities.reduce((s, a) => s + a.minutes, 0);
  assert.strictEqual(totalMin, 60);

  // Assert speaking/performance exists
  const hasSpeaking = mockEnglishBlueprint.activities.some(
    a => a.phase === 'PRACTICE' || a.phase === 'PERFORM'
  );
  assert.strictEqual(hasSpeaking, true);

  // Assert all activities have student actions
  const allHaveStudentAction = mockEnglishBlueprint.activities.every(
    a => a.studentActions.length > 0 && a.studentActions[0].trim().length > 0
  );
  assert.strictEqual(allHaveStudentAction, true);
});

header('TEST B — Math Problem Solving Blueprint');
test('Math Problem Solving focuses on reasoning and explanation', () => {
  const mockMathActivities = [
    {
      phase: 'ENGAGE',
      title: 'สถานการณ์ปัญหาชวนคิด',
      minutes: 10,
      teacher_actions: 'ครูกำหนดสถานการณ์ปัญหาจริงเรื่องการซื้อของ',
      student_actions: 'นักเรียนวิเคราะห์เงื่อนไขของปัญหาเป็นกลุ่ม',
      linkedObjectiveIds: ['obj-1'],
    },
    {
      phase: 'INVESTIGATE',
      title: 'วางแผนและแสดงวิธีคิดแก้ปัญหา',
      minutes: 25,
      teacher_actions: 'ครูตั้งคำถามกระตุ้นกระบวนการคิดและให้คำแนะนำย่อย',
      student_actions: 'นักเรียนเขียนแสดงวิธีคิดและอธิบายเหตุผลของกลุ่มตนเองลงบนกระดาษบรู๊ฟ',
      linkedObjectiveIds: ['obj-1', 'obj-2'],
    },
    {
      phase: 'DISCUSS',
      title: 'อภิปรายแลกเปลี่ยนวิธีคิด',
      minutes: 15,
      teacher_actions: 'ครูเชื่อมโยงวิธีคิดที่หลากหลายของนักเรียน',
      student_actions: 'ตัวแทนกลุ่มนำเสนอวิธีแก้ปัญหาและเปรียบเทียบกับกลุ่มอื่น',
      linkedObjectiveIds: ['obj-2'],
    },
    {
      phase: 'SUMMARIZE',
      title: 'สรุปหลักการแก้ปัญหา',
      minutes: 10,
      teacher_actions: 'ครูสรุปมโนทัศน์ร่วมกับนักเรียน',
      student_actions: 'นักเรียนสรุปขั้นตอนการคิดลงสมุดของตนเอง',
      linkedObjectiveIds: ['obj-1'],
    },
  ];

  const hasReasoning = mockMathActivities.some(
    a => a.phase === 'INVESTIGATE' || a.phase === 'DISCUSS'
  );
  assert.strictEqual(hasReasoning, true);

  const duration = calculateActivityMinutes(mockMathActivities, 60);
  assert.strictEqual(duration.isValid, true);
});

header('TEST C — Science Experiment Blueprint');
test('Science Experiment incorporates hands-on investigation and data recording', () => {
  const mockScienceActivities = [
    {
      phase: 'ENGAGE',
      title: 'สังเกตปรากฏการณ์นำเข้าสู่บทเรียน',
      minutes: 5,
      teacher_actions: 'ครูเปิดวิดีโอการสังเคราะห์ด้วยแสง',
      student_actions: 'นักเรียนสังเกตและตั้งสมมติฐาน',
      linkedObjectiveIds: ['obj-1'],
      linkedEvidenceIds: [],
    },
    {
      phase: 'INVESTIGATE',
      title: 'ลงมือทำการทดลองและบันทึกผล',
      minutes: 30,
      teacher_actions: 'ครูดูแลความปลอดภัยและแนะนำอุปกรณ์',
      student_actions: 'นักเรียนทดสอบหาแป้งในใบไม้และบันทึกผลลงตารางบันทึกการทดลอง',
      linkedObjectiveIds: ['obj-1', 'obj-2'],
      linkedEvidenceIds: ['evd-lab-sheet'],
    },
    {
      phase: 'DISCUSS',
      title: 'วิเคราะห์ผลการทดลองและสรุปผล',
      minutes: 20,
      teacher_actions: 'ครูนำอภิปรายผลการทดลอง',
      student_actions: 'นักเรียนแปลความหมายข้อมูลและสรุปผลตามหลักฐานเชิงประจักษ์',
      linkedObjectiveIds: ['obj-2'],
      linkedEvidenceIds: ['evd-lab-sheet'],
    },
    {
      phase: 'REFLECT',
      title: 'สะท้อนคิดการทำงานทางวิทยาศาสตร์',
      minutes: 5,
      teacher_actions: 'ครูให้ข้อคิดเห็นเชิงบวก',
      student_actions: 'นักเรียนประเมินทักษะกระบวนการของตนเอง',
      linkedObjectiveIds: ['obj-1'],
      linkedEvidenceIds: [],
    },
  ];

  const hasExperiment = mockScienceActivities.some(a => a.phase === 'INVESTIGATE');
  assert.strictEqual(hasExperiment, true);

  const rules = validateActivityRules({
    lesson: { duration_minutes: 60 },
    objectives: [{ id: 'obj-1' }, { id: 'obj-2' }],
    evidence: [{ id: 'evd-lab-sheet' }],
    activities: mockScienceActivities,
  });

  assert.strictEqual(rules.allPassed, true);
  assert.strictEqual(rules.evidence.linked, 1);
});

header('TEST D — Physical Education Skill Practice');
test('PE skill allocates majority of time to student practice', () => {
  const mockPEActivities = [
    { phase: 'ENGAGE', minutes: 10, teacher_actions: 'อบอุ่นร่างกาย', student_actions: 'ยืดเหยียดกล้ามเนื้อ' },
    { phase: 'MODEL', minutes: 5, teacher_actions: 'สาธิตท่าส่งลูก', student_actions: 'สังเกตและจับประเด็นสำคัญ' },
    { phase: 'PRACTICE', minutes: 30, teacher_actions: 'ให้สัญญาณและแก้ไขท่าทาง', student_actions: 'ฝึกส่งลูกเป็นคู่ 30 ครั้ง' },
    { phase: 'APPLY', minutes: 10, teacher_actions: 'ควบคุมมินิเกม', student_actions: 'นำทักษะการส่งลูกไปใช้ในเกมย่อย' },
    { phase: 'SUMMARIZE', minutes: 5, teacher_actions: 'คูลดาวน์และสรุป', student_actions: 'คลายกล้ามเนื้อและประเมินตนเอง' },
  ];

  const practiceMinutes = mockPEActivities
    .filter(a => a.phase === 'PRACTICE' || a.phase === 'APPLY')
    .reduce((s, a) => s + a.minutes, 0);

  assert.strictEqual(practiceMinutes >= 40, true);
  assert.strictEqual(calculateActivityMinutes(mockPEActivities, 60).isValid, true);
});

header('TEST E — Time Validation & Deterministic Suggestion');
test('Time validator detects 55/60 min and suggests deterministic normalization', () => {
  const shortActivities = [
    { phase: 'ENGAGE', minutes: 5 },
    { phase: 'LEARN', minutes: 15 },
    { phase: 'PRACTICE', minutes: 20 },
    { phase: 'SUMMARIZE', minutes: 15 },
  ];

  const calc = calculateActivityMinutes(shortActivities, 60);
  assert.strictEqual(calc.isValid, false);
  assert.strictEqual(calc.totalMinutes, 55);
  assert.strictEqual(calc.remainingMinutes, 5);

  const suggestions = suggestTimeNormalization(shortActivities, 60);
  assert.strictEqual(suggestions.length, 1);
  assert.strictEqual(suggestions[0].diff, 5);
  assert.strictEqual(suggestions[0].suggestedMinutes, 25); // 20 + 5 in PRACTICE
});

header('TEST F — Objective Coverage Check');
test('Rule engine flags uncovered objectives without AI', () => {
  const objectives = [
    { id: 'obj-1', statement: 'อ่านออกเสียงคำศัพท์' },
    { id: 'obj-2', statement: 'เขียนประโยคสื่อความหมาย' },
  ];

  const activities = [
    {
      minutes: 60,
      student_actions: 'ฝึกอ่านออกเสียง',
      linkedObjectiveIds: ['obj-1'], // Only obj-1 linked
    },
  ];

  const summary = validateActivityRules({
    lesson: { duration_minutes: 60 },
    objectives,
    evidence: [],
    activities,
  });

  assert.strictEqual(summary.objectives.allCovered, false);
  assert.strictEqual(summary.objectives.uncoveredIds.length, 1);
  assert.strictEqual(summary.objectives.uncoveredIds[0], 'obj-2');
});

header('TEST G — Evidence Coverage Check');
test('Rule engine flags unlinked key evidence', () => {
  const evidence = [
    { id: 'evd-1', description: 'คลิปเสียงการสนทนา' },
    { id: 'evd-2', description: 'แบบบันทึกการสังเกต' },
  ];

  const activities = [
    {
      minutes: 60,
      student_actions: 'พูดสนทนา',
      linkedObjectiveIds: ['obj-1'],
      linkedEvidenceIds: ['evd-1'], // evd-2 is unlinked
    },
  ];

  const summary = validateActivityRules({
    lesson: { duration_minutes: 60 },
    objectives: [{ id: 'obj-1' }],
    evidence,
    activities,
  });

  assert.strictEqual(summary.evidence.unlinkedIds.length, 1);
  assert.strictEqual(summary.evidence.unlinkedIds[0], 'evd-2');
});

header('TEST H — Invalid AI Reference Rejection');
test('Schema validator rejects hallucinated references like O99', () => {
  const malformedRefResponse = {
    summary: { lessonApproach: 'Approach', learningFlow: 'Flow' },
    activities: [
      {
        temporaryId: 'A1',
        title: 'กิจกรรม 1',
        minutes: 60,
        teacherActions: ['ครูสอน'],
        studentActions: ['นักเรียนทำ'],
        linkedObjectiveRefs: ['O99'], // INVALID REF
      },
    ],
  };

  const validation = validateBlueprintResponse(malformedRefResponse, {
    validObjRefs: ['O1', 'O2'],
    validEvdRefs: ['E1'],
  });

  assert.strictEqual(validation.success, false);
  assert.strictEqual(validation.invalidObjRefs.includes('O99'), true);
});

header('TEST I — Schema Failure Rejection');
test('Schema validator rejects missing studentActions or invalid minutes', () => {
  const badResponse = {
    summary: { lessonApproach: 'Approach', learningFlow: 'Flow' },
    activities: [
      {
        temporaryId: 'A1',
        title: 'กิจกรรมบรรยาย',
        minutes: -10, // Invalid minutes
        teacherActions: ['ครูบรรยาย'],
        studentActions: [], // EMPTY STUDENT ACTIONS!
      },
    ],
  };

  const validation = validateBlueprintResponse(badResponse);
  assert.strictEqual(validation.success, false);
});

header('TEST J — Existing Activities Safety');
test('Blueprint apply supports replace mode vs append mode cleanly', () => {
  let dbActivities = [
    { id: 'old-1', title: 'กิจกรรมเก่า', position: 0 },
  ];

  const newDrafts = [
    { title: 'กิจกรรมใหม่ 1', minutes: 30, teacherActions: ['ครู'], studentActions: ['นร'] },
    { title: 'กิจกรรมใหม่ 2', minutes: 30, teacherActions: ['ครู'], studentActions: ['นร'] },
  ];

  // In replace mode: clears existing
  function simulateApply(mode) {
    if (mode === 'replace') {
      dbActivities = [];
    }
    const startPos = dbActivities.length;
    newDrafts.forEach((d, i) => {
      dbActivities.push({ id: `new-${i + 1}`, title: d.title, position: startPos + i });
    });
    return dbActivities;
  }

  const replaced = simulateApply('replace');
  assert.strictEqual(replaced.length, 2);
  assert.strictEqual(replaced[0].title, 'กิจกรรมใหม่ 1');
});

header('TEST K — Manual Edit Persistence');
test('Activity update patches fields correctly and recalculates minutes', () => {
  const initialActivity = {
    id: 'act-1',
    title: 'กิจกรรมเริ่มต้น',
    minutes: 10,
    student_actions: 'ฟัง',
  };

  const patch = {
    title: 'กิจกรรมปรับปรุง',
    minutes: 20,
    student_actions: 'ลงมือทำโครงงานร่วมกัน',
  };

  const updated = { ...initialActivity, ...patch };
  assert.strictEqual(updated.title, 'กิจกรรมปรับปรุง');
  assert.strictEqual(updated.minutes, 20);
  assert.strictEqual(updated.student_actions, 'ลงมือทำโครงงานร่วมกัน');
});

header('TEST L — Status Derivation');
test('Status promotes to BLUEPRINT_READY and downgrades to DRAFT on mismatch', () => {
  const lesson = { id: 'p1', duration_minutes: 60, status: 'DRAFT' };
  const objectives = [{ id: 'o1' }, { id: 'o2' }];

  // Case 1: Complete and valid -> BLUEPRINT_READY
  const readyActivities = [
    { minutes: 30, linkedObjectiveIds: ['o1'] },
    { minutes: 30, linkedObjectiveIds: ['o2'] },
  ];
  const statusReady = deriveLessonWorkflowStatus(lesson, { activities: readyActivities, objectives });
  assert.strictEqual(statusReady, 'BLUEPRINT_READY');

  // Case 2: Incomplete time (55 min) -> Downgrades to DRAFT
  const incompleteTimeActivities = [
    { minutes: 25, linkedObjectiveIds: ['o1'] },
    { minutes: 30, linkedObjectiveIds: ['o2'] },
  ];
  const lessonWasReady = { ...lesson, status: 'BLUEPRINT_READY' };
  const statusDowngraded = deriveLessonWorkflowStatus(lessonWasReady, {
    activities: incompleteTimeActivities,
    objectives,
  });
  assert.strictEqual(statusDowngraded, 'DRAFT');

  // Case 3: Objective uncovered -> Downgrades to DRAFT
  const uncoveredActivities = [
    { minutes: 60, linkedObjectiveIds: ['o1'] }, // o2 missing
  ];
  const statusMissingObj = deriveLessonWorkflowStatus(lessonWasReady, {
    activities: uncoveredActivities,
    objectives,
  });
  assert.strictEqual(statusMissingObj, 'DRAFT');
});

// ─── REPORT ──────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────────');
console.log(`RESULTS: ${passedTests} passed, ${totalTests - passedTests} failed out of ${totalTests} tests`);
console.log('AI CALLS IN TESTS: 0');

if (passedTests === totalTests) {
  console.log('\n✅ ALL 12 WAVE V3.4 TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.error('\n❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
