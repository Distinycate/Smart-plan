import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { localRuntime } from '../../../scripts/english/local-guard.mjs';
const runtime = localRuntime();
const accounts = JSON.parse(readFileSync('.emh-local/accounts.json', 'utf8'));
const db = createClient(runtime.status.API_URL, runtime.status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const proof: Record<string, unknown> = { target: 'isolated-real-local-supabase', startedAt: new Date().toISOString() };
async function login(page: Page, name = 'learner') {
  await page.goto('/login');
  await expect(page.getByLabel('Local testing environment')).toBeVisible();
  await page.getByLabel('อีเมล (Email)').fill(accounts[name].email);
  await page.getByLabel('รหัสผ่าน (Password)').fill(accounts[name].password);
  await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await page.waitForURL('**/profile');
  await page.getByRole('link', { name: 'English Mastery', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your learning path' })).toBeVisible();
}
test('real Auth, lesson completion, practice scoring and PostgreSQL persistence', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Open unit', exact: true }).click();
  await page.getByRole('button', { name: 'Mark lesson complete' }).first().click();
  await expect(page.getByRole('status')).toContainText('Lesson completion saved');
  await page.getByRole('button', { name: 'Practise V05-Q-A1-02-001', exact: true }).click();
  await page.getByLabel('Your response', { exact: true }).fill('Goodbye');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.reload();
  await expect(page.getByLabel('Your response', { exact: true })).toHaveValue('Goodbye');
  await page.getByRole('button', { name: 'Submit final response' }).click();
  await expect(page.getByText('SCORED · Score 0')).toBeVisible();
  const { data, error } = await db.from('emh_attempts').select('id,data').eq('owner_id', accounts.learner.id);
  expect(error).toBeNull();
  const scored = data!.find(r => r.data.status === 'SUBMITTED' && r.data.result?.status === 'SCORED');
  // Persist IDs for the independent stop/start volume verification.
  expect(data!.some(r => JSON.stringify(r.data).includes('Goodbye'))).toBe(true);
  proof.practiceAttempt = scored?.id || data!.find(r => JSON.stringify(r.data).includes('Goodbye'))!.id;
});
test('real writing autosave/history and final submission stay stored and locked', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Writing', exact: true }).click();
  await page.getByRole('button', { name: 'Start Writing', exact: true }).click();
  await page.getByLabel('Plan your response').fill('SYNTHETIC LOCAL TEST: name and home.');
  const writing = 'My name is Mina. I am from Thailand. This is synthetic local test data.';
  await page.getByLabel('Your response', { exact: true }).fill(writing);
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.reload();
  await expect(page.getByLabel('Your response', { exact: true })).toHaveValue(writing);
  await page.getByRole('button', { name: 'Show saved writing history' }).click();
  await expect(page.getByText('Saved ', { exact: false }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Submit final response' }).click();
  await expect(page.getByText('PENDING_HUMAN', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your response', { exact: true })).toBeDisabled();
  const { data, error } = await db.from('emh_writing_versions').select('id,data').eq('owner_id', accounts.learner.id);
  expect(error).toBeNull();
  expect(data!.some(r => JSON.stringify(r.data).includes(writing))).toBe(true);
  proof.writingVersion = data!.find(r => JSON.stringify(r.data).includes(writing))!.id;
});
test('real private Storage upload, signed playback, direct access denial and owner delete', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Speaking', exact: true }).click();
  await page.getByRole('button', { name: 'Start Speaking', exact: true }).click();
  await page.getByRole('checkbox').check();
  const bytes = Buffer.alloc(16044);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(16000, 40);
  await page.getByLabel('Or choose an audio file').setInputFiles({ name: 'synthetic-silence.wav', mimeType: 'audio/wav', buffer: bytes });
  await page.getByRole('button', { name: 'Upload private recording' }).click();
  await expect(page.getByText('Private recording saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play saved recording' }).click();
  await expect(page.locator('audio')).toHaveAttribute('src', /^http:\/\/127\.0\.0\.1:55321\/storage\/v1\/object\/sign\//);
  const signed = await page.locator('audio').getAttribute('src');
  expect(signed).toMatch(/^http:\/\/127\.0\.0\.1:55321\/storage\/v1\/object\/sign\//);
  const response = await fetch(signed!);
  expect(response.ok).toBe(true); expect((await response.arrayBuffer()).byteLength).toBe(bytes.length);
  const { data: records } = await db.from('emh_recordings').select('id,data').eq('owner_id', accounts.learner.id);
  const active = records!.find(r => r.data.status !== 'DELETED' && signed!.includes(r.data.objectPath))!;
  expect(active).toBeTruthy();
  for (const name of ['learner', 'other']) {
    const client = createClient(runtime.status.API_URL, runtime.status.ANON_KEY, { auth: { persistSession: false } });
    expect((await client.auth.signInWithPassword(accounts[name])).error).toBeNull();
    expect((await client.storage.from('emh-learner-recordings').download(active.data.objectPath)).error).toBeTruthy();
  }
  await page.getByRole('button', { name: 'Submit final response' }).click();
  await expect(page.getByText('PENDING_HUMAN', { exact: true })).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete my recording' }).click();
  await expect(page.getByText('Recording deleted.', { exact: true })).toBeVisible();
  expect((await db.storage.from('emh-learner-recordings').download(active.data.objectPath)).error).toBeTruthy();
  proof.deletedRecording = active.id;
});
test('real JWT access control and no fabricated publication/review', async ({ page }) => {
  await login(page);
  const denied = await page.request.post('/api/english/publish', {
    headers: { Origin: 'http://127.0.0.1:3190', 'Sec-Fetch-Site': 'same-origin' },
    data: { versionId: 'UNIT-A1-02-PILOT@0.6.0' },
  });
  expect(denied.status()).toBe(403);
  expect(await denied.json()).toMatchObject({ error: 'PERMISSION_DENIED' });
  const other = createClient(runtime.status.API_URL, runtime.status.ANON_KEY, { auth: { persistSession: false } });
  expect((await other.auth.signInWithPassword(accounts.other)).error).toBeNull();
  const ownRows = await other.from('emh_attempts').select('id').eq('owner_id', accounts.learner.id);
  expect(ownRows.data || []).toEqual([]);
  expect((await other.rpc('emh_commit', { changes: [] })).error).toBeTruthy();
  expect((await db.from('emh_publications').select('id')).data).toEqual([]);
  expect((await db.from('emh_reviews').select('id')).data).toEqual([]);
  await page.screenshot({ path: '.emh-local/local-ready.png', fullPage: true });
  proof.completedAt = new Date().toISOString();
  writeFileSync('.emh-local/real-service-proof.json', JSON.stringify(proof, null, 2), { mode: 0o600 });
});
