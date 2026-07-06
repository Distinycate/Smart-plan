import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const createRoute = read('app/api/evaluations/create/route.ts');
const processRoute = read('app/api/evaluations/process/route.ts');
const statusRoute = read('app/api/evaluations/status/[jobId]/route.ts');
const resultRoute = read('app/api/evaluations/result/[jobId]/route.ts');
const retryRoute = read('app/api/evaluations/retry/[jobId]/route.ts');
const evaluatorPage = read('app/evaluator/page.tsx');

assert.match(createRoute, /status = !validation\.ready[\s\S]*'lesson_plan_not_ready'/);
assert.match(createRoute, /\.from\('evaluation_cache'\)/);
assert.match(createRoute, /\.from\('evaluation_jobs'\)/);
assert.match(createRoute, /\.from\('evaluation_results'\)/);
assert.doesNotMatch(createRoute, /evaluateSection\(/);

assert.match(processRoute, /\.eq\('status', 'pending'\)[\s\S]*\.select\('\*'\)/);
assert.match(processRoute, /evaluateSection\(/);
assert.match(processRoute, /aggregateScore\(sectionResults\)/);
assert.match(processRoute, /\.from\('evaluation_cache'\)\.upsert/);
assert.match(processRoute, /export const maxDuration = 60/);

for (const route of [statusRoute, resultRoute, retryRoute]) {
  assert.match(route, /getOwnedJob\(params\.jobId, user\.id\)/);
}
assert.match(retryRoute, /\.eq\('status', 'failed'\)/);
assert.match(retryRoute, /status: 'pending'/);

assert.match(evaluatorPage, /fetch\('\/api\/evaluations\/create'/);
assert.match(evaluatorPage, /fetch\('\/api\/evaluations\/process'/);
assert.match(evaluatorPage, /\/api\/evaluations\/result\/\$\{jobId\}/);
assert.doesNotMatch(
  evaluatorPage.slice(
    evaluatorPage.indexOf('const evaluateWithJob'),
    evaluatorPage.indexOf('const startEvaluation')
  ),
  /\/api\/evaluation-jobs\/process-section/
);

// ── Phase 6-9 Contract Assertions ──────────────────────────────────────────
const patchRoute = read('app/api/lesson-plans/patch/route.ts');
const cacheStatusRoute = read('app/api/evaluations/cache-status/route.ts');
const invalidateCacheRoute = read('app/api/evaluations/invalidate-cache/route.ts');

// Check patch route contract
assert.match(patchRoute, /generatePatches\(/);
assert.match(patchRoute, /applyPatchBundle\(/);
assert.match(patchRoute, /validatePatchResult\(/);
assert.match(patchRoute, /getSectionsToRecheck\(/);
assert.match(patchRoute, /\.from\('lesson_plan_versions'\)[\s\S]*\.insert/);
assert.match(patchRoute, /\.from\('lesson_plan_patches'\)[\s\S]*\.insert/);
assert.match(patchRoute, /\.from\('evaluation_jobs'\)[\s\S]*\.insert/);

// Check cache routes contract
assert.match(cacheStatusRoute, /\.from\('evaluation_cache'\)[\s\S]*\.select/);
assert.match(invalidateCacheRoute, /\.from\('evaluation_cache'\)[\s\S]*\.delete/);

// Check evaluator page component imports
assert.match(evaluatorPage, /import EvaluationModeSelector/);
assert.match(evaluatorPage, /import EvaluationProgressPanel/);
assert.match(evaluatorPage, /import EvaluationResultDashboard/);
assert.match(evaluatorPage, /handleAutoFix/);

console.log('async evaluation API contract tests passed');


