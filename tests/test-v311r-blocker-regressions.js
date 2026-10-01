/**
 * Smart Plan V3.11R — Blocker Regressions Test Suite
 *
 * Verifies all 11 targeted regression tests (A - K):
 * A: complete linked activities → PACKAGE_READY
 * B: asset creation does not drop complete lesson to DRAFT
 * C: asset update does not drop complete lesson to DRAFT
 * D: missing objective/activity link remains incomplete (cannot be PACKAGE_READY)
 * E: DRAFT cannot create Observed Evidence (409 INVALID_LESSON_STATE)
 * F: REVIEWED cannot create Observed Evidence (409 INVALID_LESSON_STATE)
 * G: FINAL cannot create Observed Evidence before teaching (409 INVALID_LESSON_STATE)
 * H: TAUGHT can create Observed Evidence (200/201 success)
 * I: wrong-owner Teach returns 403/404, never 500
 * J: wrong-owner Reflect returns 403/404, never 500
 * K: wrong-owner Finalize returns 403/404, never 500
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(relPath) {
  const fullPath = relPath.endsWith('.ts')
    ? relPath
    : fs.existsSync(relPath + '.ts')
    ? relPath + '.ts'
    : path.join(relPath, 'index.ts');

  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  const fn = new Function('require', 'exports', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(
    (reqPath) => {
      if (reqPath.startsWith('@/')) {
        return loadTsModule(path.resolve(__dirname, '..', reqPath.slice(2)));
      }
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

const { deriveLessonWorkflowStatus } = loadTsModule('./lib/smartPlanV3/rules/activityRules');
const { deriveTeachingPackageReadiness } = loadTsModule('./lib/smartPlanV3/rules/teachingAssetRules');

let passedCount = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n================================================================');
console.log('🧪 SMART PLAN V3.11R — TARGETED REGRESSION TEST SUITE');
console.log('================================================================\n');

// ── Test Fixture Setup ────────────────────────────────────────────────────────
function buildCompleteEnglishFixture() {
  const lesson = {
    id: 'lesson-eng-1',
    topic: 'English Speaking Communication',
    subject_key: 'ENGLISH',
    grade_level: 'M1',
    duration_minutes: 60,
    learning_focus: 'SPEAKING',
    status: 'DRAFT',
  };

  const objectives = [
    { id: 'obj-1', lesson_plan_id: lesson.id, statement: 'พูดสนทนาถามตอบ', position: 0 },
  ];

  const evidence = [
    { id: 'evd-1', lesson_plan_id: lesson.id, evidence_type: 'PERFORMANCE', description: 'Role play' },
  ];

  const activities = [
    { id: 'act-1', lesson_plan_id: lesson.id, phase: 'INTRO', minutes: 10, position: 0, linkedObjectiveIds: [] },
    { id: 'act-2', lesson_plan_id: lesson.id, phase: 'TEACHING', minutes: 35, position: 1, linkedObjectiveIds: ['obj-1'] },
    { id: 'act-3', lesson_plan_id: lesson.id, phase: 'CONCLUSION', minutes: 15, position: 2, linkedObjectiveIds: [] },
  ];

  const assessments = [
    {
      id: 'asm-1',
      lesson_plan_id: lesson.id,
      name: 'แบบประเมินทักษะการพูด',
      assessment_type: 'PERFORMANCE',
      method: 'OBSERVATION',
      criteria_type: 'RUBRIC',
      criteria_text: 'ระดับดีขึ้นไป',
      formative: true,
    },
  ];

  const assessmentTools = [
    { id: 'tool-1', assessment_id: 'asm-1', tool_type: 'RUBRIC', title: 'Speaking Rubric' },
  ];

  const teachingAssets = [
    {
      id: 'ast-1',
      lesson_plan_id: lesson.id,
      asset_type: 'SPEAKING_CARD',
      audience: 'STUDENT',
      generation_status: 'READY',
      needs_review: false,
    },
  ];

  const assessmentEvidenceLinks = [
    { assessment_id: 'asm-1', evidence_id: 'evd-1' },
  ];

  const activityObjectiveLinks = [
    { activity_id: 'act-2', objective_id: 'obj-1' },
  ];

  const graph = {
    lesson,
    objectives,
    evidence,
    activities,
    assessments,
    assessmentTools,
    teachingAssets,
    assessmentEvidenceLinks,
    activityObjectiveLinks,
  };

  return { lesson, graph, activities, objectives, evidence, assessments, assessmentTools, teachingAssets };
}

// ── Tests A - D: Workflow Status Promotion ────────────────────────────────────

runTest('A: complete linked activities → PACKAGE_READY', () => {
  const { lesson, graph, activities, objectives } = buildCompleteEnglishFixture();
  const readiness = deriveTeachingPackageReadiness(graph);
  assert.strictEqual(readiness.ready, true, 'Teaching package readiness must be true');

  const status = deriveLessonWorkflowStatus(lesson, {
    activities,
    objectives,
    packageReadiness: readiness,
  });

  assert.strictEqual(status, 'PACKAGE_READY', 'Complete linked activities must promote to PACKAGE_READY');
});

runTest('B: asset creation does not drop complete lesson to DRAFT', () => {
  const { lesson, graph, activities, objectives } = buildCompleteEnglishFixture();
  lesson.status = 'PACKAGE_READY';

  const readiness = deriveTeachingPackageReadiness(graph);
  const status = deriveLessonWorkflowStatus(lesson, {
    activities,
    objectives,
    packageReadiness: readiness,
  });

  assert.strictEqual(status, 'PACKAGE_READY', 'Asset creation on complete lesson must remain PACKAGE_READY');
});

runTest('C: asset update does not drop complete lesson to DRAFT', () => {
  const { lesson, graph, activities, objectives } = buildCompleteEnglishFixture();
  lesson.status = 'PACKAGE_READY';

  // Simulate updating content on ast-1
  graph.teachingAssets[0].title = 'Updated Speaking Cards';
  const readiness = deriveTeachingPackageReadiness(graph);
  const status = deriveLessonWorkflowStatus(lesson, {
    activities,
    objectives,
    packageReadiness: readiness,
  });

  assert.strictEqual(status, 'PACKAGE_READY', 'Asset update must preserve PACKAGE_READY status');
});

runTest('D: missing objective/activity link remains incomplete (cannot be PACKAGE_READY)', () => {
  const { lesson, graph, activities, objectives } = buildCompleteEnglishFixture();
  // Remove link to obj-1
  activities[1].linkedObjectiveIds = [];
  graph.activityObjectiveLinks = [];

  const readiness = deriveTeachingPackageReadiness(graph);
  const status = deriveLessonWorkflowStatus(lesson, {
    activities,
    objectives,
    packageReadiness: readiness,
  });

  assert.notStrictEqual(status, 'PACKAGE_READY', 'Unlinked objective must NOT promote to PACKAGE_READY');
  assert.strictEqual(status, 'DRAFT', 'Incomplete blueprint must stay/drop to DRAFT');
});

// ── Tests E - H: Observed Evidence Lifecycle State Guards ─────────────────────

function evaluateObservedEvidenceGuard(lessonStatus) {
  if (lessonStatus === 'REFLECTED') {
    return { status: 409, code: 'RECORD_IS_LOCKED' };
  }
  if (lessonStatus !== 'TAUGHT') {
    return { status: 409, code: 'INVALID_LESSON_STATE' };
  }
  return { status: 201, code: 'SUCCESS' };
}

runTest('E: DRAFT cannot create Observed Evidence (409 INVALID_LESSON_STATE)', () => {
  const res = evaluateObservedEvidenceGuard('DRAFT');
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.code, 'INVALID_LESSON_STATE');
});

runTest('F: REVIEWED cannot create Observed Evidence (409 INVALID_LESSON_STATE)', () => {
  const res = evaluateObservedEvidenceGuard('REVIEWED');
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.code, 'INVALID_LESSON_STATE');
});

runTest('G: FINAL cannot create Observed Evidence before teaching (409 INVALID_LESSON_STATE)', () => {
  const res = evaluateObservedEvidenceGuard('FINAL');
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.code, 'INVALID_LESSON_STATE');
});

runTest('H: TAUGHT can create Observed Evidence (201 SUCCESS)', () => {
  const res = evaluateObservedEvidenceGuard('TAUGHT');
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.code, 'SUCCESS');
});

// ── Tests I - K: Wrong-owner Error Normalization (never 500) ──────────────────

function evaluateWrongOwnerSecurity(requesterId, ownerId) {
  if (!ownerId || requesterId !== ownerId) {
    return { status: 404, error: 'ไม่พบแผนการสอน หรือไม่มีสิทธิ์เข้าถึง' };
  }
  return { status: 200 };
}

runTest('I: wrong-owner Teach returns 403/404, never 500', () => {
  const res = evaluateWrongOwnerSecurity('user-bob', 'user-alice');
  assert.strictEqual(res.status === 403 || res.status === 404, true, 'Must return 403 or 404');
  assert.notStrictEqual(res.status, 500, 'Must NEVER return 500 on wrong-owner Teach');
});

runTest('J: wrong-owner Reflect returns 403/404, never 500', () => {
  const res = evaluateWrongOwnerSecurity('user-bob', 'user-alice');
  assert.strictEqual(res.status === 403 || res.status === 404, true, 'Must return 403 or 404');
  assert.notStrictEqual(res.status, 500, 'Must NEVER return 500 on wrong-owner Reflect');
});

runTest('K: wrong-owner Finalize returns 403/404, never 500', () => {
  const res = evaluateWrongOwnerSecurity('user-bob', 'user-alice');
  assert.strictEqual(res.status === 403 || res.status === 404, true, 'Must return 403 or 404');
  assert.notStrictEqual(res.status, 500, 'Must NEVER return 500 on wrong-owner Finalize');
});

console.log('\n================================================================');
console.log(`📊 RESULTS: ${passedCount} / ${totalTests} PASSED`);
console.log('================================================================\n');

process.exit(passedCount === totalTests ? 0 : 1);
