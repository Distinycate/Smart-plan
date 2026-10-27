import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { localRuntime } from './local-guard.mjs';
import { chromium, expect } from '@playwright/test';
async function main() {
  const r = localRuntime();
  const accounts = JSON.parse(readFileSync('.emh-local/accounts.json', 'utf8'));
  const proof = JSON.parse(readFileSync('.emh-local/real-service-proof.json', 'utf8'));
  const db = createClient(r.status.API_URL, r.status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (const [table, id] of [['emh_attempts', proof.practiceAttempt], ['emh_writing_versions', proof.writingVersion], ['emh_recordings', proof.deletedRecording]]) {
    if (!id) throw Error('REAL_BROWSER_PROOF_REQUIRED');
    const result = await db.from(table).select('id').eq('id', id).single();
    if (result.error || !result.data) throw Error(`PERSISTENCE_FAILED:${table}`);
  }
  const client = createClient(r.status.API_URL, r.status.ANON_KEY, { auth: { persistSession: false } });
  if ((await client.auth.signInWithPassword(accounts.learner)).error) throw Error('AUTH_PERSISTENCE_FAILED');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3190/login');
    await expect(page.getByLabel('Local testing environment')).toBeVisible();
    await page.getByLabel('อีเมล (Email)').fill(accounts.learner.email);
    await page.getByLabel('รหัสผ่าน (Password)').fill(accounts.learner.password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await page.waitForURL('**/profile');
    await page.goto('http://127.0.0.1:3190/english');
    await expect(page.getByRole('heading', { name: 'Your learning path' })).toBeVisible();
    await expect(page.locator(`a[href="/english/sessions/${proof.practiceAttempt}"]`)).toBeVisible();
    await page.screenshot({ path: '.emh-local/after-restart.png', fullPage: true });
  } finally { await browser.close(); }
  proof.restartVerifiedAt = new Date().toISOString();
  writeFileSync('.emh-local/real-service-proof.json', JSON.stringify(proof, null, 2), { mode: 0o600 });
  console.log('Confirmed after restart: browser login, previous attempt, writing history and recording deletion persisted.');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
