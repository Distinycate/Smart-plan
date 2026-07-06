import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const planForm = read('app/plan/PlanForm.tsx');
const evaluatorPage = read('app/evaluator/page.tsx');
const fixRoute = read('app/api/ai-fix/route.ts');
const evaluationTransport = read('lib/lesson-plan/evaluation/ai-evaluator.ts');
const patchTransport = read('lib/lesson-plan/patch/ai-patch-generator.ts');
const processRoute = read('app/api/evaluations/process/route.ts');
const retryRoute = read('app/api/evaluations/retry/[jobId]/route.ts');

assert.match(
  planForm,
  /Promise\.allSettled\(\[\s*callAiPart\('\/api\/ai-process-core'[\s\S]*callAiPart\('\/api\/ai-process-activity'/
);
assert.match(fixRoute, /GEMINI_FIX_MODEL/);
assert.match(fixRoute, /gemini-2\.5-flash-lite/);
assert.match(fixRoute, /fastJsonGenerationConfig\(8_192\)/);
assert.match(fixRoute, /compactFeedback\.slice\(0, 8_000\)/);

assert.match(evaluatorPage, /Math\.min\(2, pendingSections\.length\)/);
assert.doesNotMatch(evaluationTransport, /runAIRequestQueued|retryWithBackoff/);
assert.doesNotMatch(patchTransport, /runAIRequestQueued|retryWithBackoff/);
assert.doesNotMatch(processRoute, /failed_rate_limited|error_type|last_retry_at/);
assert.doesNotMatch(retryRoute, /failed_rate_limited|error_type|last_retry_at/);

console.log('AI workflow latency contract tests passed');
