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
  await page.getByRole('link', { name: /English Mastery$/ }).click();
  await expect(page.getByRole('heading', { name: 'Your learning path' })).toBeVisible();
  await page.getByText('More ways to practise', { exact: true }).click();
}
test('real Auth, lesson completion, practice scoring and PostgreSQL persistence', async ({ page }) => {
  await login(page);
  await page.locator('.emh-unit-card a[href="/english/units/A1-02"]').click();
  await expect(page.getByRole('button', { name: /(?:Mark lesson complete|Lesson completed)$/ })).toBeVisible();
  const markComplete = page.getByRole('button', { name: 'Mark lesson complete' });
  if (await markComplete.count()) { await markComplete.click(); await expect(page.getByRole('status')).toContainText('Lesson completion saved'); }
  else await expect(page.getByRole('button', { name: 'Lesson completed', exact: false })).toBeDisabled();
  await page.getByRole('button', { name: /Practise V05\-Q\-A1\-02\-001$/ }).click();
  await page.getByLabel(/Your response$/).fill('Goodbye');
  await page.getByRole('button', { name: 'Save now' }).click();
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.reload();
  await expect(page.getByLabel(/Your response$/)).toHaveValue('Goodbye');
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
  await page.getByRole('link', { name: /Writing$/ }).click();
  await page.locator('article').filter({ hasText: 'A1-02' }).getByRole('button', { name: /Start Writing$/ }).click();
  await page.getByLabel('Plan your response').fill('SYNTHETIC LOCAL TEST: name and home.');
  const writing = 'My name is Mina. I am from Thailand. This is synthetic local test data.';
  await page.getByLabel(/Your response$/).fill(writing);
  await expect(page.getByRole('status')).toContainText('Saved');
  await page.reload();
  await expect(page.getByLabel(/Your response$/)).toHaveValue(writing);
  await page.getByRole('button', { name: 'Show saved writing history' }).click();
  await expect(page.getByText('Saved ', { exact: false }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Submit final response' }).click();
  await expect(page.getByText('PENDING_HUMAN', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/Your response$/)).toBeDisabled();
  const { data, error } = await db.from('emh_writing_versions').select('id,data').eq('owner_id', accounts.learner.id);
  expect(error).toBeNull();
  expect(data!.some(r => JSON.stringify(r.data).includes(writing))).toBe(true);
  proof.writingVersion = data!.find(r => JSON.stringify(r.data).includes(writing))!.id;
});
test('real private Storage upload, signed playback, direct access denial and owner delete', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: /Speaking$/ }).click();
  await page.locator('article').filter({ hasText: 'A1-02' }).getByRole('button', { name: /Start Speaking$/ }).click();
  await page.getByRole('checkbox').check();
  const bytes = Buffer.alloc(16044);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(16000, 40);
  await page.getByLabel('Or choose an audio file').setInputFiles({ name: 'synthetic-silence.wav', mimeType: 'audio/wav', buffer: bytes });
  await page.getByRole('button', { name: 'Upload private recording' }).click();
  await expect(page.getByText(/Private recording saved$/)).toBeVisible();
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
  await expect(page.getByText(/Recording deleted\.$/).first()).toBeVisible();
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

test('all 96 units resolve to full content; six levels render and a new unit scores', async ({ page }) => {
  await login(page, 'author');
  const results = await page.evaluate(async () => {
    const call = async (op: string, body: unknown) => {
      const response = await fetch(`/api/english/${op}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw Error(`${op}: ${response.status}`);
      return (await response.json()).data;
    };
    const catalog = await call('catalog', {});
    const counts = [];
    for (const unit of catalog.units) {
      const content = await call('content', { unitId: unit.id });
      counts.push({ id: unit.id, available: unit.available, lessons: content.lessons.length,
        practice: content.practice.length, tasks: content.tasks.length, preview: content.preview });
    }
    return counts;
  });
  expect(results).toHaveLength(96);
  expect(results.every(r => r.available && r.preview && r.lessons >= 3 && r.practice >= 20 && r.tasks === 4)).toBe(true);
  for (const id of ['A1-01','A2-01','B1-01','B2-02','C1-01','C2-16']) {
    await page.goto(`/english/units/${id}`);
    await expect(page.getByText(new RegExp(`^${id} ·`)).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'ขั้นตอนบทเรียน / Lesson steps' }).getByRole('link')).toHaveCount(4);
    await expect(page.getByText('Reading A', { exact: false }).first()).toBeVisible();
  }
  await page.goto('/english/units/A1-01');
  await page.getByRole('button', { name: /Practise Q\-A1\-01\-001$/ }).click();
  const p = JSON.parse(readFileSync('content/english-mastery/course/A1-01.json', 'utf8'));
  await page.getByLabel(/Your response$/).fill(p.practice[0].acceptedAnswers[0]);
  await page.getByRole('button', { name: 'Submit final response' }).click();
  await expect(page.getByText('SCORED · Score 1')).toBeVisible();
  writeFileSync('.emh-local/course-browser-proof.json', JSON.stringify({
    verifiedAt: new Date().toISOString(), target: 'isolated-real-local-supabase',
    units: results, renderedLevels: 6, newUnitScoring: 'PASS', productionChanged: false,
  }, null, 2), { mode: 0o600 });
});

test('Thai-first self-study persists completion and saves before navigation on real local services', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await login(page);
  await page.getByText('More ways to practise', { exact: true }).click();
  await page.getByLabel(/CEFR learning level/).selectOption('A1');
  await page.getByLabel(/Search units/).fill('อาหาร');
  await expect(page.locator('.emh-unit-card')).toHaveCount(1);
  await expect(page.locator('.emh-unit-card')).toContainText('Food & Drink');
  await page.getByLabel(/Search units/).fill('');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.emh-local/learning-desktop.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 375);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.emh-local/learning-mobile.png' });
  await page.locator('.emh-unit-card').filter({ hasText: 'A1-15' }).getByRole('link', { name: /Open unit$/ }).click();
  await expect(page.getByRole('button', { name: /(?:Mark lesson complete|Lesson completed)$/ })).toBeVisible();
  const mark = page.getByRole('button', { name: /Mark lesson complete$/ });
  if (await mark.count()) await mark.click();
  await expect(page.getByRole('button', { name: /Lesson completed$/ })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: /Lesson completed$/ })).toBeDisabled();
  const { data: completed, error } = await db.from('emh_lesson_progress').select('data').eq('owner_id', accounts.learner.id);
  expect(error).toBeNull();
  expect(completed!.some(row => row.data.unitId === 'A1-15' && row.data.lessonId === 'A1-15-L01')).toBe(true);
  await page.getByRole('link', { name: /Next lesson$/ }).click();
  await expect(page.getByRole('link', { name: /Previous lesson$/ })).toBeVisible();
  await page.getByRole('link', { name: /Previous lesson$/ }).click();
  await page.getByRole('button', { name: /Practise Q-A1-15-001$/ }).click();
  await page.getByLabel(/Your response$/).fill('SYNTHETIC LOCAL UX SAVE');
  const sessionUrl = page.url(), attemptId = sessionUrl.split('/').pop();
  await page.getByRole('link', { name: /Back to unit$/ }).click();
  await expect(page).toHaveURL(/\/english\/units\/A1-15$/);
  await page.goto('/english');
  await page.getByRole('link', { name: /Continue learning$/ }).click();
  await expect(page).toHaveURL(sessionUrl);
  await expect(page.getByLabel(/Your response$/)).toHaveValue('SYNTHETIC LOCAL UX SAVE');
  const { data: attempt, error: attemptError } = await db.from('emh_attempts').select('data').eq('id', attemptId).single();
  expect(attemptError).toBeNull();
  expect(JSON.stringify(attempt?.data)).toContain('SYNTHETIC LOCAL UX SAVE');
  await page.screenshot({ path: '.emh-local/practice-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /Submit final response$/ }).click();
  await expect(page.getByLabel(/Your response$/)).toBeDisabled();
  writeFileSync('.emh-local/ux-browser-proof.json', JSON.stringify({
    verifiedAt: new Date().toISOString(), target: 'isolated-real-local-supabase',
    thaiSearch: 'PASS', mobileOverflow: 'NONE', lessonCompletionPersisted: true,
    saveBeforeNavigation: 'PASS', resumePersistedAnswer: 'PASS', finalSubmissionLocks: true,
    attemptId, productionChanged: false,
  }, null, 2), { mode: 0o600 });
});
