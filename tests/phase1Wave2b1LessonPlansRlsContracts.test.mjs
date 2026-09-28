import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'database/migrations/14_lessonplans_rls_defense_in_depth.sql'),
  'utf8',
);

const normalized = migration.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').trim();
const policyStatements = new Map(
  [...normalized.matchAll(/CREATE POLICY "([^"]+)" ON public\."LessonPlans" (.*?)\;/g)]
    .map(([, name, statement]) => [name, statement]),
);

assert.match(normalized, /ALTER TABLE public\."LessonPlans" ENABLE ROW LEVEL SECURITY/);
assert.doesNotMatch(normalized, /DISABLE ROW LEVEL SECURITY/);
assert.match(normalized, /Unexpected LessonPlans RLS policies found/);

// The policy set is parsed as named statements so each command's authorization
// contract is checked independently rather than merely finding snippets.
assert.deepEqual([...policyStatements.keys()].sort(), [
  'lessonplans_delete_owner',
  'lessonplans_insert_owner',
  'lessonplans_select_owner_or_admin',
  'lessonplans_update_owner',
]);

const select = policyStatements.get('lessonplans_select_owner_or_admin');
assert.match(select, /FOR SELECT TO authenticated/);
assert.match(select, /USING \(\(SELECT auth\.uid\(\)\) = user_id OR public\.is_admin\(\)\)/);

const insert = policyStatements.get('lessonplans_insert_owner');
assert.match(insert, /FOR INSERT TO authenticated/);
assert.match(insert, /WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/);
assert.doesNotMatch(insert, /is_admin\(\)/);

const update = policyStatements.get('lessonplans_update_owner');
assert.match(update, /FOR UPDATE TO authenticated/);
assert.match(update, /USING \(\(SELECT auth\.uid\(\)\) = user_id\)/);
assert.match(update, /WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/);
assert.doesNotMatch(update, /is_admin\(\)/);

const remove = policyStatements.get('lessonplans_delete_owner');
assert.match(remove, /FOR DELETE TO authenticated/);
assert.match(remove, /USING \(\(SELECT auth\.uid\(\)\) = user_id\)/);
assert.doesNotMatch(remove, /is_admin\(\)/);

for (const statement of policyStatements.values()) {
  assert.doesNotMatch(statement, /USING \(true\)/i);
  assert.doesNotMatch(statement, /auth\.role\(\) = 'authenticated'/i);
}

console.log('Phase 1 Wave 2B.1 LessonPlans RLS migration contract tests passed');
