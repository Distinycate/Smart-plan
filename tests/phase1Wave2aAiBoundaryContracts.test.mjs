import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const boundary = read('lib/ai/canonical-ai-boundary.ts');
const migration = read('database/migrations/13_canonical_ai_request_admission.sql');

for (const route of [
  'app/api/ai-process-core/route.ts',
  'app/api/ai-process-activity/route.ts',
  'app/api/ai-completion-k/route.ts',
  'app/api/ai-completion-p/route.ts',
  'app/api/ai-completion-a/route.ts',
  'app/api/ai-completion-reflection/route.ts',
]) {
  const source = read(route);
  assert.match(source, /beginCanonicalAiRequest/);
  assert.match(source, /isCanonicalAiBoundaryError/);
  assert.match(source, /requestContext\.complete\('complete'\)/);
  assert.match(source, /requestContext\?\.complete\('failed'\)/);
}

assert.match(boundary, /requireUser\(\)/);
assert.match(boundary, /MAX_CANONICAL_AI_BODY_BYTES/);
assert.match(boundary, /CanonicalAiAdmissionProvider/);
assert.match(boundary, /supabaseAdmin\.rpc\('admit_canonical_ai_request'/);
assert.match(boundary, /E_AI_BUSY/);
assert.match(boundary, /E_AI_ADMISSION_UNAVAILABLE/);

assert.doesNotMatch(migration, /\bDELETE\s+FROM\b/i);
assert.doesNotMatch(migration, /\bDROP\s+TABLE\b/i);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /user_limit_reached/);
assert.match(migration, /global_limit_reached/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admit_canonical_ai_request/);

console.log('Phase 1 Wave 2A AI boundary contract tests passed');
