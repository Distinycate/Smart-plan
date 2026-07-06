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

console.log('async evaluation API contract tests passed');
