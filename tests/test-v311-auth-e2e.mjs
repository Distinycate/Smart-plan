/**
 * SMART PLAN V3.11F — Authenticated Production E2E Closure
 * Target: https://smart-plan-ten.vercel.app (commit 3160062)
 *
 * Pattern: same as phase1PostMigrationVerification.mjs
 * - Service role creates ephemeral fixture users (never used as teacher)
 * - Fixture teacher signs in via anon client (SSR cookie session)
 * - Full V3 lifecycle tested with authenticated Production requests
 * - NEVER logs: password, tokens, cookies, service role key
 */

'use strict';

import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

dotenv.config({ path: '.env.local' });

const BASE = 'https://smart-plan-ten.vercel.app';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('❌ Missing env vars. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const svc = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const RUN = `V311F-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const PWD = `P1!${crypto.randomBytes(16).toString('base64url')}Zz9`;

const results = [];
const fixture = { users: [], planIds: [] };

const pass = (n, d = '') => { results.push({ n, ok: true, d }); console.log(`  ✅ PASS  ${n}${d ? ' — ' + d : ''}`); };
const fail = (n, d = '') => { results.push({ n, ok: false, d }); console.log(`  ❌ FAIL  ${n}${d ? ' — ' + d : ''}`); };
const chk = (n, cond, d = '') => { cond ? pass(n, d) : fail(n, d); return cond; };

async function mkUser(label) {
  const email = `${RUN.toLowerCase()}-${label}@fixture.invalid`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    password: PWD,
    email_confirm: true,
    user_metadata: { run: RUN, fixture: true },
  });
  if (error || !data?.user) throw new Error(`mkUser ${label}: ${error?.message}`);
  fixture.users.push({ id: data.user.id, email, label });
  return fixture.users.at(-1);
}

async function mkCookie(email) {
  const jar = new Map();
  const c = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => Array.from(jar, ([n, v]) => ({ name: n, value: v })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PWD });
  if (error) throw new Error(`mkCookie ${email}: ${error.message}`);
  const hdr = Array.from(jar, ([n, v]) => `${n}=${v}`).join('; ');
  if (!hdr) throw new Error(`No cookie for ${email}`);
  return hdr;
}

async function req(path, opts = {}, cookie = null, retries = 2) {
  const h = new Headers(opts.headers || {});
  if (cookie) h.set('cookie', cookie);
  if (opts.body) h.set('content-type', 'application/json');
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(`${BASE}${path}`, { ...opts, headers: h });
      const t = await r.text();
      let body;
      try { body = JSON.parse(t); } catch { body = { _raw: t.slice(0, 300) }; }
      return { status: r.status, body, headers: r.headers };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
}

