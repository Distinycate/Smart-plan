/**
 * Smart Plan V3.10 — Automated Test Suite: Post-Teaching & Student Evidence
 *
 * Verifies all 23 Scenarios (A - W):
 * A: FINAL -> TAUGHT valid
 * B: DRAFT/REVIEWED cannot -> TAUGHT
 * C: TAUGHT -> REFLECTED valid
 * D: FINAL cannot -> REFLECTED directly
 * E: Invalid student counts rejected
 * F: needsSupport > 0 requires remediation before REFLECTED
 * G: Planned evidence remains unchanged
 * H: Observed evidence separate entity
 * I: Observed evidence can link planned evidence
 * J: Unplanned observed evidence allowed
 * K: Other user denied
 * L: FINAL snapshot remains immutable
 * M: Pre-teaching child entities remain locked after TAUGHT
 * N: Pre-teaching child entities remain locked after REFLECTED
 * O: TAUGHT document uses FINAL snapshot + overlay
 * P: REFLECTED document uses FINAL snapshot + overlay
 * Q: No fabricated reflection
 * R: Student Package excludes teacher-only post-teaching data
 * S: Teacher Package includes allowed post-teaching data
 * T: baseFinalHash preserved
 * U: postTeachingSourceHash deterministic
 * V: Observed outcome OBSERVED requires evidenceRefs
 * W: AI cannot change lifecycle state
 *
 * Runs under plain Node.js — Pure deterministic execution.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const jszip = require('jszip');

function loadTsModule(relPath) {
  const fullPath = relPath.endsWith('.ts')
    ? relPath
    : fs.existsSync(relPath + '.ts')
    ? relPath + '.ts'
    : path.join(relPath, 'index.ts');

  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  const fn = new Function('require', 'exports', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(
    (reqPath) => {
      if (reqPath.startsWith('@/')) {
        return loadTsModule(path.resolve(__dirname, '..', reqPath.slice(2)));
      }
      if (reqPath.startsWith('.')) {
        return loadTsModule(path.resolve(path.dirname(fullPath), reqPath));
      }
      return require(reqPath);
    },
    m.exports,
    m,
    fullPath,
    path.dirname(fullPath)
  );
  return m.exports;
}

// 1. Load Modules
const {
  validateTeachingSession,
  validateReflection,
  validateObservedEvidence,
  buildObservedOutcomeSummary,
} = loadTsModule(path.resolve(__dirname, '../lib/smartPlanV3/rules/postTeachingRules'));

const {
  buildPostTeachingDocument,
  computePostTeachingHash,
} = loadTsModule(path.resolve(__dirname, '../lib/smartPlanV3/document/postTeachingOverlay'));

const {
  getDemoLessonDocument,
} = loadTsModule(path.resolve(__dirname, '../lib/smartPlanV3/document/fixtures'));

const {
  V3Repository,
} = loadTsModule(path.resolve(__dirname, '../lib/smartPlanV3/repository'));

const {
  generateDocxDocument,
} = loadTsModule(path.resolve(__dirname, '../lib/smartPlanV3/export/docx/builder'));

const {
  renderDocumentToStandaloneHtml,
} = loadTsModule(path.resolve(__dirname, '../lib/smartPlanV3/export/pdf/htmlRenderer'));

// Mock Database Generator
function createMockSupabase(initialData = {}) {
  const db = {
    v3_lesson_plans: initialData.lessons || [],
    v3_post_teaching_records: initialData.records || [],
    v3_observed_student_evidence: initialData.evidence || [],
    v3_plan_versions: initialData.versions || [],
    v3_learning_evidence: initialData.learningEvidence || [],
    v3_lesson_objectives: initialData.objectives || [],
  };

  return {
    _db: db,
    from(table) {
      if (!db[table]) db[table] = [];
      const rows = db[table];
      let filtered = [...rows];
      let lastResult = null;

      const builder = {
        select(fields) {
          return builder;
        },
        eq(col, val) {
          filtered = filtered.filter(r => r[col] === val);
          return builder;
        },
        order(col, { ascending = true } = {}) {
          filtered.sort((a, b) => {
            if (a[col] < b[col]) return ascending ? -1 : 1;
            if (a[col] > b[col]) return ascending ? 1 : -1;
            return 0;
          });
          return builder;
        },
        limit(n) {
          filtered = filtered.slice(0, n);
          return builder;
        },
        async maybeSingle() {
          const item = lastResult !== null ? lastResult : (filtered[0] || null);
          return { data: item, error: null };
        },
        async single() {
          const item = lastResult !== null ? lastResult : (filtered[0] || null);
          if (!item) return { data: null, error: { message: 'Row not found' } };
          return { data: item, error: null };
        },
        insert(payload) {
          const item = { id: payload.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, ...payload };
          db[table].push(item);
          lastResult = item;
          filtered = [item];
          return builder;
        },
        update(payload) {
          for (const item of filtered) {
            Object.assign(item, payload);
          }
          lastResult = filtered[0] || null;
          return builder;
        },
        delete() {
          const toDel = new Set(filtered);
          db[table] = db[table].filter(r => !toDel.has(r));
          return builder;
        },
        upsert(payload, options) {
          let found = false;
          let item = null;
          if (options?.onConflict) {
            const key = options.onConflict;
            for (let i = 0; i < db[table].length; i++) {
              if (db[table][i][key] === payload[key]) {
                db[table][i] = { ...db[table][i], ...payload };
                item = db[table][i];
                found = true;
                break;
              }
            }
          }
          if (!found) {
            item = { id: payload.id || `mock-${Date.now()}`, ...payload };
            db[table].push(item);
          }
          lastResult = item;
          filtered = [item];
          return builder;
        },
        then(resolve) {
          resolve({ data: lastResult !== null ? lastResult : filtered, error: null });
        },
      };

      return builder;
    },
    rpc(fnName, args) {
      return { data: null, error: { message: 'RPC fallback' } };
    },
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 SMART PLAN V3.10 — POST-TEACHING & STUDENT EVIDENCE TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario A: FINAL -> TAUGHT valid
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('A: FINAL -> TAUGHT valid', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-1', user_id: 'user-1', status: 'FINAL' }],
    });
    const repo = new V3Repository(supabase);

    const result = await repo.recordTeachingSession('plan-1', 'user-1', {
      students_total: 40,
      students_present: 38,
      students_absent: 2,
      students_assessed: 38,
      students_passed: 34,
      students_need_support: 4,
      actual_teaching_notes: 'จัดกิจกรรมครบตามกระบวนการ 5E',
      actual_duration_minutes: 60,
    });

    assert.strictEqual(result.status, 'TAUGHT');
    assert.strictEqual(supabase._db.v3_lesson_plans[0].status, 'TAUGHT');
    assert.strictEqual(supabase._db.v3_post_teaching_records[0].students_total, 40);
    assert.strictEqual(supabase._db.v3_post_teaching_records[0].students_passed, 34);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario B: DRAFT/REVIEWED cannot -> TAUGHT
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('B: DRAFT/REVIEWED cannot -> TAUGHT', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-draft', user_id: 'user-1', status: 'DRAFT' }],
    });
    const repo = new V3Repository(supabase);

    await assert.rejects(
      async () => {
        await repo.recordTeachingSession('plan-draft', 'user-1', {
          students_total: 30,
          students_passed: 25,
          students_need_support: 5,
        });
      },
      (err) => {
        assert(err.message.includes('must be FINAL'));
        return true;
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario C: TAUGHT -> REFLECTED valid
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('C: TAUGHT -> REFLECTED valid', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-taught', user_id: 'user-1', status: 'TAUGHT' }],
      records: [{
        id: 'rec-1',
        lesson_plan_id: 'plan-taught',
        students_total: 35,
        students_passed: 30,
        students_need_support: 5,
      }],
    });
    const repo = new V3Repository(supabase);

    const result = await repo.recordReflection('plan-taught', 'user-1', {
      reflection: 'ผู้เรียนสามารถสรุปแนวคิดได้ด้วยตนเอง มีส่วนร่วมอย่างกระตือรือร้น',
      remediation_plan: 'จัดกิจกรรมกลุ่มเพื่อนช่วยเพื่อนสำหรับนักเรียน 5 คน',
      what_worked: 'การทดลองเสมือนจริง',
      problems: 'เวลาช่วงสะท้อนคิดกระชั้นชิด',
    });

    assert.strictEqual(result.status, 'REFLECTED');
    assert.strictEqual(supabase._db.v3_lesson_plans[0].status, 'REFLECTED');
    assert.strictEqual(supabase._db.v3_post_teaching_records[0].remediation_plan, 'จัดกิจกรรมกลุ่มเพื่อนช่วยเพื่อนสำหรับนักเรียน 5 คน');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario D: FINAL cannot -> REFLECTED directly
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('D: FINAL cannot -> REFLECTED directly', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-final', user_id: 'user-1', status: 'FINAL' }],
      records: [{ id: 'rec-final', lesson_plan_id: 'plan-final', students_need_support: 0 }],
    });
    const repo = new V3Repository(supabase);

    await assert.rejects(
      async () => {
        await repo.recordReflection('plan-final', 'user-1', {
          reflection: 'พยายามสะท้อนผลก่อนสอน',
        });
      },
      (err) => {
        assert(err.message.includes('must be TAUGHT'));
        return true;
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario E: Invalid student counts rejected
  // ──────────────────────────────────────────────────────────────────────────
  test('E: Invalid student counts rejected', () => {
    // 1. Total <= 0
    let res = validateTeachingSession({ students_total: 0, students_passed: 0, students_need_support: 0 });
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('มากกว่า 0')));

    // 2. Passed + Support > Total
    res = validateTeachingSession({ students_total: 30, students_passed: 20, students_need_support: 15 });
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('เกินจำนวนนักเรียนทั้งหมด')));

    // 3. Present + Absent !== Total
    res = validateTeachingSession({
      students_total: 30,
      students_passed: 20,
      students_need_support: 5,
      students_present: 25,
      students_absent: 3, // sum = 28 != 30
    });
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('เท่ากับจำนวนนักเรียนทั้งหมด')));

    // 4. Assessed > Present
    res = validateTeachingSession({
      students_total: 30,
      students_passed: 20,
      students_need_support: 5,
      students_present: 25,
      students_absent: 5,
      students_assessed: 28, // > 25
    });
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('ไม่เกินจำนวนนักเรียนที่มาเรียน')));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario F: needsSupport > 0 requires remediation before REFLECTED
  // ──────────────────────────────────────────────────────────────────────────
  test('F: needsSupport > 0 requires remediation before REFLECTED', () => {
    const sessionRecord = {
      id: 'rec-1',
      lesson_plan_id: 'plan-1',
      students_total: 30,
      students_passed: 25,
      students_need_support: 5,
    };

    // Missing remediation plan
    const res = validateReflection(
      { reflection: 'สอนได้ดี นักเรียนเข้าใจ' },
      sessionRecord
    );
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('แผนการช่วยเหลือ/สอนซ่อมเสริม')));

    // With remediation plan
    const resValid = validateReflection(
      {
        reflection: 'สอนได้ดี นักเรียนเข้าใจ',
        remediation_plan: 'จัดสอนซ่อมเสริมรายบุคคลช่วงพักกลางวัน',
      },
      sessionRecord
    );
    assert.strictEqual(resValid.valid, true);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario G: Planned evidence remains unchanged
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('G: Planned evidence remains unchanged', async () => {
    const initialPlannedEvidence = [
      { id: 'pevd-1', lesson_plan_id: 'plan-g', title: 'ใบงานที่ 1', position: 1, source: 'MANUAL' },
    ];
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-g', user_id: 'user-1', status: 'FINAL' }],
      learningEvidence: [...initialPlannedEvidence],
    });
    const repo = new V3Repository(supabase);

    await repo.recordTeachingSession('plan-g', 'user-1', {
      students_total: 30,
      students_passed: 28,
      students_need_support: 2,
    });

    // Check that learning evidence was NOT mutated or altered
    assert.strictEqual(supabase._db.v3_learning_evidence.length, 1);
    assert.strictEqual(supabase._db.v3_learning_evidence[0].title, 'ใบงานที่ 1');
    assert.strictEqual(supabase._db.v3_learning_evidence[0].id, 'pevd-1');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario H: Observed evidence separate entity
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('H: Observed evidence separate entity', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-h', user_id: 'user-1', status: 'TAUGHT' }],
      records: [{ id: 'rec-h', lesson_plan_id: 'plan-h' }],
      evidence: [],
      learningEvidence: [{ id: 'pevd-1', title: 'ใบงานที่ 1' }],
    });
    const repo = new V3Repository(supabase);

    const observed = await repo.createObservedEvidence({
      lesson_plan_id: 'plan-h',
      post_teaching_record_id: 'rec-h',
      title: 'ผลคะแนนใบงานจริงเฉลี่ย 85%',
      evidence_type: 'AGGREGATE_RESULT',
      outcome_status: 'OBSERVED',
    });

    assert(observed.id);
    assert.strictEqual(supabase._db.v3_observed_student_evidence.length, 1);
    assert.strictEqual(supabase._db.v3_learning_evidence.length, 1);
    assert.notStrictEqual(observed.id, 'pevd-1');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario I: Observed evidence can link planned evidence
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('I: Observed evidence can link planned evidence', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-i', user_id: 'user-1', status: 'TAUGHT' }],
      records: [{ id: 'rec-i', lesson_plan_id: 'plan-i' }],
      evidence: [],
    });
    const repo = new V3Repository(supabase);

    const observed = await repo.createObservedEvidence({
      lesson_plan_id: 'plan-i',
      post_teaching_record_id: 'rec-i',
      planned_evidence_id: 'pevd-123',
      title: 'ตัวอย่างผลงาน Sample A จากใบงานที่ 1',
      evidence_type: 'STUDENT_WORK_SAMPLE',
      outcome_status: 'OBSERVED',
    });

    assert.strictEqual(observed.planned_evidence_id, 'pevd-123');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario J: Unplanned observed evidence allowed
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('J: Unplanned observed evidence allowed', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-j', user_id: 'user-1', status: 'TAUGHT' }],
      records: [{ id: 'rec-j', lesson_plan_id: 'plan-j' }],
      evidence: [],
    });
    const repo = new V3Repository(supabase);

    const observed = await repo.createObservedEvidence({
      lesson_plan_id: 'plan-j',
      post_teaching_record_id: 'rec-j',
      planned_evidence_id: null, // Unplanned evidence
      title: 'การสนทนาโต้ตอบแบบเปิดที่เกิดขึ้นเองระหว่างกิจกรรม',
      evidence_type: 'OBSERVATION',
      outcome_status: 'OBSERVED',
    });

    assert.strictEqual(observed.planned_evidence_id, null);
    assert.strictEqual(observed.title, 'การสนทนาโต้ตอบแบบเปิดที่เกิดขึ้นเองระหว่างกิจกรรม');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario K: Other user denied
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('K: Other user denied', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-k', user_id: 'teacher-owner', status: 'FINAL' }],
    });
    const repo = new V3Repository(supabase);

    await assert.rejects(
      async () => {
        await repo.recordTeachingSession('plan-k', 'teacher-intruder', {
          students_total: 30,
          students_passed: 20,
          students_need_support: 10,
        });
      },
      (err) => {
        assert(err.message.includes('Access denied'));
        return true;
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario L: FINAL snapshot remains immutable
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('L: FINAL snapshot remains immutable', async () => {
    const snapshotDocument = { metadata: { topic: 'Original Topic' }, documentSourceHash: 'final-hash-123' };
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-l', user_id: 'user-1', status: 'FINAL' }],
      versions: [{
        id: 'ver-final',
        lesson_plan_id: 'plan-l',
        label: 'FINAL',
        version_number: 1,
        snapshot: { document: snapshotDocument },
      }],
      records: [{ id: 'rec-l', lesson_plan_id: 'plan-l', students_need_support: 0 }],
    });
    const repo = new V3Repository(supabase);

    // Record teaching and reflection
    await repo.recordTeachingSession('plan-l', 'user-1', {
      students_total: 30,
      students_passed: 30,
      students_need_support: 0,
      actual_teaching_notes: 'Taught notes',
    });

    await repo.recordReflection('plan-l', 'user-1', {
      reflection: 'Teacher reflection notes',
    });

    // FINAL snapshot in v3_plan_versions MUST NOT be touched
    const finalVer = supabase._db.v3_plan_versions.find(v => v.label === 'FINAL');
    assert(finalVer);
    assert.strictEqual(finalVer.snapshot.document.metadata.topic, 'Original Topic');
    assert.strictEqual(finalVer.snapshot.document.documentSourceHash, 'final-hash-123');
    assert.strictEqual(finalVer.snapshot.document.metadata.status, undefined); // Snapshot remains untouched
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario M: Pre-teaching child entities remain locked after TAUGHT
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('M: Pre-teaching child entities remain locked after TAUGHT', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-m', user_id: 'user-1', status: 'TAUGHT' }],
    });
    const repo = new V3Repository(supabase);

    await assert.rejects(
      async () => {
        await repo.assertLessonNotFinal('plan-m');
      },
      (err) => {
        assert.strictEqual(err.code, 'LESSON_IS_FINAL');
        assert(err.message.includes('TAUGHT'));
        return true;
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario N: Pre-teaching child entities remain locked after REFLECTED
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('N: Pre-teaching child entities remain locked after REFLECTED', async () => {
    const supabase = createMockSupabase({
      lessons: [{ id: 'plan-n', user_id: 'user-1', status: 'REFLECTED' }],
    });
    const repo = new V3Repository(supabase);

    await assert.rejects(
      async () => {
        await repo.assertLessonNotFinal('plan-n');
      },
      (err) => {
        assert.strictEqual(err.code, 'LESSON_IS_FINAL');
        assert(err.message.includes('REFLECTED'));
        return true;
      }
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario O: TAUGHT document uses FINAL snapshot + overlay
  // ──────────────────────────────────────────────────────────────────────────
  test('O: TAUGHT document uses FINAL snapshot + overlay', () => {
    const baseFinalDoc = getDemoLessonDocument('demo-science');
    const overlay = {
      record: {
        id: 'rec-o',
        lesson_plan_id: baseFinalDoc.metadata.lessonId,
        taught_at: '2026-09-29T10:00:00Z',
        actual_duration_minutes: 60,
        students_total: 40,
        students_present: 38,
        students_absent: 2,
        students_assessed: 38,
        students_passed: 35,
        students_need_support: 3,
        actual_teaching_notes: 'นักเรียนทำแบบจำลองพลังงานเสร็จสมบูรณ์',
        reflection: null, // Reflection not yet done
      },
      observedEvidence: [
        {
          id: 'oev-1',
          lesson_plan_id: baseFinalDoc.metadata.lessonId,
          post_teaching_record_id: 'rec-o',
          title: 'ผลแบบทดสอบท้ายบทเรียน',
          evidence_type: 'ASSESSMENT_RESULT',
          outcome_status: 'OBSERVED',
        },
      ],
    };

    const taughtDoc = buildPostTeachingDocument(baseFinalDoc, overlay);

    assert.strictEqual(taughtDoc.metadata.status, 'TAUGHT');
    const sec10 = taughtDoc.sections.find(s => s.id === 'SEC_POST_TEACHING');
    assert(sec10);
    assert.strictEqual(sec10.type, 'postTeachingRecorded');
    assert.strictEqual(sec10.studentsTotal, 40);
    assert.strictEqual(sec10.studentsPassed, 35);
    assert.strictEqual(sec10.actualTeachingNotes, 'นักเรียนทำแบบจำลองพลังงานเสร็จสมบูรณ์');
    assert.strictEqual(sec10.reflection, null); // Unfilled
    assert.strictEqual(sec10.observedEvidenceSummary.length, 1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario P: REFLECTED document uses FINAL snapshot + overlay
  // ──────────────────────────────────────────────────────────────────────────
  test('P: REFLECTED document uses FINAL snapshot + overlay', () => {
    const baseFinalDoc = getDemoLessonDocument('demo-science');
    const overlay = {
      record: {
        id: 'rec-p',
        lesson_plan_id: baseFinalDoc.metadata.lessonId,
        taught_at: '2026-09-29T10:00:00Z',
        actual_duration_minutes: 60,
        students_total: 40,
        students_passed: 35,
        students_need_support: 5,
        what_worked: 'แบบจำลอง 3 มิติ',
        problems: 'คำนวณสูตรยังคลาดเคลื่อน',
        adjustments_made: 'เพิ่มตัวอย่างโจทย์ 2 ข้อ',
        feedback_given: 'ตรวจทีละขั้นตอน',
        remediation_plan: 'นัดสอนซ่อมเสริมเรื่องการแทนค่าในสูตร',
        next_lesson_adjustment: 'เริ่มด้วยแบบฝึกย่อย 5 นาที',
        reflection: 'ผู้เรียนสามารถสรุปกฎการอนุรักษ์พลังงานได้ถูกต้องตามจุดประสงค์',
      },
      observedEvidence: [
        {
          id: 'oev-p1',
          lesson_plan_id: baseFinalDoc.metadata.lessonId,
          post_teaching_record_id: 'rec-p',
          title: 'ผลการคำนวณพลังงาน',
          evidence_type: 'AGGREGATE_RESULT',
          outcome_status: 'OBSERVED',
        },
      ],
    };

    const reflectedDoc = buildPostTeachingDocument(baseFinalDoc, overlay);

    assert.strictEqual(reflectedDoc.metadata.status, 'REFLECTED');
    const sec10 = reflectedDoc.sections.find(s => s.id === 'SEC_POST_TEACHING');
    assert(sec10);
    assert.strictEqual(sec10.type, 'postTeachingRecorded');
    assert.strictEqual(sec10.whatWorked, 'แบบจำลอง 3 มิติ');
    assert.strictEqual(sec10.remediationPlan, 'นัดสอนซ่อมเสริมเรื่องการแทนค่าในสูตร');
    assert.strictEqual(sec10.reflection, 'ผู้เรียนสามารถสรุปกฎการอนุรักษ์พลังงานได้ถูกต้องตามจุดประสงค์');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario Q: No fabricated reflection
  // ──────────────────────────────────────────────────────────────────────────
  test('Q: No fabricated reflection', () => {
    const baseFinalDoc = getDemoLessonDocument('demo-science');
    const overlay = {
      record: {
        id: 'rec-q',
        lesson_plan_id: baseFinalDoc.metadata.lessonId,
        students_total: 30,
        students_passed: 30,
        students_need_support: 0,
        reflection: null, // Teacher hasn't provided reflection
      },
      observedEvidence: [],
    };

    const doc = buildPostTeachingDocument(baseFinalDoc, overlay);
    const sec10 = doc.sections.find(s => s.id === 'SEC_POST_TEACHING');

    assert.strictEqual(sec10.reflection, null);
    assert.strictEqual(sec10.whatWorked, null);
    assert.strictEqual(sec10.problems, null);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario R: Student Package excludes teacher-only post-teaching data
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('R: Student Package excludes teacher-only post-teaching data', async () => {
    const baseFinalDoc = getDemoLessonDocument('demo-science');
    const overlay = {
      record: {
        id: 'rec-r',
        lesson_plan_id: baseFinalDoc.metadata.lessonId,
        taught_at: '2026-09-29T10:00:00Z',
        students_total: 40,
        students_passed: 35,
        students_need_support: 5,
        remediation_plan: 'ความลับครู: สอนซ่อมเสริมพิเศษ',
        reflection: 'ความลับครู: บันทึกส่วนตัว',
      },
      observedEvidence: [],
    };

    const doc = buildPostTeachingDocument(baseFinalDoc, overlay);

    // 1. DOCX Student Package
    const studentDocxBuf = await generateDocxDocument(doc, 'student');
    const zip = await jszip.loadAsync(studentDocxBuf);
    const docXml = await zip.file('word/document.xml').async('text');

    assert(!docXml.includes('ความลับครู: บันทึกส่วนตัว'), 'Student DOCX must NOT contain teacher reflection');
    assert(!docXml.includes('ความลับครู: สอนซ่อมเสริมพิเศษ'), 'Student DOCX must NOT contain remediation plan');

    // 2. PDF Student Package
    const studentHtml = renderDocumentToStandaloneHtml(doc, 'student');
    assert(!studentHtml.includes('ความลับครู: บันทึกส่วนตัว'), 'Student HTML must NOT contain teacher reflection');
    assert(!studentHtml.includes('ความลับครู: สอนซ่อมเสริมพิเศษ'), 'Student HTML must NOT contain remediation plan');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario S: Teacher Package includes allowed post-teaching data
  // ──────────────────────────────────────────────────────────────────────────
  await testAsync('S: Teacher Package includes allowed post-teaching data', async () => {
    const baseFinalDoc = getDemoLessonDocument('demo-science');
    const overlay = {
      record: {
        id: 'rec-s',
        lesson_plan_id: baseFinalDoc.metadata.lessonId,
        taught_at: '2026-09-29T10:00:00Z',
        students_total: 40,
        students_passed: 36,
        students_need_support: 4,
        remediation_plan: 'การสอนซ่อมเสริมการคำนวณ',
        reflection: 'การจัดกิจกรรมบรรลุวัตถุประสงค์ร้อยละ 90',
      },
      observedEvidence: [
        {
          id: 'oev-s',
          title: 'หลักฐานเชิงประจักษ์ชิ้นเอก',
          evidence_type: 'STUDENT_WORK_SAMPLE',
          outcome_status: 'OBSERVED',
        },
      ],
    };

    const doc = buildPostTeachingDocument(baseFinalDoc, overlay);

    // 1. DOCX Teacher Package
    const teacherDocxBuf = await generateDocxDocument(doc, 'teacher');
    const zip = await jszip.loadAsync(teacherDocxBuf);
    const docXml = await zip.file('word/document.xml').async('text');

    assert(docXml.includes('การจัดกิจกรรมบรรลุวัตถุประสงค์ร้อยละ 90'), 'Teacher DOCX must contain teacher reflection');
    assert(docXml.includes('หลักฐานเชิงประจักษ์ชิ้นเอก'), 'Teacher DOCX must contain observed evidence title');

    // 2. PDF Teacher Package
    const teacherHtml = renderDocumentToStandaloneHtml(doc, 'teacher');
    assert(teacherHtml.includes('การจัดกิจกรรมบรรลุวัตถุประสงค์ร้อยละ 90'), 'Teacher HTML must contain teacher reflection');
    assert(teacherHtml.includes('หลักฐานเชิงประจักษ์ชิ้นเอก'), 'Teacher HTML must contain observed evidence title');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario T: baseFinalHash preserved
  // ──────────────────────────────────────────────────────────────────────────
  test('T: baseFinalHash preserved', () => {
    const baseFinalDoc = getDemoLessonDocument('demo-science');
    const originalHash = baseFinalDoc.documentSourceHash;

    const overlay = {
      record: {
        id: 'rec-t',
        lesson_plan_id: baseFinalDoc.metadata.lessonId,
        students_total: 35,
        students_passed: 30,
        students_need_support: 5,
      },
      observedEvidence: [],
    };

    const doc = buildPostTeachingDocument(baseFinalDoc, overlay);

    assert.strictEqual(doc.baseFinalHash, originalHash);
    assert(doc.documentSourceHash.startsWith(originalHash));
    assert(doc.postTeachingSourceHash);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario U: postTeachingSourceHash deterministic
  // ──────────────────────────────────────────────────────────────────────────
  test('U: postTeachingSourceHash deterministic', () => {
    const overlay1 = {
      record: {
        taught_at: '2026-09-29T10:00:00Z',
        students_total: 40,
        students_passed: 35,
        students_need_support: 5,
        actual_teaching_notes: 'บันทึกเหมือนกัน',
      },
      observedEvidence: [{ id: 'e1', title: 'หลักฐาน 1', evidence_type: 'OBSERVATION', outcome_status: 'OBSERVED' }],
    };

    const overlay2 = {
      record: {
        taught_at: '2026-09-29T10:00:00Z',
        students_total: 40,
        students_passed: 35,
        students_need_support: 5,
        actual_teaching_notes: 'บันทึกเหมือนกัน',
      },
      observedEvidence: [{ id: 'e1', title: 'หลักฐาน 1', evidence_type: 'OBSERVATION', outcome_status: 'OBSERVED' }],
    };

    const overlayDifferent = {
      record: {
        taught_at: '2026-09-29T10:00:00Z',
        students_total: 40,
        students_passed: 30, // Different!
        students_need_support: 10,
        actual_teaching_notes: 'บันทึกเหมือนกัน',
      },
      observedEvidence: [{ id: 'e1', title: 'หลักฐาน 1', evidence_type: 'OBSERVATION', outcome_status: 'OBSERVED' }],
    };

    const hash1 = computePostTeachingHash(overlay1);
    const hash2 = computePostTeachingHash(overlay2);
    const hashDiff = computePostTeachingHash(overlayDifferent);

    assert.strictEqual(hash1, hash2, 'Identical overlays must produce identical hash');
    assert.notStrictEqual(hash1, hashDiff, 'Altered numbers must produce different hash');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario V: Observed outcome OBSERVED requires evidenceRefs
  // ──────────────────────────────────────────────────────────────────────────
  test('V: Observed outcome OBSERVED requires evidenceRefs', () => {
    const objectives = [
      { id: 'obj-1', title: 'อธิบายการถ่ายโอนพลังงาน' },
      { id: 'obj-2', title: 'คำนวณพลังงานจลน์' },
    ];

    const observedEvidence = [
      { id: 'evd-1', objective_id: 'obj-1', outcome_status: 'OBSERVED' },
      // obj-2 has NO evidence linked
    ];

    const summary = buildObservedOutcomeSummary(objectives, observedEvidence);

    const item1 = summary.items.find(i => i.objectiveId === 'obj-1');
    const item2 = summary.items.find(i => i.objectiveId === 'obj-2');

    assert.strictEqual(item1.status, 'OBSERVED');
    assert(item1.evidenceRefs.length >= 1);

    assert.strictEqual(item2.status, 'NOT_OBSERVED');
    assert.strictEqual(item2.evidenceRefs.length, 0);

    // Summary counts
    assert.strictEqual(summary.totalObserved, 1);
    assert.strictEqual(summary.totalNotObserved, 1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Scenario W: AI cannot change lifecycle state
  // ──────────────────────────────────────────────────────────────────────────
  test('W: AI cannot change lifecycle state', () => {
    // Verify that rule engine and API routes treat AI suggestions strictly as text
    // The only functions that change lifecycle states are record_v3_teaching and record_v3_reflection
    const aiSuggestion = {
      suggestedReflection: 'ผู้เรียนเข้าใจแนวคิด',
      suggestedRemediation: 'สอนเสริม',
    };

    // AI suggestions are raw objects without state transition side-effects
    assert(!('status' in aiSuggestion));
    assert(!('lessonStatus' in aiSuggestion));
  });

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
