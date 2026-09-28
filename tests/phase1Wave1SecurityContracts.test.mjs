import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');

const migration = read('database/migrations/12_security_identity_authorization_foundation.sql');
const authorization = read('lib/auth/authorization.ts');
const middleware = read('utils/supabase/middleware.ts');

// SEC-001: no data-destructive profile remediation and no public role write path.
assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.is_admin\(\)/);
assert.match(migration, /DROP POLICY IF EXISTS "Public profiles are viewable by everyone\."/);
assert.match(migration, /REVOKE UPDATE ON TABLE public\.profiles FROM anon, authenticated/);
assert.match(migration, /GRANT UPDATE \(full_name, gender, age, subject_group, grade_levels\)/);
assert.doesNotMatch(migration, /GRANT UPDATE \([^)]*\brole\b/i);

// SEC-002/004: every future API should use server-derived identity and a named
// ownership primitive rather than trusting client-provided identity fields.
for (const helper of [
  'requireUser',
  'requireAdmin',
  'requirePlanOwner',
  'requireUnitPlanOwner',
  'requireEvaluationOwner',
  'requirePatchOwner',
]) {
  assert.match(authorization, new RegExp(`function ${helper}\\(`));
}
assert.match(authorization, /supabase\.auth\.getUser\(\)/);
assert.match(authorization, /Never derive identity from request/);

// SEC-003: protected pages must no longer be hidden behind a disabled guard.
assert.doesNotMatch(middleware, /if \(false &&/);
assert.match(middleware, /const isPublicPage = isAuthRoute \|\| isLandingPage/);
assert.match(middleware, /if \(!user && !isPublicPage\)/);

console.log('Phase 1 Wave 1 security contract tests passed');
