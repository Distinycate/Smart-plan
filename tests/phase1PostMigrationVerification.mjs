/*
 * Live, post-migration verification for migrations 12 and 13.
 *
 * This script never reruns migrations. It creates three disposable auth users
 * and only records whose IDs begin with the run prefix. Cleanup is attempted
 * in finally, including when an assertion fails. It intentionally does not
 * query or alter teacher-owned records.
 *
 * Prerequisite: run a local production server, e.g. `npm start -- -p 3010`.
 */
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = (process.env.VERIFICATION_BASE_URL || 'http://127.0.0.1:3010').replace(/\/$/, '');

if (!url || !anonKey || !serviceKey) {
  throw new Error('Missing Supabase configuration. Expected NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.');
}

const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const runId = `VERIFY-P1-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const password = `Vp1!${crypto.randomBytes(18).toString('base64url')}Aa9`;
const results = [];
const fixture = { users: [], planIds: [], unitPlanIds: [], unitLessonIds: [], jobIds: [] };

function record(name, passed, detail = '') {
  results.push({ name, passed: Boolean(passed), detail });
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`);
}

function expectStatus(name, response, expected) {
  const passed = response.status === expected;
  record(name, passed, `HTTP ${response.status}; expected ${expected}`);
}

function expectDenied(name, response) {
  const passed = response.status === 403 || response.status === 404;
  record(name, passed, `HTTP ${response.status}; expected a non-disclosing denial (403 or 404)`);
}

function id(prefix) {
  return `${prefix}-${runId}`;
}

async function createTestUser(label) {
  const email = `${runId.toLowerCase()}-${label.toLowerCase()}@example.invalid`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { verification_run: runId, fixture: true },
  });
  if (error || !data.user) throw new Error(`Cannot create fixture user ${label}: ${error?.message || 'unknown error'}`);
  fixture.users.push({ id: data.user.id, email, label });
  return fixture.users.at(-1);
}