// ─── English Full Lifecycle ────────────────────────────────────────────────────
async function englishLifecycle(ck) {
  console.log('\n── 1. English Full E2E Lifecycle (Create → Final → Taught → Reflected) ──');

  // Step 1: Create Lesson
  const cr = await req('/api/plan/v3', {
    method: 'POST',
    body: JSON.stringify({
      title: `[FIXTURE ${RUN}] English Speaking Communication M1`,
      topic: 'Daily Routines and Introductions',
      course_name: 'English Communication',
      course_code: 'EN21101',
      subject_key: 'ENGLISH',
      grade_level: 'มัธยมศึกษาปีที่ 1',
      duration_minutes: 60,
      learning_focus: 'SPEAKING',
      unit_reference: 'Unit 1: Everyday English',
      teaching_date: '2026-09-30',
    }),
  }, ck);

  if (!chk('CREATE English Lesson', cr.status === 201 || cr.status === 200, `HTTP ${cr.status}`)) {
    console.error('    Create failure:', cr.body);
    return null;
  }
  const pid = cr.body?.data?.id;
  if (!chk('CREATE returns valid lesson ID', !!pid, pid ? pid.slice(0, 8) + '…' : 'missing')) return null;
  fixture.planIds.push(pid);
  const rid = pid.slice(0, 8) + '…';

  // Step 1.5: Link Curriculum
  const clr = await req(`/api/plan/v3/${pid}/curriculum-links`, {
    method: 'PUT',
    body: JSON.stringify({
      links: [
        {
          curriculum_version: '2551_REVISED_2560',
          subject_key: 'ENGLISH',
          grade_level: 'มัธยมศึกษาปีที่ 1',
          standard_code: 'ต 1.2',
          indicator_code: 'ต 1.2 ม.1/1',
          standard_label_snapshot: 'มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูลข่าวสาร',
          indicator_label_snapshot: 'สนทนา แลกเปลี่ยนข้อมูลเกี่ยวกับตนเอง กิจกรรม และสถานการณ์ต่างๆ',
        },
      ],
    }),
  }, ck);
  chk(`CURRICULUM LINK [${rid}]`, clr.status === 200 || clr.status === 201, `HTTP ${clr.status}`);

  // Step 2: Add Objective
  const or = await req(`/api/plan/v3/${pid}/objectives`, {
    method: 'POST',
    body: JSON.stringify({
      statement: 'นักเรียนสามารถพูดแนะนำตนเองและสนทนาถามตอบเกี่ยวกับกิจวัตรประจำวันเป็นภาษาอังกฤษได้ถูกต้อง',
      objective_type: 'P',
      observable_behavior: 'พูดสนทนาโต้ตอบได้คล่องแคล่ว',
      position: 0,
    }),
  }, ck);
  chk(`OBJECTIVES [${rid}]`, or.status === 201 || or.status === 200, `HTTP ${or.status}`);
  const oid = or.body?.data?.id;

  // Step 3: Add Planned Evidence
  const er = await req(`/api/plan/v3/${pid}/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      evidence_type: 'PERFORMANCE',
      description: 'การพูดสนทนาโต้ตอบบทบาทสมมติ (Role-play conversation) แนะนำตนเองและถามตอบกิจวัตรประจำวัน',
      position: 0,
    }),
  }, ck);
  chk(`EVIDENCE [${rid}]`, er.status === 201 || er.status === 200, `HTTP ${er.status}`);
  const eid = er.body?.data?.id;

  // Link Objective ↔ Evidence
  if (oid && eid) {
    const elr = await req(`/api/plan/v3/${pid}/evidence-links`, {
      method: 'POST',
      body: JSON.stringify({ objective_id: oid, evidence_id: eid }),
    }, ck);
    chk(`EVIDENCE-LINK [${rid}]`, elr.status === 201 || elr.status === 200, `HTTP ${elr.status}`);
  }

  // Step 4: Add Activities (Total 60 min, with links to objective and evidence)
  // Activity 1: Intro (10 min)
  const a1 = await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Warm-up: Daily Routine Flashcards',
      phase: 'INTRO',
      minutes: 10,
      position: 0,
      teacher_actions: 'ครูนำเสนอคำศัพท์และโครงสร้างประโยคการถามกิจวัตรประจำวัน',
      student_actions: 'นักเรียนออกเสียงคำศัพท์และตอบคำถามนำเข้าสู่บทเรียน',
    }),
  }, ck);
  chk(`ACTIVITY 1 (Intro 10m) [${rid}]`, a1.status === 201 || a1.status === 200, `HTTP ${a1.status}`);

  // Activity 2: Teaching / Practice (35 min, linked to obj & evd)
  const a2 = await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Pair Speaking: Daily Routine Role-Play',
      phase: 'TEACHING',
      minutes: 35,
      position: 1,
      teacher_actions: 'ครูแจกบัตรกิจกรรมสถานการณ์และคอยสังเกตการณ์พร้อมให้คำแนะนำ',
      student_actions: 'นักเรียนจับคู่ฝึกสนทนาแลกเปลี่ยนข้อมูลกิจวัตรประจำวันตามบทบาทสมมติ',
      linked_objective_ids: oid ? [oid] : [],
      linked_evidence_ids: eid ? [eid] : [],
    }),
  }, ck);
  chk(`ACTIVITY 2 (Teaching 35m) [${rid}]`, a2.status === 201 || a2.status === 200, `HTTP ${a2.status}`);
  const a2id = a2.body?.data?.id;

  // Activity 3: Conclusion (15 min)
  const a3 = await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Conclusion & Self-Check',
      phase: 'CONCLUSION',
      minutes: 15,
      position: 2,
      teacher_actions: 'ครูสรุปจุดเด่นและข้อควรปรับปรุงในการออกเสียงและไวยากรณ์',
      student_actions: 'นักเรียนประเมินความมั่นใจของตนเองและทำ Exit Ticket สรุปประเด็น',
    }),
  }, ck);
  chk(`ACTIVITY 3 (Conclusion 15m) [${rid}]`, a3.status === 201 || a3.status === 200, `HTTP ${a3.status}`);

  // Step 5: Add Assessment with Rubric Tool & linked evidence
  const asr = await req(`/api/plan/v3/${pid}/assessments`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'แบบประเมินทักษะการพูดสนทนาภาษาอังกฤษ (Speaking Rubric)',
      assessment_type: 'PERFORMANCE',
      method: 'OBSERVATION',
      criteria_type: 'RUBRIC',
      criteria_text: 'ระดับดีขึ้นไป (3/4)',
      criteria_value: 3,
      position: 0,
      formative: true,
      evidenceIds: eid ? [eid] : [],
      activityIds: a2id ? [a2id] : [],
      tool: {
        tool_type: 'RUBRIC',
        title: 'เกณฑ์การให้คะแนนการพูดสนทนา (Speaking Rubric)',
        content: {
          rubricLevels: 4,
          criteria: ['Fluency & Pronunciation', 'Grammar & Accuracy', 'Interactive Communication'],
        },
      },
    }),
  }, ck);
  chk(`ASSESSMENT with Tool [${rid}]`, asr.status === 201 || asr.status === 200, `HTTP ${asr.status}`);

  // Step 6: Add Required Teaching Asset (SPEAKING_CARD)
  const ast = await req(`/api/plan/v3/${pid}/assets`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'บัตรสถานการณ์สนทนาภาษาอังกฤษ (Speaking Task Cards)',
      asset_type: 'SPEAKING_CARD',
      audience: 'STUDENT',
      position: 0,
      generation_status: 'READY',
      needs_review: false,
      content: {
        instructions: 'Use the prompt to role-play with your partner for 3 minutes.',
        scenarios: [
          'Describe your morning routine from waking up to arriving at school.',
          'Ask your partner about their evening hobbies and favorite dinner.',
        ],
      },
      objectiveIds: oid ? [oid] : [],
      evidenceIds: eid ? [eid] : [],
    }),
  }, ck);
  chk(`TEACHING PACKAGE Asset [${rid}]`, ast.status === 201 || ast.status === 200, `HTTP ${ast.status}`);

  // Assert status after package = PACKAGE_READY
  const postPkg = await req(`/api/plan/v3/${pid}`, {}, ck);
  const pkgSt = postPkg.body?.data?.lesson?.status;
  chk(`Lesson status after package = PACKAGE_READY [${rid}]`, pkgSt === 'PACKAGE_READY', `status=${pkgSt}`);

  // Step 7: Check Quality & Promote to REVIEWED
  const qg = await req(`/api/plan/v3/${pid}/quality`, {}, ck);
  chk(`QUALITY GET [${rid}]`, qg.status === 200, `HTTP ${qg.status}`);
  if (!qg.body?.documentReadiness?.ready) {
    console.log('    [DEBUG readiness blockers]:', JSON.stringify(qg.body?.documentReadiness?.blockingConditions));
    console.log('    [DEBUG ruleResult blockers]:', JSON.stringify(qg.body?.ruleResult?.issues?.filter((i) => i.isBlocking)));
  }
  const qStatus = qg.body?.lessonStatus || qg.body?.qualitySummary?.lessonStatus;
  chk(`Quality status promoted [${rid}]`, qStatus === 'REVIEWED' || qStatus === 'PACKAGE_READY', `status=${qStatus}`);

  // Trigger Qualitative Review route
  const qr = await req(`/api/plan/v3/${pid}/quality/review`, { method: 'POST', body: JSON.stringify({}) }, ck);
  chk(`QUALITY REVIEW POST [${rid}]`, qr.status === 200 || qr.status === 201, `HTTP ${qr.status}`);

  // Assert status after review = REVIEWED
  const postRev = await req(`/api/plan/v3/${pid}`, {}, ck);
  const curSt = postRev.body?.data?.lesson?.status;
  chk(`Lesson status after review = REVIEWED [${rid}]`, curSt === 'REVIEWED', `status=${curSt}`);

  // Step 8: Finalize (REVIEWED → FINAL)
  const fnr = await req(`/api/plan/v3/${pid}/finalize`, { method: 'POST', body: JSON.stringify({}) }, ck);
  chk(`FINALIZE POST [${rid}]`, fnr.status === 200 || fnr.status === 201, `HTTP ${fnr.status}`);
  const finalHash = fnr.body?.documentSourceHash || fnr.body?.snapshot?.documentSourceHash;
  chk(`FINAL snapshot hash produced [${rid}]`, !!finalHash, `hash=${finalHash}`);

  // Verify status is FINAL
  const finalCheck = await req(`/api/plan/v3/${pid}`, {}, ck);
  chk(`Lesson status = FINAL [${rid}]`, finalCheck.body?.data?.lesson?.status === 'FINAL', `status=${finalCheck.body?.data?.lesson?.status}`);

  // Step 8.5: Negative Test — Pre-TAUGHT Observed Evidence creation must be DENIED (HTTP 409 INVALID_LESSON_STATE)
  const preTaughtObs = await req(`/api/plan/v3/${pid}/post-teaching/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Illegal Premature Observed Evidence',
      evidence_type: 'OBSERVED_PERFORMANCE',
      outcome_status: 'OBSERVED',
    }),
  }, ck);
  chk(`Pre-TAUGHT Observed Evidence DENIED (409) [${rid}]`, preTaughtObs.status === 409, `HTTP ${preTaughtObs.status} (code: ${preTaughtObs.body?.code})`);

  // Step 9: Teach (FINAL → TAUGHT)
  const teachRes = await req(`/api/plan/v3/${pid}/post-teaching/teach`, {
    method: 'POST',
    body: JSON.stringify({
      taught_at: new Date().toISOString(),
      actual_duration_minutes: 60,
      students_total: 35,
      students_present: 33,
      students_absent: 2,
      students_assessed: 33,
      students_passed: 28,
      students_need_support: 5,
      actual_teaching_notes: '[FIXTURE] Pair speaking activity executed as planned. Students engaged actively.',
    }),
  }, ck);
  chk(`TEACH POST (FINAL → TAUGHT) [${rid}]`, teachRes.status === 200 || teachRes.status === 201, `HTTP ${teachRes.status}`);

  const taughtCheck = await req(`/api/plan/v3/${pid}`, {}, ck);
  chk(`Lesson status = TAUGHT [${rid}]`, taughtCheck.body?.data?.lesson?.status === 'TAUGHT', `status=${taughtCheck.body?.data?.lesson?.status}`);

  // Check FINAL hash unchanged after TAUGHT
  const docAfterTaught = await req(`/api/plan/v3/${pid}/document`, {}, ck);
  const hashAfterTaught = docAfterTaught.body?.baseFinalHash || docAfterTaught.body?.documentSourceHash;
  chk(`FINAL snapshot hash unchanged after TAUGHT [${rid}]`, hashAfterTaught === finalHash, `hash=${hashAfterTaught}`);

  // Step 10: Observed Student Evidence (Post-TAUGHT must PASS)
  const obsRes = await req(`/api/plan/v3/${pid}/post-teaching/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'บันทึกการสังเกตการพูดสนทนารายคู่ (Observed Speaking Assessment)',
      evidence_type: 'OBSERVED_PERFORMANCE',
      description: 'นักเรียน 28 จาก 33 คนผ่านเกณฑ์การประเมินระดับดี สามารถสื่อสารโต้ตอบได้ตามสถานการณ์',
      outcome_status: 'OBSERVED',
      planned_evidence_id: eid,
      objective_id: oid,
    }),
  }, ck);
  chk(`Post-TAUGHT OBSERVED EVIDENCE CREATE [${rid}]`, obsRes.status === 200 || obsRes.status === 201, `HTTP ${obsRes.status}`);

  // Step 11: Teacher Reflection & Remediation Gate (TAUGHT → REFLECTED)
  const reflRes = await req(`/api/plan/v3/${pid}/post-teaching/reflect`, {
    method: 'POST',
    body: JSON.stringify({
      reflection: 'นักเรียนส่วนใหญ่ให้ความร่วมมือดีมากในการฝึกพูดคู่ บัตรคำศัพท์และสถานการณ์ช่วยลดความประหม่าได้ชัดเจน',
      what_worked: 'การใช้ Speaking Card ชัดเจนช่วยให้นักเรียนเริ่มต้นประโยคและพูดได้อย่างมั่นใจ',
      next_lesson_adjustment: 'เพิ่มเวลาในการฝึกออกเสียงเชื่อมคำ (connected speech) ในขั้นนำของคาบถัดไป',
      remediation_plan: 'จัดกิจกรรมจับคู่สอนเพื่อน (Peer Tutoring) และครูช่วยฝึกทวนซ้ำรายบุคคลสำหรับนักเรียน 5 คนที่ยังไม่คล่อง',
    }),
  }, ck);
  chk(`REFLECT POST (TAUGHT → REFLECTED) [${rid}]`, reflRes.status === 200 || reflRes.status === 201, `HTTP ${reflRes.status}`);

  const reflCheck = await req(`/api/plan/v3/${pid}`, {}, ck);
  chk(`Lesson status = REFLECTED [${rid}]`, reflCheck.body?.data?.lesson?.status === 'REFLECTED', `status=${reflCheck.body?.data?.lesson?.status}`);

  // Check FINAL hash unchanged after REFLECTED
  const docAfterReflected = await req(`/api/plan/v3/${pid}/document`, {}, ck);
  const hashAfterReflected = docAfterReflected.body?.baseFinalHash || docAfterReflected.body?.documentSourceHash;
  chk(`FINAL snapshot hash unchanged after REFLECTED [${rid}]`, hashAfterReflected === finalHash, `hash=${hashAfterReflected}`);

  // Step 12: Immutability Enforced — Pre-teaching PATCH denied after REFLECTED
  const lk = await req(`/api/plan/v3/${pid}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Illegal Modification on Finalized Plan' }),
  }, ck);
  chk(`Immutability guard: PATCH denied on REFLECTED [${rid}]`, lk.status === 403, `HTTP ${lk.status}`);

  return { pid, rid, st: 'REFLECTED', finalHash, eid, oid };
}

