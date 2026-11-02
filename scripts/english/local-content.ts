import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { localRuntime } from './local-guard.mjs';
import { importPackages, loadPackages } from '../../lib/english-mastery/content';
import { SupabaseRepository, ensure } from '../../lib/english-mastery/repository';
import { hash } from '../../lib/english-mastery/policy';

async function main() {
  const runtime = localRuntime();
  const accounts = JSON.parse(readFileSync(path.join(runtime.state, 'accounts.json'), 'utf8'));
  const repo = new SupabaseRepository(createClient(runtime.status.API_URL, runtime.status.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }));
  // Importing content must not rewrite any existing attempt, review or publication.
  const preserved = ['content_versions', 'attempts', 'writing_versions', 'reviews', 'publications'] as const;
  const before = new Map<string, string>();
  for (const table of preserved) for (const row of await repo.list(table)) before.set(`${table}/${row.id}`, hash(row));
  const result = await importPackages(repo, accounts.author.id, false);
  for (const table of preserved) for (const row of await repo.list(table)) {
    const old = before.get(`${table}/${row.id}`);
    if (old) { ensure(old === hash(row), 'EXISTING_LOCAL_DATA_CHANGED'); before.delete(`${table}/${row.id}`); }
  }
  ensure(before.size === 0, 'EXISTING_LOCAL_DATA_MISSING');
  for (const p of await loadPackages()) {
    const row = await repo.get('content_versions', p.id);
    ensure(row && row.data.checksum === p.checksum && hash(row.data.payload) === p.checksum, 'LOCAL_CONTENT_MISMATCH');
  }
  const report = { ...result, target: 'isolated-real-local-supabase',
    verifiedAt: new Date().toISOString(), preservedExistingData: true, sourceChecksumsVerified: true };
  writeFileSync(path.join(runtime.state, 'content-import-proof.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.code || error.message || 'LOCAL_CONTENT_FAILED'); process.exitCode = 1; });
