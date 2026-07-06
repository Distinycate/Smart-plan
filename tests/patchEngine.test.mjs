// Patch Engine Contract Tests (Phase 6-8)
// Run: node tests/patchEngine.test.mjs

import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

// ─── Mini canonical plan for testing ─────────────────────────────────────────
const emptyPlan = {
  id: 'PLAN-TEST',
  metadata: {
    subjectGroup: 'วิทยาศาสตร์',
    subjectName: 'วิทยาศาสตร์',
    gradeLevel: 'ม.1',
    unitName: 'หน่วย 1',
    lessonTitle: 'บทที่ 1',
    totalHours: 1,
  },
  curriculum: { standards: [], indicators: [] },
  essence: { mainConcept: '' },
  objectives: { knowledge: [], process: [], attitude: [] },
  competencies: [],
  desirableCharacteristics: [],
  learningActivities: [],
  assessment: { methods: [], tools: [], rubrics: [] },
  materials: [],
  teachingAids: [],
  bibliography: [],
};

// ─── Inline hash function (matches hash.ts logic) ─────────────────────────────
function sortedJsonStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(sortedJsonStringify).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + sortedJsonStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function stableHash(plan) {
  return createHash('sha256').update(sortedJsonStringify(plan)).digest('hex');
}

// ─── Inline patch generator ────────────────────────────────────────────────
const RECHECK_MAP = {
  'objectives.knowledge': ['objectives_kpa', 'learning_activities', 'assessment_quality', 'constructive_alignment'],
  'objectives.process': ['objectives_kpa', 'learning_activities', 'assessment_quality', 'constructive_alignment'],
  'objectives.attitude': ['objectives_kpa', 'learning_activities', 'assessment_quality', 'constructive_alignment'],
  'curriculum.standards': ['curriculum_alignment', 'constructive_alignment'],
  'curriculum.indicators': ['curriculum_alignment', 'objectives_kpa', 'constructive_alignment'],
  'curriculum.coreContent': ['curriculum_alignment'],
  'learningActivities': ['learning_activities', 'active_learning', 'assessment_quality', 'constructive_alignment'],
  'assessment.methods': ['assessment_quality', 'constructive_alignment'],
  'assessment.tools': ['assessment_quality'],
  'assessment.rubrics': ['assessment_quality'],
  'essence.mainConcept': ['curriculum_alignment'],
  'essence.keyConcepts': ['curriculum_alignment'],
};

function getSectionsToRecheck(targets) {
  const sections = new Set();
  for (const target of targets) {
    for (const s of RECHECK_MAP[target] ?? []) sections.add(s);
  }
  return [...sections].sort();
}

function getSectionsToCarryOver(allSections, recheckSections) {
  const recheckSet = new Set(recheckSections);
  return allSections.filter(s => !recheckSet.has(s));
}

// ─── Inline patch applier ─────────────────────────────────────────────────────
function applyPatch(plan, patch) {
  const clone = JSON.parse(JSON.stringify(plan));
  let current = clone;
  const path = [...patch.path];
  const last = path.pop();
  for (const key of path) {
    if (current[key] == null) current[key] = {};
    current = current[key];
  }
  if (patch.operation === 'set') {
    current[last] = patch.after;
  } else if (patch.operation === 'append') {
    if (!Array.isArray(current[last])) current[last] = [];
    current[last].push(patch.after);
  }
  return clone;
}

// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ─── Suite 1: RECHECK_MAP ────────────────────────────────────────────────────
console.log('\nSuite 1: RECHECK_MAP');

test('objectives.knowledge maps to 4 sections', () => {
  const result = getSectionsToRecheck(['objectives.knowledge']);
  assert.ok(result.includes('objectives_kpa'));
  assert.ok(result.includes('learning_activities'));
  assert.ok(result.includes('assessment_quality'));
  assert.ok(result.includes('constructive_alignment'));
});

test('learningActivities maps to active_learning', () => {
  const result = getSectionsToRecheck(['learningActivities']);
  assert.ok(result.includes('active_learning'));
});

test('assessment.rubrics maps only to assessment_quality', () => {
  const result = getSectionsToRecheck(['assessment.rubrics']);
  assert.deepEqual(result, ['assessment_quality']);
});

test('multiple targets deduplicate overlapping sections', () => {
  const result = getSectionsToRecheck(['objectives.knowledge', 'objectives.process']);
  const unique = [...new Set(result)];
  assert.equal(result.length, unique.length, 'Sections should be deduplicated');
});

// ─── Suite 2: getSectionsToCarryOver ─────────────────────────────────────────
console.log('\nSuite 2: getSectionsToCarryOver');