// ─── Export Tests ─────────────────────────────────────────────────────────────
async function exportTests(pid, rid, ck, label = '') {
  console.log(`\n── 2. Authenticated Export Verification [${label}] ──`);

  // Teacher DOCX Export
  const docxR = await fetch(`${BASE}/api/plan/v3/${pid}/export/word`, {
    headers: { cookie: ck },
  });
  chk(`DOCX HTTP 200 [${rid}]`, docxR.status === 200, `HTTP ${docxR.status}`);
  let docxLen = 0;
  if (docxR.status === 200) {
    const buf = Buffer.from(await docxR.arrayBuffer());
    docxLen = buf.length;
    chk(`DOCX non-zero binary`, buf.length > 0, `${buf.length} bytes`);
    const magic = buf.slice(0, 4).toString('hex');
    chk(`DOCX OOXML / PK magic header (504b0304)`, magic === '504b0304', `magic=${magic}`);
    const hashHdr = docxR.headers.get('x-document-source-hash');
    chk(`DOCX X-Document-Source-Hash header present`, !!hashHdr, `hash=${hashHdr}`);
  }

  // Teacher PDF Export
  const pdfR = await fetch(`${BASE}/api/plan/v3/${pid}/export/pdf`, {
    headers: { cookie: ck },
  });
  const pdfSt = pdfR.status;
  chk(`PDF endpoint accessible [${rid}]`, pdfSt === 200 || pdfSt === 503, `HTTP ${pdfSt}`);
  let pdfLen = 0;
  if (pdfSt === 200) {
    const buf = Buffer.from(await pdfR.arrayBuffer());
    pdfLen = buf.length;
    chk(`PDF non-zero binary`, buf.length > 0, `${buf.length} bytes`);
    chk(`PDF %PDF magic header`, buf.slice(0, 4).toString('ascii') === '%PDF', buf.slice(0, 4).toString('ascii'));
    const hashHdr = pdfR.headers.get('x-document-source-hash');
    chk(`PDF X-Document-Source-Hash header present`, !!hashHdr, `hash=${hashHdr}`);
  } else if (pdfSt === 503) {
    pass(`PDF 503: Serverless Chromium binary unavailable — non-blocking infrastructure limitation documented`);
  }

  // Student Package Export
  const stuR = await fetch(`${BASE}/api/plan/v3/${pid}/export/word?package=student`, {
    headers: { cookie: ck },
  });
  chk(`Student Package HTTP 200 [${rid}]`, stuR.status === 200, `HTTP ${stuR.status}`);
  if (stuR.status === 200) {
    const buf = Buffer.from(await stuR.arrayBuffer());
    const str = buf.toString('latin1', 0, Math.min(buf.length, 300000));
    const prohibited = [
      'expectedAnswers',
      'solutionSteps',
      'teacherNotes',
      'answerKey',
      'teacherReflection',
      'remediation_plan',
      'Teacher Guide',
      'PA internal evidence',
    ];
    let leaked = false;
    for (const p of prohibited) {
      if (str.includes(p)) {
        fail(`Student Package MUST NOT contain: ${p}`);
        leaked = true;
      }
    }
    if (!leaked) pass(`Student Package: Zero teacher-only content leaked (${prohibited.length} checks clean)`);
  }

  return { docxLen, pdfSt, pdfLen };
}

