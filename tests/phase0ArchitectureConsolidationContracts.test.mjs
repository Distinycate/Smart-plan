import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const registry = read('lib/architecture/canonical-flow-registry.ts');
const legacyContract = read('lib/lesson-plan/legacy-contract.ts');
const patchProcess = read('app/api/lesson-plans/patch/process/route.ts');
const directPatch = read('app/api/lesson-plans/patch/route.ts');
const patchStatus = read('app/api/lesson-plans/patch/status/[patchJobId]/route.ts');
const patchPanel = read('components/evaluator/PatchProgressPanel.tsx');

assert.match(registry, /ai-process-core/);
assert.match(registry, /ai-process-activity/);
assert.match(registry, /api\/evaluations\/create/);
assert.match(registry, /automaticLessonPlanWriteAllowed: false/);
assert.match(legacyContract, /LEGACY_TO_CANONICAL_LESSON_PLAN_MAP/);
assert.match(legacyContract, /CANONICAL_WRITE_POLICY/);
assert.match(legacyContract, /automaticLegacyWriteAllowed: false/);

for (const route of [patchProcess, directPatch]) {
  assert.doesNotMatch(route, /\.from\('LessonPlans'\)\s*\.update/);
}
assert.match(patchProcess, /applied: false/);
assert.match(patchProcess, /review_required/);
assert.match(directPatch, /previewOnly: true/);
assert.match(directPatch, /requiresTeacherReview: true/);
assert.match(patchStatus, /proposals/);
assert.match(patchPanel, /แผนต้นฉบับจะไม่ถูกแก้ไข/);

console.log('Phase 0 architecture consolidation contract tests passed');