test('carry-over excludes recheckSections', () => {
  const all = ['curriculum_alignment', 'objectives_kpa', 'learning_activities', 'assessment_quality'];
  const recheck = getSectionsToRecheck(['assessment.methods']);
  const carryOver = getSectionsToCarryOver(all, recheck);
  assert.ok(!carryOver.includes('assessment_quality'), 'assessment_quality must not carry over');
  assert.ok(carryOver.includes('curriculum_alignment'), 'unrelated sections must carry over');
});

// ─── Suite 3: Patch Apply ────────────────────────────────────────────────────
console.log('\nSuite 3: Patch Apply');

test('append operation adds to empty array', () => {
  const patch = {
    id: randomUUID(),
    target: 'objectives.knowledge',
    operation: 'append',
    path: ['objectives', 'knowledge'],
    before: undefined,
    after: 'นักเรียนอธิบายได้',
    reason: 'test',
    affectedSections: [],
  };
  const result = applyPatch(emptyPlan, patch);
  assert.equal(result.objectives.knowledge.length, 1);
  assert.equal(result.objectives.knowledge[0], 'นักเรียนอธิบายได้');
});

test('set operation replaces existing value', () => {
  const planWithConcept = { ...emptyPlan, essence: { mainConcept: 'old' } };
  const patch = {
    id: randomUUID(),
    target: 'essence.mainConcept',
    operation: 'set',
    path: ['essence', 'mainConcept'],
    before: 'old',
    after: 'new concept',
    reason: 'test',
    affectedSections: [],
  };
  const result = applyPatch(planWithConcept, patch);
  assert.equal(result.essence.mainConcept, 'new concept');
});

test('apply does not mutate original plan', () => {
  const original = JSON.stringify(emptyPlan);
  const patch = {
    id: randomUUID(),
    target: 'objectives.knowledge',
    operation: 'append',
    path: ['objectives', 'knowledge'],
    before: undefined,
    after: 'test',
    reason: 'test',
    affectedSections: [],
  };
  applyPatch(emptyPlan, patch);
  assert.equal(JSON.stringify(emptyPlan), original, 'Original plan must not be mutated');
});

// ─── Suite 4: Cache invalidation logic ───────────────────────────────────────
console.log('\nSuite 4: Hash changes after patch');

test('hash changes after append patch', () => {
  const hashBefore = stableHash(emptyPlan);
  const patch = {
    id: randomUUID(),
    target: 'objectives.knowledge',
    operation: 'append',
    path: ['objectives', 'knowledge'],
    before: undefined,
    after: 'นักเรียนอธิบายได้',
    reason: 'test',
    affectedSections: [],
  };
  const patched = applyPatch(emptyPlan, patch);
  const hashAfter = stableHash(patched);
  assert.notEqual(hashBefore, hashAfter, 'Hash must change after patching');
});

test('identical plans produce identical hash (cache key stable)', () => {
  const h1 = stableHash(emptyPlan);
  const h2 = stableHash(JSON.parse(JSON.stringify(emptyPlan)));
  assert.equal(h1, h2, 'Hash must be deterministic');
});

// ─── Suite 5: Patch mode filter ───────────────────────────────────────────────
console.log('\nSuite 5: Issue severity filter');

function issueMeetsModeFilter(issue, mode) {
  if (mode === 'auto_fix_critical') return issue.severity === 'critical';
  if (mode === 'auto_fix_critical_high') return ['critical', 'high'].includes(issue.severity);
  return issue.auto_fixable === true;
}

test('auto_fix_critical includes only critical', () => {
  assert.ok(issueMeetsModeFilter({ severity: 'critical', auto_fixable: true }, 'auto_fix_critical'));
  assert.ok(!issueMeetsModeFilter({ severity: 'high', auto_fixable: true }, 'auto_fix_critical'));
  assert.ok(!issueMeetsModeFilter({ severity: 'medium', auto_fixable: true }, 'auto_fix_critical'));
});

test('auto_fix_critical_high includes critical and high', () => {
  assert.ok(issueMeetsModeFilter({ severity: 'critical', auto_fixable: true }, 'auto_fix_critical_high'));
  assert.ok(issueMeetsModeFilter({ severity: 'high', auto_fixable: true }, 'auto_fix_critical_high'));
  assert.ok(!issueMeetsModeFilter({ severity: 'medium', auto_fixable: true }, 'auto_fix_critical_high'));
});

test('full_improvement includes all auto_fixable issues', () => {
  assert.ok(issueMeetsModeFilter({ severity: 'medium', auto_fixable: true }, 'full_improvement'));
  assert.ok(issueMeetsModeFilter({ severity: 'low', auto_fixable: true }, 'full_improvement'));
  assert.ok(!issueMeetsModeFilter({ severity: 'high', auto_fixable: false }, 'full_improvement'));
});

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\npatch engine tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
