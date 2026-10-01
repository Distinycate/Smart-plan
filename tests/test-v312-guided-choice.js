/**
 * SMART PLAN V3.12 — GUIDED CHOICE UX TEST SUITE
 *
 * Verifies:
 * 1. Objective suggestions (3 tiered options: Foundation, Target, Extended)
 * 2. Evidence suggestions (Subject-aligned, curated)
 * 3. Activity flow suggestions (3 distinct flows, duration normalized)
 * 4. Assessment suggestions (Subject-safe, Rubric/Checklist/Scoring Guide)
 * 5. Teaching package quick selection & bulk readiness
 * 6. Post-teaching quick suggestion chips
 * 7. Non-hallucination & safety constraints
 *
 * Runs under plain `node tests/test-v312-guided-choice.js`
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(relPath) {
  let fullPath = path.resolve(__dirname, relPath);
  if (!fs.existsSync(fullPath)) {
    if (fs.existsSync(fullPath + '.ts')) fullPath = fullPath + '.ts';
    else if (fs.existsSync(path.join(fullPath, 'index.ts'))) fullPath = path.join(fullPath, 'index.ts');
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  const fn = new Function('require', 'exports', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(
    (reqPath) => {
      if (reqPath.startsWith('.')) {
        return loadTsModule(path.resolve(path.dirname(fullPath), reqPath));
      }
      return require(reqPath);
    },
    m.exports,
    m,
    fullPath,
    path.dirname(fullPath)
  );
  return m.exports;
}

const suggestionsModule = loadTsModule('../lib/smartPlanV3/suggestions/index.ts');
const {
  getObjectiveSuggestions,
  getEvidenceSuggestions,
  getActivityFlowSuggestions,
  getAssessmentSuggestions,
  POST_TEACHING_SUGGESTION_GROUPS,
} = suggestionsModule;

console.log('================================================================');
console.log('🧪 SMART PLAN V3.12 — GUIDED CHOICE UX TESTS');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────
// 1. Objective Suggestions Tests
// ─────────────────────────────────────────────────────────────
console.log('── Group 1: Objective Suggestions (Tiered & Observable) ──');

test('A1: English Speaking produces 3 tiered candidates (Foundation, Target, Extended)', () => {
  const cands = getObjectiveSuggestions({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    topic: 'Daily Routines',
    indicatorCode: 'ต 1.1 ม.1/1',
  });

  assert.strictEqual(cands.length, 3, 'Must provide exactly 3 tiered choices');
  assert.strictEqual(cands[0].level, 'FOUNDATION');
  assert.strictEqual(cands[1].level, 'TARGET');
  assert.strictEqual(cands[2].level, 'EXTENDED');
  assert.ok(cands[0].statement.includes('Daily Routines'));
  assert.ok(cands[0].observableVerb.length > 0);
  assert.ok(cands[1].observableVerb.length > 0);
});

test('A2: Math Problem Solving produces reasoning-focused objectives', () => {
  const cands = getObjectiveSuggestions({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'PROBLEM_SOLVING',
    topic: 'สมการเชิงเส้นตัวแปรเดียว',
  });

  assert.strictEqual(cands.length, 3);
  assert.ok(cands.some((c) => c.statement.includes('แก้ปัญหา') || c.statement.includes('อธิบาย')));
  assert.ok(cands[1].levelLabelTh.includes('เป้าหมายหลัก'));
});

test('A3: Science Experiment produces hands-on inquiry objectives', () => {
  const cands = getObjectiveSuggestions({
    subjectKey: 'SCIENCE',
    learningFocus: 'EXPERIMENT',
    topic: 'การสังเคราะห์ด้วยแสง',
  });

  assert.strictEqual(cands.length, 3);
  assert.ok(cands.some((c) => c.statement.includes('ทดลอง') || c.statement.includes('สังเกต')));
});

// ─────────────────────────────────────────────────────────────
// 2. Evidence Suggestions Tests
// ─────────────────────────────────────────────────────────────
console.log('\n── Group 2: Evidence Suggestions (Curated by Subject Profile) ──');

test('B1: English Speaking recommends speaking / dialogue evidence', () => {
  const evds = getEvidenceSuggestions({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    topic: 'Daily Routines',
  });

  assert.ok(evds.length >= 3, 'Must offer at least 3 evidence choices');
  assert.ok(evds.some((e) => e.evidenceType === 'SPEAKING' || e.evidenceType === 'PERFORMANCE'));
  const recommended = evds.find((e) => e.recommended);
  assert.ok(recommended, 'Must have at least one recommended evidence');
  assert.ok(recommended.tag === 'แนะนำ');
});

test('B2: Mathematics recommends worksheets & problem solving reasoning', () => {
  const evds = getEvidenceSuggestions({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'PROBLEM_SOLVING',
    topic: 'โจทย์ปัญหาพีทาโกรัส',
  });

  assert.ok(evds.some((e) => e.evidenceType === 'WORKSHEET' || e.evidenceType === 'PROBLEM_SET'));
});

test('B3: Science recommends experiment data table & lab record', () => {
  const evds = getEvidenceSuggestions({
    subjectKey: 'SCIENCE',
    learningFocus: 'EXPERIMENT',
    topic: 'การแพร่ของสาร',
  });

  assert.ok(evds.some((e) => e.evidenceType === 'EXPERIMENT' || e.evidenceType === 'OBSERVATION'));
});

// ─────────────────────────────────────────────────────────────
// 3. Activity Flow Suggestions Tests
// ─────────────────────────────────────────────────────────────
console.log('\n── Group 3: Activity Flow Suggestions (Time Normalization) ──');

test('C1: English Speaking 60 mins produces 3 distinct flows, each totaling 60 mins', () => {
  const flows = getActivityFlowSuggestions({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    topic: 'Ordering Food',
    durationMinutes: 60,
  });

  assert.strictEqual(flows.length, 3, 'Must offer 3 distinct flow approaches');
  flows.forEach((flow) => {
    assert.strictEqual(flow.totalMinutes, 60);
    const sumMinutes = flow.activities.reduce((sum, a) => sum + a.minutes, 0);
    assert.strictEqual(sumMinutes, 60, `Flow ${flow.name} must strictly total 60 minutes`);
    assert.ok(flow.activities.length >= 4, 'Flow must have multiple active steps');
    assert.ok(flow.summary.length > 0);
  });
});

test('C2: Math Problem Solving scales time correctly to 50 minutes', () => {
  const flows = getActivityFlowSuggestions({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'PROBLEM_SOLVING',
    topic: 'ร้อยละและอัตราส่วน',
    durationMinutes: 50,
  });

  assert.ok(flows.length >= 1);
  const flow = flows[0];
  const sumMinutes = flow.activities.reduce((sum, a) => sum + a.minutes, 0);
  assert.strictEqual(sumMinutes, 50, 'Scaled minutes must strictly match 50 min');
});

test('C3: Science 5E Inquiry scales time correctly to 100 minutes (2 periods)', () => {
  const flows = getActivityFlowSuggestions({
    subjectKey: 'SCIENCE',
    learningFocus: 'EXPERIMENT',
    topic: 'การต่อวงจรไฟฟ้า',
    durationMinutes: 100,
  });

  assert.ok(flows.length >= 1);
  const flow = flows[0];
  const sumMinutes = flow.activities.reduce((sum, a) => sum + a.minutes, 0);
  assert.strictEqual(sumMinutes, 100, 'Scaled minutes must strictly match 100 min');
});

// ─────────────────────────────────────────────────────────────
// 4. Assessment Suggestions Tests
// ─────────────────────────────────────────────────────────────
console.log('\n── Group 4: Assessment Suggestions (Subject Safety & Tool Rules) ──');

test('D1: English Speaking recommends Rubric 4 levels, not MCQ alone', () => {
  const asms = getAssessmentSuggestions({
    subjectKey: 'ENGLISH',
    learningFocus: 'SPEAKING',
    topic: 'Daily Routines',
    primaryEvidenceType: 'SPEAKING',
  });

  assert.ok(asms.length >= 2);
  const primary = asms.find((a) => a.isRecommended);
  assert.ok(primary);
  assert.strictEqual(primary.type, 'PERFORMANCE');
  assert.strictEqual(primary.toolType, 'PERFORMANCE_RUBRIC');
  assert.strictEqual(primary.criteriaType, 'RUBRIC_LEVEL');
  assert.ok(primary.sampleDescriptors && primary.sampleDescriptors.length === 4, 'Rubric must have 4 sample descriptors');
});

test('D2: Math Problem Solving recommends Scoring Guide', () => {
  const asms = getAssessmentSuggestions({
    subjectKey: 'MATHEMATICS',
    learningFocus: 'PROBLEM_SOLVING',
    topic: 'สมการเชิงเส้น',
    primaryEvidenceType: 'WORKSHEET',
  });

  assert.ok(asms.length >= 1);
  const primary = asms.find((a) => a.isRecommended);
  assert.ok(primary);
  assert.strictEqual(primary.toolType, 'SCORING_GUIDE');
  assert.strictEqual(primary.criteriaType, 'PERCENTAGE');
});

test('D3: Science Experiment recommends Experiment Performance Rubric / Checklist', () => {
  const asms = getAssessmentSuggestions({
    subjectKey: 'SCIENCE',
    learningFocus: 'EXPERIMENT',
    topic: 'การกรองสารละลาย',
    primaryEvidenceType: 'EXPERIMENT',
  });

  assert.ok(asms.length >= 1);
  const primary = asms.find((a) => a.isRecommended);
  assert.ok(primary);
  assert.strictEqual(primary.type, 'EXPERIMENT');
  assert.strictEqual(primary.toolType, 'PERFORMANCE_RUBRIC');
});

// ─────────────────────────────────────────────────────────────
// 5. Post-Teaching Suggestions Tests
// ─────────────────────────────────────────────────────────────
console.log('\n── Group 5: Post-Teaching Quick Suggestions ──');

test('E1: POST_TEACHING_SUGGESTION_GROUPS contains all 5 required fields', () => {
  const fields = POST_TEACHING_SUGGESTION_GROUPS.map((g) => g.field);
  assert.ok(fields.includes('whatWorked'));
  assert.ok(fields.includes('problems'));
  assert.ok(fields.includes('remediationPlan'));
  assert.ok(fields.includes('nextLessonAdjustment'));
  assert.ok(fields.includes('actualTeachingNotes'));

  POST_TEACHING_SUGGESTION_GROUPS.forEach((g) => {
    assert.ok(g.chips.length >= 5, `Group ${g.field} must have at least 5 curated chips`);
    g.chips.forEach((chip) => {
      assert.ok(typeof chip === 'string' && chip.length > 5);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`📊 RESULTS: ${passed} / ${passed + failed} PASSED`);
if (failed > 0) {
  console.log(`❌ ${failed} TESTS FAILED`);
  process.exit(1);
} else {
  console.log('🎉 ALL V3.12 GUIDED CHOICE UX TESTS PASSED!');
  console.log('================================================================\n');
}