async function makeCookieHeader(email) {
  const jar = new Map();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Cannot sign in fixture ${email}: ${error.message}`);
  const value = Array.from(jar, ([name, cookie]) => `${name}=${cookie}`).join('; ');
  if (!value) throw new Error(`Fixture ${email} did not receive an authentication cookie`);
  return value;
}

async function request(path, options = {}, cookie) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set('cookie', cookie);
  return fetch(`${baseUrl}${path}`, { ...options, headers, redirect: 'manual' });
}

function draftPlan(planId, userId, label) {
  const now = new Date().toISOString();
  return {
    planId,
    user_id: userId,
    planStatus: 'draft',
    teacherName: `Verification Teacher ${label}`,
    schoolName: 'Verification School',
    organization: 'Verification Organization',
    headerGradeLevel: 'ป.5',
    gradeLevel: 'ป.5',
    subjectName: 'วิทยาศาสตร์',
    semester: '1',
    academicYear: '2569',
    lessonTopic: `Verification topic ${label}`,
    totalHours: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function draftUnitPlan(unitPlanId, userId, label) {
  const now = new Date().toISOString();
  return {
    unitPlanId,
    user_id: userId,
    unitPlanStatus: 'draft',
    academicYear: '2569',
    semester: '1',
    gradeLevel: 'ป.5',
    subjectName: 'วิทยาศาสตร์',
    unitName: `Verification unit ${label}`,
    totalUnitHours: 1,
    indicatorIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function admit(userId, kind, globalLimit = 6, perUserLimit = 2) {
  const { data, error } = await service.rpc('admit_canonical_ai_request', {
    p_user_id: userId,
    p_request_kind: kind,
    p_global_limit: globalLimit,
    p_per_user_limit: perUserLimit,
    p_lease_seconds: 75,
  }).maybeSingle();
  if (error) throw new Error(`Admission RPC failed: ${error.message}`);
  if (data?.job_id) fixture.jobIds.push(data.job_id);
  return data;
}

async function cleanup() {
  const userIds = fixture.users.map((user) => user.id);
  const planIds = fixture.planIds;
  const unitPlanIds = fixture.unitPlanIds;
  const unitLessonIds = fixture.unitLessonIds;
  const failures = [];
  const erase = async (query, label) => {
    const { error } = await query;
    if (error) failures.push(`${label}: ${error.message}`);
  };

  if (planIds.length) {
    await erase(service.from('System_Logs').delete().in('planId', planIds), 'System_Logs lesson fixtures');
    await erase(service.from('LessonPlan_Backup').delete().in('originalPlanId', planIds), 'LessonPlan_Backup fixtures');
  }
  if (unitPlanIds.length) {
    await erase(service.from('System_Logs').delete().in('planId', unitPlanIds), 'System_Logs unit fixtures');
    await erase(service.from('VersionHistory').delete().in('entityId', unitPlanIds), 'VersionHistory fixtures');
  }
  if (unitLessonIds.length) await erase(service.from('UnitLessons').delete().in('unitLessonId', unitLessonIds), 'UnitLessons fixtures');
  if (unitPlanIds.length) await erase(service.from('UnitPlans').delete().in('unitPlanId', unitPlanIds), 'UnitPlans fixtures');
  if (planIds.length) await erase(service.from('LessonPlans').delete().in('planId', planIds), 'LessonPlans fixtures');
  if (userIds.length) await erase(service.from('ai_jobs').delete().in('user_id', userIds), 'ai_jobs fixtures');
  for (const user of fixture.users) {
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) failures.push(`auth user ${user.label}: ${error.message}`);
  }
  record('Cleanup of verification-only fixtures', failures.length === 0, failures.join('; '));
}

let exitCode = 0;
try {
  const [userA, userB, admin] = await Promise.all([
    createTestUser('A'), createTestUser('B'), createTestUser('ADMIN'),
  ]);
  const { error: roleError } = await service.from('profiles').update({ role: 'admin' }).eq('id', admin.id);
  if (roleError) throw new Error(`Cannot assign fixture admin role: ${roleError.message}`);

  const [cookieA, cookieB, cookieAdmin] = await Promise.all([
    makeCookieHeader(userA.email), makeCookieHeader(userB.email), makeCookieHeader(admin.email),
  ]);

  const planA = id('PLAN-A');
  const planB = id('PLAN-B');
  fixture.planIds.push(planA, planB);
  const unitA = id('UNIT-A');
  const unitB = id('UNIT-B');
  fixture.unitPlanIds.push(unitA, unitB);
  const lessonB = id('LESSON-B');
  fixture.unitLessonIds.push(lessonB);

  for (const recordToInsert of [draftPlan(planA, userA.id, 'A'), draftPlan(planB, userB.id, 'B')]) {
    const { error } = await service.from('LessonPlans').insert(recordToInsert);
    if (error) throw new Error(`Cannot create lesson fixture: ${error.message}`);
  }
  for (const recordToInsert of [draftUnitPlan(unitA, userA.id, 'A'), draftUnitPlan(unitB, userB.id, 'B')]) {
    const { error } = await service.from('UnitPlans').insert(recordToInsert);
    if (error) throw new Error(`Cannot create unit fixture: ${error.message}`);
  }
  const { error: lessonError } = await service.from('UnitLessons').insert({
    unitLessonId: lessonB, unitPlanId: unitB, user_id: userB.id, lessonOrder: 1,
    lessonTitle: 'Verification child B', lessonTopic: 'Verification child B', estimatedHours: 1,
    lessonStatus: 'draft', teacherEdited: true,
  });
  if (lessonError) throw new Error(`Cannot create nested unit fixture: ${lessonError.message}`);

  // Migration 12 operational verification: profile RLS, role function and column grant.
  const userAClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await userAClient.auth.signInWithPassword({ email: userA.email, password });
  const adminClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await adminClient.auth.signInWithPassword({ email: admin.email, password });
  const { data: adminFlagA, error: adminFlagAError } = await userAClient.rpc('is_admin');
  record('Migration 12 is_admin() exists and returns false for teacher', !adminFlagAError && adminFlagA === false, adminFlagAError?.message || String(adminFlagA));
  const { data: adminFlagAdmin, error: adminFlagAdminError } = await adminClient.rpc('is_admin');
  record('Migration 12 is_admin() returns true for admin', !adminFlagAdminError && adminFlagAdmin === true, adminFlagAdminError?.message || String(adminFlagAdmin));
  const { data: hiddenProfile, error: profileReadError } = await userAClient.from('profiles').select('id,email,role').eq('id', userB.id);
  record('Migration 12 profile RLS hides another teacher', !profileReadError && (hiddenProfile || []).length === 0, profileReadError?.message || `rows=${hiddenProfile?.length ?? 0}`);
  const { error: privilegeUpdateError } = await userAClient.from('profiles').update({ role: 'admin' }).eq('id', userA.id);
  record('Migration 12 profile role column is not teacher-writable', Boolean(privilegeUpdateError), privilegeUpdateError?.message || 'unexpected update success');
  const { data: foreignPlans, error: foreignPlanReadError } = await userAClient
    .from('LessonPlans').select('planId,user_id').eq('planId', planB);
  record('LessonPlan RLS hides another teacher at database boundary', !foreignPlanReadError && (foreignPlans || []).length === 0, foreignPlanReadError?.message || `rows=${foreignPlans?.length ?? 0}`);

  // Migration 13 operational verification: function/table/index-dependent admission behavior.
  const admission = await admit(userA.id, 'verification-schema');
  record('Migration 13 admission RPC exists and admits a valid request', admission?.admission_status === 'admitted' && Boolean(admission?.job_id), String(admission?.admission_status));
  assert.equal(admission?.admission_status, 'admitted');
  await service.from('ai_jobs').update({ status: 'complete', lease_expires_at: null }).eq('job_id', admission.job_id);

  // LessonPlan ownership via actual API routes.
  expectStatus('1 User A reads own LessonPlan', await request(`/api/plans/${planA}`, {}, cookieA), 200);
  const updatePayload = { ...draftPlan(planA, userA.id, 'A'), lessonTopic: 'Verification topic A updated' };
  expectStatus('2 User A updates own LessonPlan', await request(`/api/plans/${planA}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updatePayload) }, cookieA), 200);
  expectStatus('3 User A archives own LessonPlan', await request(`/api/plans/${planA}`, { method: 'DELETE' }, cookieA), 200);
  expectStatus('3 User A restores own LessonPlan', await request(`/api/plans/${planA}/restore`, { method: 'PATCH' }, cookieA), 200);
  expectStatus('4 User A exports own LessonPlan PDF', await request(`/api/plans/${planA}/export/pdf`, { method: 'POST' }, cookieA), 200);
  expectStatus('4 User A exports own LessonPlan Word', await request(`/api/plans/${planA}/export/word`, {}, cookieA), 200);

  expectDenied('5 User A cannot read User B LessonPlan', await request(`/api/plans/${planB}`, {}, cookieA));
  expectDenied('6 User A cannot update User B LessonPlan', await request(`/api/plans/${planB}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updatePayload) }, cookieA));
  expectDenied('7 User A cannot archive User B LessonPlan', await request(`/api/plans/${planB}`, { method: 'DELETE' }, cookieA));
  expectDenied('8 User A cannot restore User B LessonPlan', await request(`/api/plans/${planB}/restore`, { method: 'PATCH' }, cookieA));
  expectDenied('9 User A cannot export User B LessonPlan PDF', await request(`/api/plans/${planB}/export/pdf`, { method: 'POST' }, cookieA));
  expectDenied('10 User A cannot export User B LessonPlan Word', await request(`/api/plans/${planB}/export/word`, {}, cookieA));

  expectStatus('11 Admin reads User B LessonPlan', await request(`/api/plans/${planB}`, {}, cookieAdmin), 200);
  expectDenied('12 Admin cannot update User B LessonPlan', await request(`/api/plans/${planB}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(updatePayload) }, cookieAdmin));
  expectDenied('13 Admin cannot restore User B LessonPlan', await request(`/api/plans/${planB}/restore`, { method: 'PATCH' }, cookieAdmin));
  expectDenied('14 Admin cannot export User B LessonPlan', await request(`/api/plans/${planB}/export/pdf`, { method: 'POST' }, cookieAdmin));
  expectDenied('14 Admin cannot export User B LessonPlan Word', await request(`/api/plans/${planB}/export/word`, {}, cookieAdmin));

  // Unit plan ownership and parent-child integrity via actual API routes.
  expectStatus('15 User A reads own UnitPlan', await request(`/api/unit-plans/${unitA}`, {}, cookieA), 200);
  expectDenied('16 User A cannot export User B UnitPlan Word', await request(`/api/unit-plans/${unitB}/export/word`, {}, cookieA));
  expectDenied('16 User A cannot export User B UnitPlan PDF', await request(`/api/unit-plans/${unitB}/export/pdf`, { method: 'POST' }, cookieA));
  expectDenied('17 User A cannot use UnitPlan A with UnitLesson B', await request(`/api/unit-plans/${unitA}/lessons/${lessonB}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonTitle: 'attempt', estimatedHours: 1, lessonOrder: 1 }) }, cookieA));
  expectDenied('18 nested ID mismatch is rejected', await request(`/api/unit-plans/${unitB}/lessons/${lessonB}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonTitle: 'attempt', estimatedHours: 1, lessonOrder: 1 }) }, cookieA));
  const createLessonResponse = await request(`/api/unit-plans/${unitA}/lessons`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonOrder: 1, lessonTitle: 'Verification child A', lessonTopic: 'Verification child A', estimatedHours: 1 }) }, cookieA);
  expectStatus('19 Owner can create a matching UnitPlan child', createLessonResponse, 200);
  const createdLesson = await createLessonResponse.json();
  const lessonA = createdLesson.data?.unitLessonId;
  assert.ok(lessonA, 'New matching UnitLesson ID is required for nested verification');
  fixture.unitLessonIds.push(lessonA);
  expectStatus('19 Owner can update a matching UnitPlan child', await request(`/api/unit-plans/${unitA}/lessons/${lessonA}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonOrder: 1, lessonTitle: 'Verification child A updated', lessonTopic: 'Verification child A', estimatedHours: 1 }) }, cookieA), 200);

  // Canonical AI boundary through the actual route.
  expectStatus('20 Anonymous canonical AI request is rejected before Gemini', await request('/api/ai-process-core', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gradeLevel: 'ป.5', subjectName: 'วิทยาศาสตร์', lessonTopic: 'verification' }) }), 401);

  const authenticatedAi = await request('/api/ai-process-core', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gradeLevel: 'ป.5', subjectName: 'วิทยาศาสตร์', lessonTopic: 'การทดสอบ admission', totalHours: 1, learningStandard: 'มาตรฐานทดสอบ', indicatorDuring: 'ตัวชี้วัดทดสอบ' }) }, cookieA);
  expectStatus('21 Authenticated canonical AI request enters runtime', authenticatedAi, 200);

  const busyOne = await admit(userA.id, 'verification-busy-1', 6, 2);
  const busyTwo = await admit(userA.id, 'verification-busy-2', 6, 2);
  assert.equal(busyOne?.admission_status, 'admitted'); assert.equal(busyTwo?.admission_status, 'admitted');
  expectStatus('22/23 Distributed admission rejects a busy authenticated user with 429', await request('/api/ai-process-core', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gradeLevel: 'ป.5', subjectName: 'วิทยาศาสตร์', lessonTopic: 'busy verification' }) }, cookieA), 429);
} catch (error) {
  exitCode = 1;
  process.stderr.write(`VERIFICATION FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
} finally {
  await cleanup();
  const passed = results.filter((result) => result.passed).length;
  process.stdout.write(`SUMMARY ${passed}/${results.length} checks passed; run=${runId}\n`);
  if (results.some((result) => !result.passed)) exitCode = 1;
}

process.exitCode = exitCode;
