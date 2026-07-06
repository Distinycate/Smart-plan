import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');

const sanitizer = read('lib/lesson-plan/rubric-field-sanitizer.ts');
const aiFixRoute = read('app/api/ai-fix/route.ts');
const plansRoute = read('app/api/plans/route.ts');
const planDetailRoute = read('app/api/plans/[id]/route.ts');
const wordExportRoute = read('app/api/plans/[id]/export/word/route.ts');
const prompt = read('lib/aiEvaluatorPrompt.ts');

assert.match(sanitizer, /sanitizeRubricsOutOfAssessmentTools/);
assert.match(sanitizer, /tool\$\{domain\}/);
assert.match(sanitizer, /rubric\$\{domain\}/);
assert.match(sanitizer, /levels\.size >= 3/);
assert.match(sanitizer, /levels\.has\('5'\) && levels\.has\('1'\)/);

assert.match(aiFixRoute, /sanitizeRubricsOutOfAssessmentTools\(fixedPlanData\)/);
assert.match(plansRoute, /sanitizeRubricsOutOfAssessmentTools\(await req\.json\(\)\)/);
assert.match(planDetailRoute, /sanitizeRubricsOutOfAssessmentTools\(await req\.json\(\)\)/);
assert.match(planDetailRoute, /data: sanitizeRubricsOutOfAssessmentTools\(data\)/);
assert.match(wordExportRoute, /plan = sanitizeRubricsOutOfAssessmentTools\(plan\)/);

assert.match(prompt, /ห้ามนำเกณฑ์ Rubric 5 ระดับไปรวมในช่องเครื่องมือวัดผล/);
assert.match(prompt, /rubricK\/rubricP\/rubricA/);

console.log('Rubric field sanitizer contract tests passed');
