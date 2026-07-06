import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const aRoute = read('app/api/ai-completion-a/route.ts');
const reflectionRoute = read('app/api/ai-completion-reflection/route.ts');
const planForm = read('app/plan/PlanForm.tsx');
const dashboard = read('components/evaluator/EvaluationResultDashboard.tsx');

assert.match(
  aRoute,
  /required: \["measureA", "methodA", "toolA", "criteriaA", "rubricA"\]/
);
assert.match(aRoute, /const normalizedData = \{/);

assert.match(
  reflectionRoute,
  /required: \["resultK", "resultP", "resultA", "problems", "solutions"\]/
);
for (const field of ['resultA', 'problems', 'solutions']) {
  assert.match(reflectionRoute, new RegExp(`${field}: String\\(parsedData\\.${field}`));
  assert.match(
    planForm,
    new RegExp(`aiReflect\\.${field}\\)[\\s\\S]{0,100}FALLBACK_TEMPLATES\\.Reflection\\.${field}`)
  );
}

assert.match(dashboard, /Array\.isArray\(result\.issues\)/);
assert.match(dashboard, /Array\.isArray\(result\.issues\?\.ordered\)/);
assert.match(dashboard, /Array\.isArray\(section\.evidence_found\)/);
assert.match(dashboard, /Array\.isArray\(section\.suggestions\)/);

console.log('Phase 2 and evaluation UI regression tests passed');