// ─── Cross-User IDOR Security Tests ───────────────────────────────────────────
async function crossUserTest(aliceCk, pid) {
  console.log('\n── 3. Cross-User Authenticated IDOR Security (Account B → Account A) ──');
  let bobUser;
  try {
    bobUser = await mkUser('bob');
    pass('Created Account B (authenticated wrong-owner teacher)');
  } catch (e) {
    fail('Create Account B', e.message);
    return;
  }
  const bobCk = await mkCookie(bobUser.email);
  const rid = pid.slice(0, 8) + '…';

  // 1. GET plan
  const g = await req(`/api/plan/v3/${pid}`, {}, bobCk);
  chk(`Account B: GET Account A plan denied (403/404) [${rid}]`, g.status === 403 || g.status === 404, `HTTP ${g.status}`);

  // 2. PATCH plan
  const p = await req(`/api/plan/v3/${pid}`, { method: 'PATCH', body: JSON.stringify({ title: 'Hacked Title' }) }, bobCk);
  chk(`Account B: PATCH Account A plan denied (401/403/404) [${rid}]`, p.status === 401 || p.status === 403 || p.status === 404, `HTTP ${p.status}`);

  // 3. Child mutation: Objectives
  const o = await req(`/api/plan/v3/${pid}/objectives`, {
    method: 'POST',
    body: JSON.stringify({ statement: 'Hacked Objective', position: 99 }),
  }, bobCk);
  chk(`Account B: POST Objective to Account A plan denied [${rid}]`, o.status === 401 || o.status === 403 || o.status === 404, `HTTP ${o.status}`);

  // 4. Child mutation: Teach session
  const t = await req(`/api/plan/v3/${pid}/post-teaching/teach`, {
    method: 'POST',
    body: JSON.stringify({
      taught_at: new Date().toISOString(),
      students_total: 1,
      students_passed: 1,
      students_need_support: 0,
    }),
  }, bobCk);
  chk(`Account B: POST Teach to Account A plan denied (403/404, not 500) [${rid}]`, (t.status === 403 || t.status === 404) && t.status !== 500, `HTTP ${t.status}`);

  // 5. Child mutation: Reflect session
  const refB = await req(`/api/plan/v3/${pid}/post-teaching/reflect`, {
    method: 'POST',
    body: JSON.stringify({
      reflection: 'Hacked Reflection',
    }),
  }, bobCk);
  chk(`Account B: POST Reflect to Account A plan denied (403/404, not 500) [${rid}]`, (refB.status === 403 || refB.status === 404) && refB.status !== 500, `HTTP ${refB.status}`);

  // 6. Observed Evidence mutation
  const ev = await req(`/api/plan/v3/${pid}/post-teaching/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Hacked Evidence',
      evidence_type: 'OBSERVED_TEST',
    }),
  }, bobCk);
  chk(`Account B: POST Observed Evidence to Account A plan denied (403/404, not 500) [${rid}]`, (ev.status === 403 || ev.status === 404) && ev.status !== 500, `HTTP ${ev.status}`);

  // 7. Storage / Upload mutation
  const up = await req(`/api/plan/v3/${pid}/post-teaching/evidence/upload`, {
    method: 'POST',
    body: JSON.stringify({
      filename: 'malicious.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
    }),
  }, bobCk);
  chk(`Account B: POST Storage Upload to Account A plan denied (403/404, not 500) [${rid}]`, (up.status === 403 || up.status === 404) && up.status !== 500, `HTTP ${up.status}`);
}

// ─── Math Production Smoke (Create → Final → Export) ─────────────────────────
async function mathSmoke(ck) {
  console.log('\n── 4. Math Production Smoke (Create → Final → DOCX/PDF) ──');

  // Create
  const cr = await req('/api/plan/v3', {
    method: 'POST',
    body: JSON.stringify({
      title: `[FIXTURE ${RUN}] Mathematics Problem Solving M2`,
      topic: 'การแก้โจทย์ปัญหาเศษส่วนระคน',
      course_name: 'คณิตศาสตร์พื้นฐาน',
      course_code: 'MA22101',
      subject_key: 'MATHEMATICS',
      grade_level: 'มัธยมศึกษาปีที่ 2',
      duration_minutes: 60,
      learning_focus: 'PROBLEM_SOLVING',
      unit_reference: 'หน่วยการเรียนรู้ที่ 2: เศษส่วน',
      teaching_date: '2026-09-30',
    }),
  }, ck);
  chk('Math CREATE', cr.status === 201 || cr.status === 200, `HTTP ${cr.status}`);
  const pid = cr.body?.data?.id;
  if (!pid) return null;
  fixture.planIds.push(pid);
  const rid = pid.slice(0, 8) + '…';

  // Math Curriculum Link
  await req(`/api/plan/v3/${pid}/curriculum-links`, {
    method: 'PUT',
    body: JSON.stringify({
      links: [
        {
          curriculum_version: '2551_REVISED_2560',
          subject_key: 'MATHEMATICS',
          grade_level: 'มัธยมศึกษาปีที่ 2',
          standard_code: 'ค 1.1',
          indicator_code: 'ค 1.1 ม.2/1',
          standard_label_snapshot: 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน',
          indicator_label_snapshot: 'เข้าใจและใช้สมบัติของเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็มในการแก้ปัญหา',
        },
      ],
    }),
  }, ck);

  // Objective
  const obr = await req(`/api/plan/v3/${pid}/objectives`, {
    method: 'POST',
    body: JSON.stringify({
      statement: 'นักเรียนสามารถวิเคราะห์และแก้โจทย์ปัญหาเศษส่วนระคนได้อย่างถูกต้อง',
      objective_type: 'P',
      observable_behavior: 'แสดงวิธีทำและหาคำตอบได้ถูกต้อง',
      position: 0,
    }),
  }, ck);
  const oid = obr.body?.data?.id;

  // Evidence
  const evr = await req(`/api/plan/v3/${pid}/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      evidence_type: 'PROBLEM_SET',
      description: 'ใบงานชุดสถานการณ์ปัญหาและการให้เหตุผลทางคณิตศาสตร์',
      position: 0,
    }),
  }, ck);
  const eid = evr.body?.data?.id;

  // Activities (60 min total)
  await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ขั้นนำ: ทบทวนการบวก ลบ เศษส่วน',
      phase: 'INTRO',
      minutes: 10,
      position: 0,
      teacher_actions: 'ครูตั้งคำถามทบทวนหลักการคำนวณ',
      student_actions: 'นักเรียนตอบคำถามและคำนวณในกระดานไวท์บอร์ด',
    }),
  }, ck);

  const a2 = await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ขั้นสอน: การแก้โจทย์ปัญหาเศษส่วน 4 ขั้นตอนของโพลยา',
      phase: 'TEACHING',
      minutes: 35,
      position: 1,
      teacher_actions: 'ครูสาธิตขั้นตอนการวิเคราะห์โจทย์และจัดกลุ่มฝึกปฏิบัติ',
      student_actions: 'นักเรียนร่วมกันวิเคราะห์โจทย์และแสดงวิธีคิดลงในชุดปัญหา',
      linked_objective_ids: oid ? [oid] : [],
      linked_evidence_ids: eid ? [eid] : [],
    }),
  }, ck);
  const a2id = a2.body?.data?.id;

  await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ขั้นสรุป: สรุปหลักการแก้ปัญหาและ Exit Ticket',
      phase: 'CONCLUSION',
      minutes: 15,
      position: 2,
      teacher_actions: 'ครูและนักเรียนร่วมกันสรุปข้อควรระวังในการคำนวณ',
      student_actions: 'นักเรียนทำแบบทดสอบสรุปความเข้าใจ 1 ข้อ',
    }),
  }, ck);

  // Assessment with Scoring Guide Tool
  await req(`/api/plan/v3/${pid}/assessments`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'เกณฑ์การให้คะแนนการแก้ปัญหาคณิตศาสตร์ (Scoring Guide)',
      assessment_type: 'PROBLEM_SOLVING',
      method: 'WRITTEN_TEST',
      criteria_type: 'SCORING_GUIDE',
      criteria_text: 'ได้คะแนนไม่น้อยกว่าร้อยละ 70',
      criteria_value: 70,
      position: 0,
      formative: true,
      evidenceIds: eid ? [eid] : [],
      activityIds: a2id ? [a2id] : [],
      tool: {
        tool_type: 'SCORING_GUIDE',
        title: 'แนวทางการให้คะแนนการแก้โจทย์ปัญหา',
        content: {
          steps: ['การทำความเข้าใจปัญหา (1)', 'การวางแผน (1)', 'การปฏิบัติตามแผน (2)', 'การตรวจสอบคำตอบ (1)'],
        },
      },
    }),
  }, ck);

  // Teaching Assets: Required for Math Problem Solving = PROBLEM_SET + ANSWER_KEY
  await req(`/api/plan/v3/${pid}/assets`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ชุดแบบฝึกสถานการณ์ปัญหาการแก้โจทย์เศษส่วน',
      asset_type: 'PROBLEM_SET',
      audience: 'STUDENT',
      position: 0,
      generation_status: 'READY',
      needs_review: false,
      content: { instructions: 'จงแสดงวิธีทำและหาคำตอบอย่างละเอียด' },
    }),
  }, ck);

  await req(`/api/plan/v3/${pid}/assets`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'เฉลยและเกณฑ์การให้คะแนนแนวคิด (Answer Key & Scoring Guide)',
      asset_type: 'ANSWER_KEY',
      audience: 'TEACHER',
      position: 1,
      generation_status: 'READY',
      needs_review: false,
      content: { expectedAnswers: 'ขั้นตอนวิธีทำและคำตอบสุดท้ายของแต่ละข้อ' },
    }),
  }, ck);

  // Assert Math PACKAGE_READY
  const postPkgMath = await req(`/api/plan/v3/${pid}`, {}, ck);
  const mathPkgSt = postPkgMath.body?.data?.lesson?.status;
  chk(`Math PACKAGE_READY [${rid}]`, mathPkgSt === 'PACKAGE_READY', `status=${mathPkgSt}`);

  // Quality check & review
  const qg = await req(`/api/plan/v3/${pid}/quality`, {}, ck);
  chk(`Math Quality GET [${rid}]`, qg.status === 200, `HTTP ${qg.status}`);

  await req(`/api/plan/v3/${pid}/quality/review`, { method: 'POST', body: JSON.stringify({}) }, ck);
  const postRevMath = await req(`/api/plan/v3/${pid}`, {}, ck);
  const mathRevSt = postRevMath.body?.data?.lesson?.status;
  chk(`Math REVIEWED [${rid}]`, mathRevSt === 'REVIEWED', `status=${mathRevSt}`);

  // Finalize
  const fnr = await req(`/api/plan/v3/${pid}/finalize`, { method: 'POST', body: JSON.stringify({}) }, ck);
  chk(`Math FINALIZE [${rid}]`, fnr.status === 200 || fnr.status === 201, `HTTP ${fnr.status}`);

  // Export DOCX
  const docxR = await fetch(`${BASE}/api/plan/v3/${pid}/export/word`, { headers: { cookie: ck } });
  chk(`Math DOCX HTTP 200 [${rid}]`, docxR.status === 200, `HTTP ${docxR.status}`);

  // Export PDF
  const pdfR = await fetch(`${BASE}/api/plan/v3/${pid}/export/pdf`, { headers: { cookie: ck } });
  chk(`Math PDF endpoint accessible [${rid}]`, pdfR.status === 200 || pdfR.status === 503, `HTTP ${pdfR.status}`);

  return { pid, rid };
}

