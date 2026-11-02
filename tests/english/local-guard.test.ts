import test from 'node:test';
import assert from 'node:assert/strict';
import { requireLocalStatus, requireLoopbackListeners } from '../../scripts/english/local-guard.mjs';
test('real local setup rejects cloud, forwarded and wrong-port database targets', () => {
  const status = { API_URL: 'http://127.0.0.1:55321', DB_URL: 'postgresql://postgres:test@127.0.0.1:55322/postgres', SERVICE_ROLE_KEY: 'test', ANON_KEY: 'test' };
  assert.equal(requireLocalStatus(status), status);
  for (const API_URL of ['https://example.supabase.co', 'http://localhost:55321', 'http://127.0.0.1:54321'])
    assert.throws(() => requireLocalStatus({ ...status, API_URL }), /LOCAL_API_REQUIRED/);
  for (const DB_URL of ['postgresql://postgres:test@cloud.example:55322/postgres', 'postgresql://postgres:test@127.0.0.1:54322/postgres', 'postgresql://postgres:test@127.0.0.1:55322/main'])
    assert.throws(() => requireLocalStatus({ ...status, DB_URL }), /LOCAL_DATABASE_REQUIRED/);
});
test('local initialization rejects wildcard or missing host listeners', () => {
  requireLoopbackListeners('ssh 1 user TCP 127.0.0.1:55321 (LISTEN)', [55321]);
  for (const text of ['', 'ssh 1 user TCP *:55321 (LISTEN)', 'ssh 1 user TCP 0.0.0.0:55321 (LISTEN)'])
    assert.throws(() => requireLoopbackListeners(text, [55321]), /LOOPBACK_LISTENER_REQUIRED/);
});
