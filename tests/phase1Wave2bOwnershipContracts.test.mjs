import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const authorization = read('lib/auth/authorization.ts');
const planRoute = read('app/api/plans/[id]/route.ts');
const restoreRoute = read('app/api/plans/[id]/restore/route.ts');
const pdfRoute = read('app/api/plans/[id]/export/pdf/route.ts');
const wordRoute = read('app/api/plans/[id]/export/word/route.ts');
const unitRoute = read('app/api/unit-plans/[id]/route.ts');
const unitLessonsRoute = read('app/api/unit-plans/[id]/lessons/route.ts');
const unitLessonRoute = read('app/api/unit-plans/[id]/lessons/[lessonId]/route.ts');
const unitReorderRoute = read('app/api/unit-plans/[id]/lessons/reorder/route.ts');
const unitExportLoader = read('lib/unitPlanExportData.ts');

// Admin can read another plan only. All mutations and document disclosures are owner-only.
assert.match(authorization, /function requirePlanReader/);
assert.match(authorization, /function requirePlanOwner/);
assert.match(authorization, /context\.plan\.user_id !== context\.user\.id/);
assert.match(planRoute, /requirePlanReader\(id\)/);
assert.equal((planRoute.match(/requirePlanOwner\(id\)/g) || []).length, 2);

for (const source of [restoreRoute, pdfRoute, wordRoute]) {
  assert.match(source, /requirePlanOwner\(id\)/);
  assert.match(source, /isAuthorizationError/);
}
assert.doesNotMatch(restoreRoute, /import \{ supabase \} from '@\/lib\/supabase'/);
assert.doesNotMatch(pdfRoute, /import \{ supabase \} from '@\/lib\/supabase'/);
assert.doesNotMatch(wordRoute, /import \{ supabase \} from '@\/lib\/supabase'/);

// Nested UnitLesson requests must authorize the parent and verify the actual child FK.
assert.match(authorization, /function requireUnitPlanOwner/);
assert.match(authorization, /function requireUnitLessonOwner/);
assert.match(authorization, /data\.unitPlanId !== context\.unitPlan\.unitPlanId/);
assert.match(authorization, /data\.user_id !== context\.user\.id/);
assert.match(unitRoute, /requireUnitPlanOwner\(params\.id\)/);
assert.equal((unitLessonsRoute.match(/requireUnitPlanOwner\(params\.id\)/g) || []).length, 2);
assert.equal((unitLessonRoute.match(/requireUnitLessonOwner\(params\.id, params\.lessonId\)/g) || []).length, 2);
assert.match(unitReorderRoute, /requireUnitPlanOwner\(params\.id\)/);
assert.match(unitExportLoader, /requireUnitPlanOwner\(unitPlanId\)/);

// Service-role work occurs only after the explicit authorization call in write routes.
assert.ok(restoreRoute.indexOf('requirePlanOwner(id)') < restoreRoute.indexOf('getSupabaseAdmin()'));
assert.ok(pdfRoute.indexOf('requirePlanOwner(id)') < pdfRoute.indexOf('getSupabaseAdmin().from'));

console.log('Phase 1 Wave 2B ownership contract tests passed');