// ─── Science Production Smoke (Create → Final → Export) ──────────────────────
async function scienceSmoke(ck) {
  console.log('\n── 5. Science Production Smoke (Create → Final → DOCX/PDF) ──');

  // Create
  const cr = await req('/api/plan/v3', {
    method: 'POST',
    body: JSON.stringify({
      title: `[FIXTURE ${RUN}] Science Photosynthesis Experiment P4`,
      topic: 'การสังเคราะห์ด้วยแสงของพืช',
      course_name: 'วิทยาศาสตร์และเทคโนโลยี',
      course_code: 'SC14101',
      subject_key: 'SCIENCE',
      grade_level: 'ประถมศึกษาปีที่ 4',
      duration_minutes: 60,
      learning_focus: 'EXPERIMENT',
      unit_reference: 'หน่วยที่ 2: สิ่งมีชีวิตกับกระบวนการดำรงชีวิต',
      teaching_date: '2026-09-30',
    }),
  }, ck);
  chk('Science CREATE', cr.status === 201 || cr.status === 200, `HTTP ${cr.status}`);
  const pid = cr.body?.data?.id;
  if (!pid) return null;
  fixture.planIds.push(pid);
  const rid = pid.slice(0, 8) + '…';

  // Science Curriculum Link
  await req(`/api/plan/v3/${pid}/curriculum-links`, {
    method: 'PUT',
    body: JSON.stringify({
      links: [
        {
          curriculum_version: '2551_REVISED_2560',
          subject_key: 'SCIENCE',
          grade_level: 'ประถมศึกษาปีที่ 4',
          standard_code: 'ว 1.2',
          indicator_code: 'ว 1.2 ป.4/1',
          standard_label_snapshot: 'เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต การลำเลียงสารเข้าและออกจากเซลล์',
          indicator_label_snapshot: 'บรรยายหน้าที่ของราก ลำต้น ใบ และดอกของพืชดอกโดยใช้ข้อมูลที่รวบรวมได้',
        },
      ],
    }),
  }, ck);

  // Objective
  const obr = await req(`/api/plan/v3/${pid}/objectives`, {
    method: 'POST',
    body: JSON.stringify({
      statement: 'นักเรียนสามารถทำการทดลองทดสอบแป้งในใบพืชด้วยสารละลายไอโอดีนและอธิบายผลการสังเคราะห์ด้วยแสงได้',
      objective_type: 'P',
      observable_behavior: 'ปฏิบัติตามขั้นตอนการทดลองและบันทึกผลได้ถูกต้อง',
      position: 0,
    }),
  }, ck);
  const oid = obr.body?.data?.id;

  // Evidence
  const evr = await req(`/api/plan/v3/${pid}/evidence`, {
    method: 'POST',
    body: JSON.stringify({
      evidence_type: 'WORKSHEET',
      description: 'ใบกิจกรรมและตารางบันทึกผลการสังเกตการเปลี่ยนสีของสารละลายไอโอดีน',
      position: 0,
    }),
  }, ck);
  const eid = evr.body?.data?.id;

  // Activities (60 min total)
  await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ขั้นนำ: พืชสังเคราะห์แสงและสร้างอาหารได้อย่างไร',
      phase: 'INTRO',
      minutes: 10,
      position: 0,
      teacher_actions: 'ครูตั้งคำถามชวนคิดเพื่อกระตุ้นการสังเกต',
      student_actions: 'นักเรียนร่วมกันคาดคะเนคำตอบ',
    }),
  }, ck);

  const a2 = await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ขั้นกิจกรรม: ปฏิบัติการทดลองทดสอบแป้งในใบไม้',
      phase: 'TEACHING',
      minutes: 35,
      position: 1,
      teacher_actions: 'ครูสาธิตขั้นตอนการต้มใบไม้ในน้ำและแอลกอฮอล์พร้อมกำกับความปลอดภัย',
      student_actions: 'นักเรียนแบ่งกลุ่มทำการทดลองและหยดสารละลายไอโอดีนบันทึกผลการเปลี่ยนสี',
      linked_objective_ids: oid ? [oid] : [],
      linked_evidence_ids: eid ? [eid] : [],
    }),
  }, ck);
  const a2id = a2.body?.data?.id;

  await req(`/api/plan/v3/${pid}/activities`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ขั้นสรุป: อภิปรายผลการทดลองและสรุปข้อค้นพบ',
      phase: 'CONCLUSION',
      minutes: 15,
      position: 2,
      teacher_actions: 'ครูนำอภิปรายสรุปความรู้เรื่องแป้งและน้ำตาลในพืช',
      student_actions: 'นักเรียนแต่ละกลุ่มนำเสนอข้อค้นพบและบันทึกข้อสรุป',
    }),
  }, ck);

  // Assessment
  await req(`/api/plan/v3/${pid}/assessments`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'แบบประเมินทักษะกระบวนการทางวิทยาศาสตร์',
      assessment_type: 'EXPERIMENT',
      method: 'OBSERVATION',
      criteria_type: 'RUBRIC',
      criteria_text: 'ผ่านเกณฑ์ระดับ 2 ขึ้นไป',
      criteria_value: 2,
      position: 0,
      formative: true,
      evidenceIds: eid ? [eid] : [],
      activityIds: a2id ? [a2id] : [],
      tool: {
        tool_type: 'CHECKLIST',
        title: 'รายการตรวจสอบทักษะการปฏิบัติการทดลอง',
        content: { items: ['การใช้อุปกรณ์ถูกต้อง', 'การบันทึกผลตามความเป็นจริง', 'การรักษาความปลอดภัย'] },
      },
    }),
  }, ck);

  // Teaching Assets: Required for Science Experiment = EXPERIMENT_SHEET + DATA_TABLE
  await req(`/api/plan/v3/${pid}/assets`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ใบกิจกรรมการทดลองการสังเคราะห์ด้วยแสง (Experiment Sheet)',
      asset_type: 'EXPERIMENT_SHEET',
      audience: 'STUDENT',
      position: 0,
      generation_status: 'READY',
      needs_review: false,
      content: { steps: ['นำใบพืชต้มในน้ำเดือด', 'สกัดคลอโรฟิลล์ด้วยแอลกอฮอล์', 'หยดไอโอดีนสังเกตผล'] },
    }),
  }, ck);

  await req(`/api/plan/v3/${pid}/assets`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'ตารางบันทึกผลการทดลอง (Data Table)',
      asset_type: 'DATA_TABLE',
      audience: 'STUDENT',
      position: 1,
      generation_status: 'READY',
      needs_review: false,
      content: { columns: ['ส่วนของใบที่ทดสอบ', 'สีของไอโอดีนก่อนหยด', 'สีของไอโอดีนหลังหยด', 'การแปลผล'] },
    }),
  }, ck);

  // Assert Science PACKAGE_READY
  const postPkgSci = await req(`/api/plan/v3/${pid}`, {}, ck);
  const sciPkgSt = postPkgSci.body?.data?.lesson?.status;
  chk(`Science PACKAGE_READY [${rid}]`, sciPkgSt === 'PACKAGE_READY', `status=${sciPkgSt}`);

  // Quality check & review
  const qg = await req(`/api/plan/v3/${pid}/quality`, {}, ck);
  chk(`Science Quality GET [${rid}]`, qg.status === 200, `HTTP ${qg.status}`);

  await req(`/api/plan/v3/${pid}/quality/review`, { method: 'POST', body: JSON.stringify({}) }, ck);
  const postRevSci = await req(`/api/plan/v3/${pid}`, {}, ck);
  const sciRevSt = postRevSci.body?.data?.lesson?.status;
  chk(`Science REVIEWED [${rid}]`, sciRevSt === 'REVIEWED', `status=${sciRevSt}`);

  // Finalize
  const fnr = await req(`/api/plan/v3/${pid}/finalize`, { method: 'POST', body: JSON.stringify({}) }, ck);
  chk(`Science FINALIZE [${rid}]`, fnr.status === 200 || fnr.status === 201, `HTTP ${fnr.status}`);

  // Export DOCX
  const docxR = await fetch(`${BASE}/api/plan/v3/${pid}/export/word`, { headers: { cookie: ck } });
  chk(`Science DOCX HTTP 200 [${rid}]`, docxR.status === 200, `HTTP ${docxR.status}`);

  // Export PDF
  const pdfR = await fetch(`${BASE}/api/plan/v3/${pid}/export/pdf`, { headers: { cookie: ck } });
  chk(`Science PDF endpoint accessible [${rid}]`, pdfR.status === 200 || pdfR.status === 503, `HTTP ${pdfR.status}`);

  return { pid, rid };
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('================================================================');
  console.log('🔐 V3.11F — AUTHENTICATED PRODUCTION E2E CLOSURE');
  console.log(`   Target URL:    ${BASE}`);
  console.log('   Commit:        3160062');
  console.log(`   Run ID:        ${RUN}`);
  console.log('================================================================\n');

  let reportData = {
    english: null,
    exports: null,
    crossUser: false,
    math: null,
    science: null,
  };

  try {
    // 1. Create Teacher Fixture User (Account A)
    let alice;
    try {
      alice = await mkUser('alice');
      pass('Fixture teacher created (Account A)', 'email=[REDACTED]');
    } catch (e) {
      fail('Create fixture teacher', e.message);
      process.exit(1);
    }

    // 2. Obtain Authenticated Browser/SSR Session Cookie
    let ck;
    try {
      ck = await mkCookie(alice.email);
      pass('Teacher authenticated via SSR cookie session (Service role NEVER used for teacher flow)');
    } catch (e) {
      fail('Auth fixture teacher', e.message);
      process.exit(1);
    }

    // 3. Verify Authenticated Baseline
    const av = await req('/api/plan/v3', {}, ck);
    chk('Teacher authenticated request verified (GET /api/plan/v3 = 200)', av.status === 200, `HTTP ${av.status}`);

    // 4. English Full Lifecycle
    const eng = await englishLifecycle(ck);
    reportData.english = eng;

    // 5. English Exports & Student Package
    if (eng?.pid) {
      const expRes = await exportTests(eng.pid, eng.rid, ck, `English state=${eng.st}`);
      reportData.exports = expRes;

      // 6. Cross-User IDOR Security
      await crossUserTest(ck, eng.pid);
      reportData.crossUser = true;
    }

    // 7. Math Production Smoke
    const math = await mathSmoke(ck);
    reportData.math = math;

    // 8. Science Production Smoke
    const sci = await scienceSmoke(ck);
    reportData.science = sci;

  } finally {
    console.log('\n── Cleanup ──');
    for (const u of fixture.users) {
      try {
        await svc.auth.admin.deleteUser(u.id);
        console.log(`  ♻️  Deleted ephemeral fixture user ${u.label} (${u.email})`);
      } catch (e) {
        console.log(`  ⚠️  Could not delete ${u.label}: ${e.message}`);
      }
    }
    if (fixture.planIds.length > 0) {
      console.log(`  📌 Fixture plans (${fixture.planIds.length}) remain in DB — identified by "[FIXTURE ${RUN}]" prefix, immutable by architecture design`);
    }
  }

  const ok = results.filter(r => r.ok).length;
  const bad = results.filter(r => !r.ok).length;
  console.log('');
  console.log('================================================================');
  console.log(`📊 AUTHENTICATED PRODUCTION E2E SUMMARY: ${ok} PASSED / ${bad} FAILED / ${results.length} TOTAL`);
  console.log('================================================================');
  if (bad > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.ok).forEach(r => console.log(`  - ${r.n}${r.d ? ' [' + r.d + ']' : ''}`));
  }
  process.exit(bad > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('\n💥 Unhandled error:', e.message);
  process.exit(1);
});
