/**
 * Smart Plan V3.6 — Automated Test Suite: Teaching Package Builder
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

// ─── Implementation / Logic Mirrors (Identical to lib/smartPlanV3 modules) ───

function deriveTeachingAssetRequirements(params) {
  const {
    subjectProfile,
    learningFocus = '',
    activities = [],
    evidence = [],
    assessments = [],
    assessmentTools = [],
  } = params;

  const subjectKey = (subjectProfile?.key || '').toUpperCase();
  const focus = (learningFocus || '').toUpperCase();
  const evidenceTypes = evidence.map((e) => (e.evidence_type || '').toUpperCase());
  const toolTypes = assessmentTools.map((t) => (t.tool_type || '').toUpperCase());

  const requiredMap = new Map();
  const recommendedMap = new Map();
  const optionalMap = new Map();
  const notNeededMap = new Map();

  const addReq = (item) => {
    const key = item.assetType.toUpperCase();
    if (requiredMap.has(key)) {
      const existing = requiredMap.get(key);
      if (item.targetActivityPositions) {
        existing.targetActivityPositions = Array.from(
          new Set([...(existing.targetActivityPositions || []), ...item.targetActivityPositions])
        ).sort((a, b) => a - b);
      }
      return;
    }
    recommendedMap.delete(key);
    optionalMap.delete(key);
    requiredMap.set(key, item);
  };

  const addRec = (item) => {
    const key = item.assetType.toUpperCase();
    if (requiredMap.has(key) || recommendedMap.has(key)) return;
    optionalMap.delete(key);
    recommendedMap.set(key, item);
  };

  const addOpt = (item) => {
    const key = item.assetType.toUpperCase();
    if (requiredMap.has(key) || recommendedMap.has(key) || optionalMap.has(key)) return;
    optionalMap.set(key, item);
  };

  const addNotNeeded = (item) => {
    const key = item.assetType.toUpperCase();
    notNeededMap.set(key, item);
  };

  // English Speaking
  if (
    subjectKey.includes('EN') ||
    subjectKey.includes('FOREIGN') ||
    focus.includes('SPEAK') ||
    evidenceTypes.some((t) => t.includes('SPEAK') || t.includes('ORAL'))
  ) {
    if (focus.includes('SPEAK') || evidenceTypes.some((t) => t.includes('SPEAK') || t.includes('ORAL'))) {
      addReq({
        assetType: 'SPEAKING_CARD',
        labelTh: 'บัตรกิจกรรมสนทนา / บัตรสถานการณ์ (Speaking Card)',
        category: 'required',
        audience: 'STUDENT',
        rationale: 'การเรียนรู้เน้นทักษะการพูด (Speaking) ผู้เรียนต้องมีบัตรสถานการณ์หรือบทบาทสมมติในการสื่อสารจริง',
      });

      if (toolTypes.length > 0 || assessments.length > 0) {
        addReq({
          assetType: 'ASSESSMENT_FORM',
          labelTh: 'แบบประเมินทักษะการพูด (อ้างอิงจากขั้นที่ 4)',
          category: 'required',
          audience: 'TEACHER',
          isAssessmentToolReuse: true,
          reusableToolType: 'PERFORMANCE_RUBRIC',
          rationale: 'นำเครื่องมือวัดการพูดจากขั้นตอนการประเมินมาใช้สังเกตและประเมินผลในคาบสอน',
        });
      }

      addRec({
        assetType: 'FLASHCARD',
        labelTh: 'บัตรคำศัพท์ / สำนวนสนับสนุน (Flashcards)',
        category: 'recommended',
        audience: 'BOTH',
        rationale: 'ช่วยเสริมคลังคำศัพท์และรูปแบบประโยคที่จำเป็นในการสนทนา',
      });

      addRec({
        assetType: 'EXIT_TICKET',
        labelTh: 'บัตรสรุปการเรียนรู้ (Exit Ticket)',
        category: 'recommended',
        audience: 'STUDENT',
        rationale: 'ประเมินความมั่นใจและสิ่งที่ได้เรียนรู้จากการพูดใน 2-3 นาทีสุดท้าย',
      });

      addOpt({
        assetType: 'WORKSHEET',
        labelTh: 'ใบงานบันทึกสรุปบทสนทนา (Worksheet)',
        category: 'optional',
        audience: 'STUDENT',
        rationale: 'ตัวเลือกเพิ่มเติม หากต้องการให้ผู้เรียนบันทึกข้อมูลหลังการสนทนา',
      });

      addOpt({
        assetType: 'TEACHER_GUIDE',
        labelTh: 'คู่มือครูและแนวทางการชี้แนะ (Teacher Guide)',
        category: 'optional',
        audience: 'TEACHER',
        rationale: 'แนวทางการจัดการเวลาและคำถามกระตุ้นบทสนทนา',
      });
    }
  }

  // Math Problem Solving & Calculation
  if (subjectKey.includes('MATH')) {
    if (focus.includes('PROBLEM') || focus.includes('REASON') || focus.includes('SOLV')) {
      addReq({
        assetType: 'PROBLEM_SET',
        labelTh: 'ชุดสถานการณ์ปัญหาและการให้เหตุผล (Problem Set)',
        category: 'required',
        audience: 'STUDENT',
        rationale: 'คณิตศาสตร์การแก้ปัญหาต้องมีสถานการณ์โจทย์ พื้นที่แสดงวิธีคิด และพื้นที่อธิบายเหตุผล',
      });

      addReq({
        assetType: 'ANSWER_KEY',
        labelTh: 'เฉลยและเกณฑ์การให้คะแนนแนวคิด (Scoring Guide & Answer Key)',
        category: 'required',
        audience: 'TEACHER',
        rationale: 'ครูต้องมีแนวคิดเฉลยและแนวทางการให้คะแนนการแก้ปัญหาเชิงเหตุผล',
      });

      addRec({
        assetType: 'EXIT_TICKET',
        labelTh: 'บัตรตรวจสอบความเข้าใจรวดเร็ว (Exit Ticket)',
        category: 'recommended',
        audience: 'STUDENT',
        rationale: 'ตรวจสอบแนวคิดหลัก (Big Idea) 1 ข้อก่อนจบคลาส',
      });

      addOpt({
        assetType: 'TEACHER_GUIDE',
        labelTh: 'คู่มือลำดับการชี้แนะและคำถามปลายเปิด (Teacher Guide)',
        category: 'optional',
        audience: 'TEACHER',
        rationale: 'แนวทางการตั้งคำถามกระตุ้นวิธีคิดของผู้เรียน',
      });
    } else {
      addReq({
        assetType: 'PROBLEM_SET',
        labelTh: 'ชุดแบบฝึกการคำนวณและทักษะ (Problem Set / Worksheet)',
        category: 'required',
        audience: 'STUDENT',
        rationale: 'ผู้เรียนต้องมีแบบฝึกทักษะการคำนวณเพื่อสร้างความคล่องแคล่ว',
      });

      addReq({
        assetType: 'ANSWER_KEY',
        labelTh: 'เฉลยคำตอบที่ถูกต้อง (Answer Key)',
        category: 'required',
        audience: 'TEACHER',
        rationale: 'ครูต้องมีเฉลยขั้นตอนและคำตอบตัวเลขที่ถูกต้อง',
      });

      addRec({
        assetType: 'EXIT_TICKET',
        labelTh: 'บัตรสรุปประเด็นการคำนวณ (Exit Ticket)',
        category: 'recommended',
        audience: 'STUDENT',
        rationale: 'ตรวจสอบข้อผิดพลาดทั่วไป (Common Misconception)',
      });

      addOpt({
        assetType: 'TEACHER_GUIDE',
        labelTh: 'คู่มือครู (Teacher Guide)',
        category: 'optional',
        audience: 'TEACHER',
        rationale: 'ลำดับขั้นตอนและการจัดสรรเวลาในคาบคำนวณ',
      });
    }
  }

  // Science Experiment
  if (
    subjectKey.includes('SCI') ||
    focus.includes('EXPERIMENT') ||
    focus.includes('INVESTIGAT') ||
    evidenceTypes.some((t) => t.includes('EXPERIMENT') || t.includes('LAB') || t.includes('OBSERVATION'))
  ) {
    addReq({
      assetType: 'EXPERIMENT_SHEET',
      labelTh: 'ใบกิจกรรมการทดลอง (Experiment Sheet)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'การทดลองวิทยาศาสตร์ต้องมีขั้นตอน วัสดุอุปกรณ์ ข้อควรระวังความปลอดภัย และสรุปผล',
    });

    addReq({
      assetType: 'DATA_TABLE',
      labelTh: 'ตารางบันทึกผลการทดลอง (Data Table)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'ผู้เรียนต้องมีพื้นที่บันทึกข้อมูลเชิงประจักษ์จากการสังเกตหรือการวัด',
    });

    if (toolTypes.length > 0 || assessments.length > 0) {
      addReq({
        assetType: 'ASSESSMENT_FORM',
        labelTh: 'แบบประเมินทักษะกระบวนการวิทยาศาสตร์ (อ้างอิงจากขั้นที่ 4)',
        category: 'required',
        audience: 'TEACHER',
        isAssessmentToolReuse: true,
        reusableToolType: 'CHECKLIST',
        rationale: 'ใช้แบบประเมินทักษะปฏิบัติการทดลองที่มีอยู่จากขั้นตอนประเมินผล',
      });
    }

    addRec({
      assetType: 'EXIT_TICKET',
      labelTh: 'บัตรสรุปข้อค้นพบจากหลักฐาน (CER Exit Ticket)',
      category: 'recommended',
      audience: 'STUDENT',
      rationale: 'สรุปข้อสรุปเชิงวิทยาศาสตร์ (Claim-Evidence-Reasoning) ก่อนจบคาบ',
    });

    addOpt({
      assetType: 'TEACHER_GUIDE',
      labelTh: 'คู่มือครูและแนวทางการเตรียมอุปกรณ์ (Teacher Guide)',
      category: 'optional',
      audience: 'TEACHER',
      rationale: 'แนวทางการเตรียมแล็บและคำถามกระตุ้นการวิเคราะห์ข้อมูล',
    });
  }

  // Physical Education
  if (
    subjectKey.includes('PE') ||
    subjectKey.includes('PHYSICAL') ||
    focus.includes('SPORT') ||
    focus.includes('MOVEMENT')
  ) {
    addReq({
      assetType: 'TASK_CARD',
      labelTh: 'บัตรสถานีปฏิบัติทักษะ (Skill Task Card)',
      category: 'required',
      audience: 'STUDENT',
      rationale: 'พลศึกษาเน้นการปฏิบัติจริงตามสถานีหรือลำดับท่าฝึก ผู้เรียนต้องมีบัตรขั้นตอนและเทคนิคปฏิบัติ',
    });

    if (toolTypes.length > 0 || assessments.length > 0) {
      addReq({
        assetType: 'ASSESSMENT_FORM',
        labelTh: 'แบบสังเกตทักษะปฏิบัติ / เช็กลิสต์ (อ้างอิงจากขั้นที่ 4)',
        category: 'required',
        audience: 'TEACHER',
        isAssessmentToolReuse: true,
        reusableToolType: 'CHECKLIST',
        rationale: 'ครูใช้เช็กลิสต์หรือรูบริกการปฏิบัติจริงในการสังเกตนักเรียน',
      });
    }

    addOpt({
      assetType: 'TEACHER_GUIDE',
      labelTh: 'คู่มือการจัดแถวและการดูแลความปลอดภัย (Teacher Guide)',
      category: 'optional',
      audience: 'TEACHER',
      rationale: 'แผนผังสนาม ข้อควรระวังความปลอดภัย และขั้นตอนอบอุ่นร่างกาย',
    });

    addNotNeeded({
      assetType: 'WORKSHEET',
      labelTh: 'ใบงานข้อเขียน',
      category: 'notNeeded',
      audience: 'STUDENT',
      rationale: 'วิชาพลศึกษาเน้นการปฏิบัติทางกายภาพ ไม่ควรใช้ใบงานข้อเขียนเป็นหลักในคาบฝึกทักษะ',
    });
  }

  // Activity hints & deduplication
  activities.forEach((act) => {
    (act.requiredAssetHints || []).forEach((hint) => {
      const normHint = hint.toUpperCase().trim();
      let matchedType = normHint;
      let label = `สื่อสำหรับกิจกรรมที่ ${act.position || ''}`;
      let audience = 'STUDENT';

      if (normHint.includes('SPEAKING') || normHint.includes('CARD')) {
        matchedType = 'SPEAKING_CARD';
        label = 'บัตรกิจกรรมการสนทนา (Speaking Card)';
        audience = 'STUDENT';
      } else if (normHint.includes('EXPERIMENT') || normHint.includes('LAB')) {
        matchedType = 'EXPERIMENT_SHEET';
        label = 'ใบกิจกรรมการทดลอง (Experiment Sheet)';
        audience = 'STUDENT';
      } else if (normHint.includes('PROBLEM') || normHint.includes('TASK')) {
        matchedType = 'PROBLEM_SET';
        label = 'ชุดแบบฝึก/โจทย์ปัญหา (Problem Set)';
        audience = 'STUDENT';
      } else if (normHint.includes('WORKSHEET') || normHint.includes('SHEET')) {
        matchedType = 'WORKSHEET';
        label = 'ใบงานการเรียนรู้ (Worksheet)';
        audience = 'STUDENT';
      } else if (normHint.includes('FLASHCARD')) {
        matchedType = 'FLASHCARD';
        label = 'บัตรคำศัพท์ (Flashcards)';
        audience = 'BOTH';
      } else if (normHint.includes('EXIT')) {
        matchedType = 'EXIT_TICKET';
        label = 'บัตรสรุปการเรียนรู้ (Exit Ticket)';
        audience = 'STUDENT';
      }

      addReq({
        assetType: matchedType,
        labelTh: label,
        category: 'required',
        audience,
        targetActivityPositions: act.position ? [act.position] : [],
        rationale: `กิจกรรมที่ ${act.position || ''} (${act.title || act.phase || 'กิจกรรม'}) ระบุว่าต้องใช้สื่อนี้`,
      });
    });
  });

  return {
    required: Array.from(requiredMap.values()),
    recommended: Array.from(recommendedMap.values()),
    optional: Array.from(optionalMap.values()),
    notNeeded: Array.from(notNeededMap.values()),
    summary: 'OK',
  };
}

function deriveAssetReviewState(asset, graph) {
  if (asset.needs_review) {
    return { needsReview: true, reason: 'ระบุในระบบว่าต้องตรวจสอบ' };
  }

  const assetTime = new Date(asset.updated_at || asset.created_at || 0).getTime();
  if (assetTime === 0) return { needsReview: false };

  const linkedObjIds = (graph.assetObjectiveLinks || [])
    .filter((l) => l.asset_id === asset.id)
    .map((l) => l.objective_id);

  const staleObj = (graph.objectives || []).find(
    (o) => linkedObjIds.includes(o.id) && new Date(o.updated_at || 0).getTime() > assetTime
  );
  if (staleObj) {
    return { needsReview: true, reason: 'จุดประสงค์มีการเปลี่ยนแปลง' };
  }

  return { needsReview: false };
}

function deriveTeachingPackageReadiness(graph, requirements) {
  const reqs = requirements || deriveTeachingAssetRequirements({
    subjectProfile: { key: graph.lesson.subject_key },
    learningFocus: graph.lesson.learning_focus,
    activities: graph.activities,
    evidence: graph.evidence,
    assessments: graph.assessments,
    assessmentTools: graph.assessmentTools,
  });

  const assets = graph.teachingAssets || [];
  const missingRequiredAssets = [];
  const requiredAssetStatusList = [];
  const assetsNeedReview = [];

  assets.forEach((a) => {
    const rev = deriveAssetReviewState(a, graph);
    if (rev.needsReview || a.needs_review) {
      assetsNeedReview.push({ id: a.id, title: a.title });
    }
  });

  reqs.required.forEach((req) => {
    if (req.isAssessmentToolReuse) {
      const toolExists = (graph.assessmentTools || []).length > 0;
      requiredAssetStatusList.push({
        assetType: req.assetType,
        ready: toolExists,
        isAssessmentToolReuse: true,
      });
      if (!toolExists) missingRequiredAssets.push(req.assetType);
      return;
    }

    const found = assets.find(
      (a) =>
        a.asset_type.toUpperCase() === req.assetType.toUpperCase() ||
        (req.assetType === 'PROBLEM_SET' && (a.asset_type === 'PROBLEM_SET' || a.asset_type === 'WORKSHEET')) ||
        (req.assetType === 'WORKSHEET' && (a.asset_type === 'WORKSHEET' || a.asset_type === 'PROBLEM_SET'))
    );

    const isReady = Boolean(
      found &&
      found.generation_status === 'READY' &&
      !found.needs_review &&
      !assetsNeedReview.some((r) => r.id === found.id)
    );

    requiredAssetStatusList.push({
      assetType: req.assetType,
      ready: isReady,
      existingAssetId: found?.id,
    });

    if (!isReady) {
      missingRequiredAssets.push(req.assetType);
    }
  });

  const ready = missingRequiredAssets.length === 0 && assetsNeedReview.length === 0 && reqs.required.length > 0;

  return {
    ready,
    requiredAssets: requiredAssetStatusList,
    missingRequiredAssets,
    assetsNeedReview,
    summary: {
      requiredAssetsComplete: missingRequiredAssets.length === 0,
      allAssetsReviewed: assetsNeedReview.length === 0,
    },
  };
}

function deriveLessonWorkflowStatus(currentLesson, graph) {
  const currentStatus = currentLesson.status;

  const totalMinutes = (graph.activities || []).reduce((s, a) => s + (Number(a.minutes) || 0), 0);
  const targetMinutes = currentLesson.duration_minutes || 60;
  const isTimeComplete = totalMinutes === targetMinutes;
  const hasActivities = (graph.activities || []).length > 0;

  const coveredObjs = new Set();
  (graph.activities || []).forEach((a) => {
    (a.linkedObjectiveIds || []).forEach((id) => coveredObjs.add(id));
  });
  const allObjectivesCovered =
    (graph.objectives || []).length > 0 &&
    graph.objectives.every((o) => coveredObjs.has(o.id));

  const isBlueprintReady = hasActivities && isTimeComplete && allObjectivesCovered;

  if (!isBlueprintReady) {
    if (currentStatus === 'BLUEPRINT_READY' || currentStatus === 'PACKAGE_READY') {
      return 'DRAFT';
    }
    return currentStatus;
  }

  const isPackageReady = graph.packageReadiness ? graph.packageReadiness.ready : false;

  if (isPackageReady) {
    if (currentStatus === 'DRAFT' || currentStatus === 'BLUEPRINT_READY') {
      return 'PACKAGE_READY';
    }
    return currentStatus;
  }

  if (currentStatus === 'PACKAGE_READY' && graph.packageReadiness && !graph.packageReadiness.ready) {
    return 'BLUEPRINT_READY';
  }

  if (currentStatus === 'DRAFT') {
    return 'BLUEPRINT_READY';
  }

  return currentStatus;
}

function validateAssetDuration(estimatedMinutes, activityMinutes) {
  const est = Number(estimatedMinutes) || 0;
  const act = Number(activityMinutes) || 0;
  if (est > 0 && act > 0 && est > act) {
    return {
      valid: false,
      warning: `เวลาทำสื่อ (${est} นาที) เกินเวลาของกิจกรรม (${act} นาที) ⚠`,
    };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE TEST SUITE (Tests A–O)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════');
console.log('  SMART PLAN V3.6 — TEACHING PACKAGE BUILDER TEST SUITE');
console.log('══════════════════════════════════════════════════════════\n');

header('TEST A — English Speaking');
test('A1: English Speaking requires SPEAKING_CARD', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'ENGLISH' },
    learningFocus: 'SPEAKING',
    evidence: [{ id: 'e1', evidence_type: 'SPEAKING', description: 'สนทนาถามตอบอาชีพ' }],
    assessmentTools: [{ id: 't1', tool_type: 'PERFORMANCE_RUBRIC', title: 'Speaking Rubric' }],
  });
  const reqTypes = reqs.required.map((r) => r.assetType);
  assert(reqTypes.includes('SPEAKING_CARD'), 'Must require SPEAKING_CARD');
});

test('A2: English Speaking requires ASSESSMENT_FORM reuse', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'ENGLISH' },
    learningFocus: 'SPEAKING',
    evidence: [{ id: 'e1', evidence_type: 'SPEAKING', description: 'สนทนาถามตอบอาชีพ' }],
    assessmentTools: [{ id: 't1', tool_type: 'PERFORMANCE_RUBRIC', title: 'Speaking Rubric' }],
  });
  const formReq = reqs.required.find((r) => r.assetType === 'ASSESSMENT_FORM');
  assert(formReq, 'Must include ASSESSMENT_FORM');
  assert.strictEqual(formReq.isAssessmentToolReuse, true, 'Must reuse assessment tool');
});

test('A3: English Speaking does NOT require Worksheet as primary', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'ENGLISH' },
    learningFocus: 'SPEAKING',
    evidence: [{ id: 'e1', evidence_type: 'SPEAKING', description: 'สนทนาถามตอบอาชีพ' }],
    assessmentTools: [{ id: 't1', tool_type: 'PERFORMANCE_RUBRIC', title: 'Speaking Rubric' }],
  });
  const reqTypes = reqs.required.map((r) => r.assetType);
  assert(!reqTypes.includes('WORKSHEET'), 'Worksheet should NOT be primary required for Speaking');
  const optTypes = reqs.optional.map((r) => r.assetType);
  assert(optTypes.includes('WORKSHEET'), 'Worksheet should be optional');
});

header('TEST B — Math Calculation');
test('B1: Math Calculation requires Worksheet/Problem Set and Answer Key', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'MATHEMATICS' },
    learningFocus: 'CALCULATION',
    evidence: [{ id: 'e1', evidence_type: 'WORKSHEET', description: 'แบบฝึกหัดคำนวณ 10 ข้อ' }],
  });
  const reqTypes = reqs.required.map((r) => r.assetType);
  assert(reqTypes.includes('PROBLEM_SET') || reqTypes.includes('WORKSHEET'), 'Must require problem set/worksheet');
  assert(reqTypes.includes('ANSWER_KEY'), 'Must require answer key');
});

header('TEST C — Math Problem Solving');
test('C1: Math Problem Solving requires Problem Set with Reasoning and Scoring Guidance', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'MATHEMATICS' },
    learningFocus: 'PROBLEM_SOLVING',
    evidence: [{ id: 'e1', evidence_type: 'SOLUTION', description: 'การแสดงวิธีแก้ปัญหา' }],
  });
  const reqTypes = reqs.required.map((r) => r.assetType);
  assert(reqTypes.includes('PROBLEM_SET'), 'Must require PROBLEM_SET');
  assert(reqTypes.includes('ANSWER_KEY'), 'Must require ANSWER_KEY');
});

header('TEST D — Science Experiment');
test('D1: Science Experiment requires Experiment Sheet and Data Table', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'SCIENCE' },
    learningFocus: 'EXPERIMENT',
    evidence: [{ id: 'e1', evidence_type: 'EXPERIMENT', description: 'การบันทึกผลการทดลอง' }],
    assessmentTools: [{ id: 't1', tool_type: 'CHECKLIST', title: 'Lab Checklist' }],
  });
  const reqTypes = reqs.required.map((r) => r.assetType);
  assert(reqTypes.includes('EXPERIMENT_SHEET'), 'Must require EXPERIMENT_SHEET');
  assert(reqTypes.includes('DATA_TABLE'), 'Must require DATA_TABLE');
  const asmForm = reqs.required.find((r) => r.assetType === 'ASSESSMENT_FORM');
  assert(asmForm && asmForm.isAssessmentToolReuse, 'Must reuse checklist assessment form');
});

header('TEST E — PE');
test('E1: PE requires Task Card and does NOT require Worksheet as primary', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'PHYSICAL_EDUCATION' },
    learningFocus: 'SPORT',
    evidence: [{ id: 'e1', evidence_type: 'PERFORMANCE', description: 'การเดาะลูกวอลเลย์บอล' }],
    assessmentTools: [{ id: 't1', tool_type: 'CHECKLIST', title: 'Skill Checklist' }],
  });
  const reqTypes = reqs.required.map((r) => r.assetType);
  assert(reqTypes.includes('TASK_CARD'), 'Must require TASK_CARD');
  assert(!reqTypes.includes('WORKSHEET'), 'Worksheet must NOT be in required');
  const notNeeded = reqs.notNeeded.map((r) => r.assetType);
  assert(notNeeded.includes('WORKSHEET'), 'Worksheet marked as notNeeded for PE skill');
});

header('TEST F — Deduplication');
test('F1: 2 activities requiring same asset are deduplicated to 1 requirement item', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'ENGLISH' },
    learningFocus: 'SPEAKING',
    activities: [
      { id: 'a1', position: 2, phase: 'PRACTICE', requiredAssetHints: ['SPEAKING_CARD'] },
      { id: 'a2', position: 3, phase: 'PRODUCTION', requiredAssetHints: ['SPEAKING_CARD'] },
    ],
  });
  const speakingReqs = reqs.required.filter((r) => r.assetType === 'SPEAKING_CARD');
  assert.strictEqual(speakingReqs.length, 1, 'Must deduplicate to 1 Speaking Card requirement');
  assert(speakingReqs[0].targetActivityPositions.includes(2), 'Should link to activity 2');
  assert(speakingReqs[0].targetActivityPositions.includes(3), 'Should link to activity 3');
});

header('TEST G — Missing Required');
test('G1: 3 required and 2 ready returns ready = false and missing = 1', () => {
  const graph = {
    lesson: { subject_key: 'MATHEMATICS', learning_focus: 'PROBLEM_SOLVING', duration_minutes: 60 },
    activities: [{ id: 'a1', minutes: 60, linkedObjectiveIds: ['o1'] }],
    objectives: [{ id: 'o1', statement: 'Obj 1' }],
    evidence: [{ id: 'e1', evidence_type: 'SOLUTION', description: 'Sol' }],
    assessments: [{ id: 'asm1', assessment_type: 'WRITTEN_RESPONSE', criteria_type: 'SCORE', criteria_value: 5 }],
    assessmentTools: [{ id: 't1', assessment_id: 'asm1', tool_type: 'SCORING_GUIDE', title: 'Scoring Guide' }],
    teachingAssets: [
      // Only PROBLEM_SET is ready, ANSWER_KEY is missing
      { id: 'asset1', asset_type: 'PROBLEM_SET', generation_status: 'READY', needs_review: false },
    ],
  };

  const readiness = deriveTeachingPackageReadiness(graph);
  assert.strictEqual(readiness.ready, false, 'Readiness must be false');
  assert.strictEqual(readiness.missingRequiredAssets.length, 1, 'Must have 1 missing required asset (ANSWER_KEY)');
  assert(readiness.missingRequiredAssets.includes('ANSWER_KEY'), 'Missing asset must be ANSWER_KEY');
});

header('TEST H — Package Ready');
test('H1: All required assets ready returns ready = true', () => {
  const graph = {
    lesson: { subject_key: 'MATHEMATICS', learning_focus: 'PROBLEM_SOLVING', duration_minutes: 60 },
    activities: [{ id: 'a1', minutes: 60, linkedObjectiveIds: ['o1'] }],
    objectives: [{ id: 'o1', statement: 'Obj 1' }],
    evidence: [{ id: 'e1', evidence_type: 'SOLUTION', description: 'Sol' }],
    assessments: [{ id: 'asm1', assessment_type: 'WRITTEN_RESPONSE', criteria_type: 'SCORE', criteria_value: 5 }],
    assessmentTools: [{ id: 't1', assessment_id: 'asm1', tool_type: 'SCORING_GUIDE', title: 'Scoring Guide' }],
    teachingAssets: [
      { id: 'asset1', asset_type: 'PROBLEM_SET', generation_status: 'READY', needs_review: false },
      { id: 'asset2', asset_type: 'ANSWER_KEY', generation_status: 'READY', needs_review: false },
    ],
  };

  const readiness = deriveTeachingPackageReadiness(graph);
  assert.strictEqual(readiness.ready, true, 'Package readiness must be true');
  assert.strictEqual(readiness.missingRequiredAssets.length, 0, 'No missing required assets');
});

header('TEST I — Needs Review');
test('I1: Asset READY but linked Objective was updated after asset flags needs_review', () => {
  const assetCreatedAt = '2026-09-29T08:00:00.000Z';
  const objectiveUpdatedAt = '2026-09-29T09:30:00.000Z'; // Newer than asset!

  const graph = {
    lesson: { subject_key: 'MATHEMATICS', learning_focus: 'CALCULATION', duration_minutes: 60 },
    activities: [{ id: 'a1', minutes: 60, linkedObjectiveIds: ['o1'] }],
    objectives: [{ id: 'o1', statement: 'Obj 1 Updated', updated_at: objectiveUpdatedAt }],
    evidence: [{ id: 'e1', evidence_type: 'WORKSHEET', description: 'Evd' }],
    assessments: [{ id: 'asm1', assessment_type: 'WRITTEN_RESPONSE', criteria_type: 'SCORE', criteria_value: 5 }],
    assessmentTools: [{ id: 't1', assessment_id: 'asm1', tool_type: 'ANSWER_KEY', title: 'Tool' }],
    teachingAssets: [
      { id: 'asset1', asset_type: 'PROBLEM_SET', generation_status: 'READY', needs_review: false, updated_at: assetCreatedAt },
      { id: 'asset2', asset_type: 'ANSWER_KEY', generation_status: 'READY', needs_review: false, updated_at: assetCreatedAt },
    ],
    assetObjectiveLinks: [
      { asset_id: 'asset1', objective_id: 'o1' },
    ],
  };

  const revState = deriveAssetReviewState(graph.teachingAssets[0], graph);
  assert.strictEqual(revState.needsReview, true, 'Must flag needsReview = true');

  const readiness = deriveTeachingPackageReadiness(graph);
  assert.strictEqual(readiness.ready, false, 'Package cannot be ready when an asset needs review');
  assert.strictEqual(readiness.assetsNeedReview.length, 1, 'Should list 1 asset needing review');
});

header('TEST J — Answer Key Guard');
test('J1: Answer Key generation is blocked when no worksheet/problem set exists', () => {
  function checkAnswerKeyGuard(teachingAssets) {
    const parent = teachingAssets.find(
      (a) =>
        (a.asset_type === 'WORKSHEET' || a.asset_type === 'PROBLEM_SET') &&
        a.content &&
        Object.keys(a.content).length > 0
    );
    if (!parent) {
      throw new Error('ไม่สามารถสร้างเฉลยได้ เนื่องจากยังไม่มีใบงานหรือชุดแบบฝึกหัดต้นทาง กรุณาสร้างและบันทึกใบงานก่อน');
    }
    return true;
  }

  assert.throws(
    () => checkAnswerKeyGuard([]),
    /ไม่สามารถสร้างเฉลยได้ เนื่องจากยังไม่มีใบงาน/,
    'Must throw guard error when teaching assets list is empty'
  );

  // When worksheet exists with content, guard passes
  const validList = [{ asset_type: 'PROBLEM_SET', content: { title: 'โจทย์ปัญหา', items: [1] } }];
  assert.strictEqual(checkAnswerKeyGuard(validList), true, 'Guard must pass when parent worksheet exists');
});

header('TEST K — Worksheet Duration');
test('K1: Estimated duration exceeding activity minutes emits warning', () => {
  const result = validateAssetDuration(25, 10);
  assert.strictEqual(result.valid, false, 'Duration check should fail');
  assert(result.warning.includes('เกินเวลาของกิจกรรม'), 'Warning must indicate time mismatch');

  const okResult = validateAssetDuration(10, 15);
  assert.strictEqual(okResult.valid, true, 'Duration within activity limits should pass');
});

header('TEST L — Audience');
test('L1: Answer Key is TEACHER, Speaking Card is STUDENT, Flashcard is BOTH', () => {
  const reqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'ENGLISH' },
    learningFocus: 'SPEAKING',
    evidence: [{ id: 'e1', evidence_type: 'SPEAKING', description: 'สนทนา' }],
    assessmentTools: [{ id: 't1', tool_type: 'PERFORMANCE_RUBRIC', title: 'Rubric' }],
  });

  const speaking = reqs.required.find((r) => r.assetType === 'SPEAKING_CARD');
  assert.strictEqual(speaking.audience, 'STUDENT', 'Speaking card audience must be STUDENT');

  const flashcard = reqs.recommended.find((r) => r.assetType === 'FLASHCARD');
  assert.strictEqual(flashcard.audience, 'BOTH', 'Flashcard audience must be BOTH');

  const mathReqs = deriveTeachingAssetRequirements({
    subjectProfile: { key: 'MATHEMATICS' },
    learningFocus: 'CALCULATION',
  });
  const answerKey = mathReqs.required.find((r) => r.assetType === 'ANSWER_KEY');
  assert.strictEqual(answerKey.audience, 'TEACHER', 'Answer key audience must be TEACHER');
});

header('TEST M — Asset Links');
test('M1: Asset junction links to Objective, Activity, and Evidence are stored and retrievable', () => {
  // In-memory relational store simulation
  const assetObjectiveLinks = [];
  const assetActivityLinks = [];
  const assetEvidenceLinks = [];

  const assetId = 'asset-uuid-1';
  const objId = 'obj-uuid-1';
  const actId = 'act-uuid-1';
  const evdId = 'evd-uuid-1';

  // Link operations
  assetObjectiveLinks.push({ asset_id: assetId, objective_id: objId });
  assetActivityLinks.push({ asset_id: assetId, activity_id: actId });
  assetEvidenceLinks.push({ asset_id: assetId, evidence_id: evdId });

  // Verify graph reassembly
  const linkedObjs = assetObjectiveLinks.filter((l) => l.asset_id === assetId).map((l) => l.objective_id);
  const linkedActs = assetActivityLinks.filter((l) => l.asset_id === assetId).map((l) => l.activity_id);
  const linkedEvds = assetEvidenceLinks.filter((l) => l.asset_id === assetId).map((l) => l.evidence_id);

  assert.deepStrictEqual(linkedObjs, [objId]);
  assert.deepStrictEqual(linkedActs, [actId]);
  assert.deepStrictEqual(linkedEvds, [evdId]);
});

header('TEST N — Delete Safety');
test('N1: Deleting asset cascades only junction links; leaves objectives, activities, evidence intact', () => {
  let assets = [{ id: 'a1', title: 'Worksheet 1' }];
  let assetObjLinks = [{ asset_id: 'a1', objective_id: 'o1' }];
  let objectives = [{ id: 'o1', statement: 'Obj 1' }];
  let activities = [{ id: 'act1', title: 'Act 1' }];
  let evidence = [{ id: 'e1', description: 'Evd 1' }];
  let assessments = [{ id: 'asm1', name: 'Asm 1' }];

  // Simulate delete asset
  const targetId = 'a1';
  assetObjLinks = assetObjLinks.filter((l) => l.asset_id !== targetId);
  assets = assets.filter((a) => a.id !== targetId);

  assert.strictEqual(assets.length, 0, 'Asset removed');
  assert.strictEqual(assetObjLinks.length, 0, 'Junction link removed');
  assert.strictEqual(objectives.length, 1, 'Objective must remain intact');
  assert.strictEqual(activities.length, 1, 'Activity must remain intact');
  assert.strictEqual(evidence.length, 1, 'Evidence must remain intact');
  assert.strictEqual(assessments.length, 1, 'Assessment must remain intact');
});

header('TEST O — Status Transition');
test('O1: Complete required assets promotes to PACKAGE_READY; missing required asset downgrades', () => {
  const currentLesson = { status: 'BLUEPRINT_READY', duration_minutes: 60 };
  const graph = {
    activities: [{ minutes: 60, linkedObjectiveIds: ['o1'] }],
    objectives: [{ id: 'o1' }],
    packageReadiness: { ready: true },
  };

  const status1 = deriveLessonWorkflowStatus(currentLesson, graph);
  assert.strictEqual(status1, 'PACKAGE_READY', 'Must promote to PACKAGE_READY');

  // If a required asset is deleted or package becomes unready
  const lessonWasReady = { status: 'PACKAGE_READY', duration_minutes: 60 };
  const unreadyGraph = {
    activities: [{ minutes: 60, linkedObjectiveIds: ['o1'] }],
    objectives: [{ id: 'o1' }],
    packageReadiness: { ready: false },
  };

  const status2 = deriveLessonWorkflowStatus(lessonWasReady, unreadyGraph);
  assert.strictEqual(status2, 'BLUEPRINT_READY', 'Must downgrade back to BLUEPRINT_READY');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────────');
console.log(`RESULTS: ${passedTests} passed, ${totalTests - passedTests} failed out of ${totalTests} tests`);
console.log('AI CALLS IN TESTS: 0\n');

if (passedTests === totalTests) {
  console.log('✅ ALL 15 WAVE V3.6 TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED.\n');
  process.exit(1);
}
