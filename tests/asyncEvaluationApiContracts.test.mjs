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
assert.match(retryRoute, /\.in\('status', \['failed', 'failed_rate_limited'\]\)/);
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
assert.match(evaluatorPage, /import PatchProgressPanel/);
assert.match(evaluatorPage, /handleAutoFix/);

// ── Phase 10: Async Patch Pipeline and Safety Contract Assertions ────────────────
const patchCreateRoute = read('app/api/lesson-plans/patch/create/route.ts');
const patchProcessRoute = read('app/api/lesson-plans/patch/process/route.ts');
const patchStatusRoute = read('app/api/lesson-plans/patch/status/[patchJobId]/route.ts');
const patchRetryRoute = read('app/api/lesson-plans/patch/retry/[patchJobId]/route.ts');
const aiRetry = read('lib/ai/ai-retry.ts');
const aiQueue = read('lib/ai/ai-request-queue.ts');
const aiClassifier = read('lib/ai/ai-error-classifier.ts');
const safetyGuard = read('lib/lesson-plan/patch/safety.ts');

assert.match(patchCreateRoute, /\.from\('patch_jobs'\)[\s\S]*\.insert/);
assert.match(patchCreateRoute, /\.from\('patch_job_steps'\)[\s\S]*\.insert/);
assert.match(patchProcessRoute, /\.from\('patch_job_steps'\)[\s\S]*\.update/);
assert.match(patchProcessRoute, /generateAiPatch\(/);
assert.match(patchProcessRoute, /applyPatchBundle\(/);
assert.match(patchProcessRoute, /validatePatchResult\(/);
assert.match(read('lib/lesson-plan/patch/ai-patch-generator.ts'), /validatePatchSafety\(/);
assert.match(patchStatusRoute, /\.from\('patch_jobs'\)[\s\S]*\.select/);

assert.match(patchRetryRoute, /\.from\('patch_job_steps'\)[\s\S]*\.update/);
assert.match(aiRetry, /retryWithBackoff/);
assert.match(aiQueue, /runAIRequestQueued/);
assert.match(aiClassifier, /classifyAIError/);
assert.match(safetyGuard, /validatePatchSafety/);
assert.match(safetyGuard, /isHighRiskPatch/);

// Check admin.ts client uses SUPABASE_SERVICE_ROLE_KEY
const supabaseAdminFile = read('lib/supabase/admin.ts');
assert.match(supabaseAdminFile, /SUPABASE_SERVICE_ROLE_KEY/);

console.log('async evaluation API contract tests passed');



