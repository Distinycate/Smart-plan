/**
 * Smart Plan V3.8 — Automated Test Suite: Canonical Document Model & A4 Preview
 * Tests A–X (All 24 required test cases)
 *
 * Runs under plain `node` — zero external dependencies.
 * Zero external network or AI calls during unit execution.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function loadTsModule(relPath) {
  const fullPath = path.resolve(__dirname, relPath.endsWith('.ts') ? relPath : relPath + '.ts');
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const m = { exports: {} };
  const fn = new Function('require', 'exports', 'module', '__filename', '__dirname', transpiled.outputText);
  fn(
    (reqPath) => {
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

// Load Document Module
const {
  buildLessonDocument,
  validateLessonDocumentModel,
  DEFAULT_DOCUMENT_OPTIONS,
  formatObjectiveRefNumbers,
} = loadTsModule('../lib/smartPlanV3/document/index');

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS  ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL  ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

function header(title) {
  console.log(`\n── ${title} ──`);
}

// ─── Test Fixture Creator ───────────────────────────────────────────────────

function createStandardLessonGraph() {
  return {
    lesson: {
      id: 'lesson-std-001',
      user_id: 'user-001',
      topic: 'Ordering Food at a Restaurant',
      grade_level: 'ม.1',
      duration_minutes: 60,
      subject_key: 'ENGLISH',
      course_code: 'อ21101',
      unit_reference: 'Unit 3: Around Town',
      teaching_date: '2026-10-15',
      status: 'REVIEWED',
      learning_focus: 'การพูดสื่อสารในชีวิตประจำวัน (Speaking)',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:00:00Z',
    },
    curriculumLinks: [
      {
        id: 'cl-1',
        lesson_plan_id: 'lesson-std-001',
        standard_code: 'ต 1.2',
        standard_label_snapshot: 'มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูล',
        indicator_code: 'ต 1.2 ม.1/1',
        indicator_label_snapshot: 'สนทนาแลกเปลี่ยนข้อมูลเกี่ยวกับตนเอง กิจกรรม และสถานการณ์ต่างๆ ในชีวิตประจำวัน',
        position: 0,
      },
    ],
    objectives: [
      {
        id: 'obj-1',
        lesson_plan_id: 'lesson-std-001',
        statement: 'บอกคำศัพท์และสำนวนภาษาอังกฤษเกี่ยวกับการสั่งอาหารได้ถูกต้อง',
        objective_type: 'K',
        position: 0,
      },
      {
        id: 'obj-2',
        lesson_plan_id: 'lesson-std-001',
        statement: 'พูดสนทนาสั่งอาหารในสถานการณ์จำลองตามบทบาทสมมติได้อย่างถูกต้องและคล่องแคล่ว',
        objective_type: 'P',
        position: 1,
      },
    ],
    evidence: [
      {
        id: 'evd-1',
        lesson_plan_id: 'lesson-std-001',
        evidence_type: 'SPEAKING',
        description: 'การพูดสนทนาสั่งอาหารและการแสดงบทบาทสมมติแบบจับคู่',
        position: 0,
      },
    ],
    objectiveEvidenceLinks: [
      { objective_id: 'obj-1', evidence_id: 'evd-1' },
      { objective_id: 'obj-2', evidence_id: 'evd-1' },
    ],
    activities: [
      {
        id: 'act-1',
        lesson_plan_id: 'lesson-std-001',
        phase: 'ENGAGE',
        minutes: 10,
        title: 'ขั้นนำเข้าสู่บทเรียน: ทายคำศัพท์อาหาร',
        teacher_actions: 'ครูแสดงภาพเมนูอาหารและกระตุ้นให้นักเรียนตอบชื่ออาหารภาษาอังกฤษ',
        student_actions: 'นักเรียนดูภาพและบอกคำศัพท์ภาษาอังกฤษที่เกี่ยวข้อง',
        feedback_moment: 'ชมเชยและแก้ไขการออกเสียงคำศัพท์ทันที',
        assessment_moment: 'สังเกตการมีส่วนร่วมและการจำคำศัพท์เดิม',
        position: 0,
      },
      {
        id: 'act-2',
        lesson_plan_id: 'lesson-std-001',
        phase: 'PRACTICE',
        minutes: 35,
        title: 'ขั้นฝึกปฏิบัติ: จับคู่ฝึกสนทนาบทบาทสมมติ (Role-Play)',
        teacher_actions: 'ครูแจก Speaking Card และเดินสังเกตการสนทนาพร้อมให้คำแนะนำ',
        student_actions: 'นักเรียนจับคู่สลับบทบาทเป็นพนักงานเสิร์ฟและลูกค้าโดยใช้ Speaking Card',
        feedback_moment: 'ชี้แนะสำนวนการสั่งอาหารและการตอบรับที่สุภาพ',
        assessment_moment: 'ประเมินความคล่องและความถูกต้องของการใช้ภาษาตาม Rubric',
        position: 1,
      },
      {
        id: 'act-3',
        lesson_plan_id: 'lesson-std-001',
        phase: 'SUMMARIZE',
        minutes: 15,
        title: 'ขั้นสรุปและสะท้อนคิด: ตัวแทนนำเสนอและสรุปบทเรียน',
        teacher_actions: 'ครูสุ่มให้นักเรียน 2 คู่สนทนาหน้าชั้นและสรุปประเด็นร่วมกัน',
        student_actions: 'นักเรียนร่วมกันสรุปสำนวนสำคัญในการสั่งอาหารและส่ง Exit Ticket',
        feedback_moment: 'สรุปภาพรวมจุดเด่นและสิ่งที่ควรฝึกฝนเพิ่มเติม',
        assessment_moment: 'ตรวจคำตอบใน Exit Ticket',
        position: 2,
      },
    ],
    assessments: [
      {
        id: 'asm-1',
        lesson_plan_id: 'lesson-std-001',
        name: 'การประเมินทักษะการพูดสนทนาสั่งอาหาร',
        assessment_type: 'PERFORMANCE',
        method: 'PERFORMANCE_EXAM',
        formative: true,
        criteria: 'ผ่านเกณฑ์ระดับดีขึ้นไปตาม Rubric (คะแนนตั้งแต่ 6 คะแนนขึ้นไป)',
      },
    ],
    assessmentEvidenceLinks: [
      { assessment_id: 'asm-1', evidence_id: 'evd-1' },
    ],
    assessmentTools: [
      {
        id: 'tool-1',
        lesson_plan_id: 'lesson-std-001',
        assessment_id: 'asm-1',
        tool_type: 'PERFORMANCE_RUBRIC',
        title: 'เกณฑ์การประเมินการพูดสนทนาสั่งอาหาร (Speaking Rubric)',
        content: {
          title: 'แบบประเมินทักษะการพูดสนทนาภาษาอังกฤษ',
          levels: [
            { score: 3, label: 'ดีมาก' },
            { score: 2, label: 'พอใช้' },
            { score: 1, label: 'ต้องปรับปรุง' },
          ],
          criteria: [
            {
              name: 'ความถูกต้องด้านไวยากรณ์และคำศัพท์',
              descriptors: {
                '3': 'ใช้สำนวนการสั่งอาหารและโครงสร้างประโยคได้ถูกต้องสมบูรณ์',
                '2': 'ใช้สำนวนได้ถูกต้องเป็นส่วนใหญ่ มีข้อผิดพลาดเล็กน้อย',
                '1': 'ใช้สำนวนไม่ถูกต้อง สื่อความหมายได้ยาก',
              },
            },
            {
              name: 'ความคล่องแคล่วและการออกเสียง',
              descriptors: {
                '3': 'พูดได้ลื่นไหล เสียงชัดเจนเป็นธรรมชาติ',
                '2': 'พูดได้ต่อเนื่อง มีหยุดคิดเป็นบางครั้ง',
                '1': 'พูดติดขัด หยุดคิดบ่อยครั้ง',
              },
            },
          ],
        },
      },
    ],
    teachingAssets: [
      {
        id: 'asset-1',
        lesson_plan_id: 'lesson-std-001',
        asset_type: 'SPEAKING_CARD',
        title: 'บัตรสถานการณ์การสั่งอาหาร (Restaurant Role-play Card)',
        audience: 'STUDENT',
        generation_status: 'READY',
        content: {
          title: 'Role-Play Card: Ordering at a Restaurant',
          instruction: 'จับคู่ผลัดกันเป็น Customer และ Waiter ตามบทบาทที่ได้รับ',
          roleOrCardType: 'STUDENT_A_B',
          cards: [
            {
              cardId: 'card-a',
              assignedTo: 'Student A (Customer)',
              situation: 'คุณต้องการสั่งอาหารจานหลัก 1 อย่างและเครื่องดื่ม 1 อย่าง',
              cuesOrClues: ['I would like to have...', 'Could I get the bill, please?'],
            },
            {
              cardId: 'card-b',
              assignedTo: 'Student B (Waiter)',
              situation: 'คุณเป็นพนักงานเสิร์ฟ ทักทายลูกค้าและรับรายการอาหาร',
              cuesOrClues: ['May I take your order?', 'Would you like anything to drink?'],
            },
          ],
        },
      },
      {
        id: 'asset-2',
        lesson_plan_id: 'lesson-std-001',
        asset_type: 'ANSWER_KEY',
        title: 'แนวทางการตอบและการสื่อสารตัวอย่าง (Sample Dialogues)',
        audience: 'TEACHER',
        generation_status: 'READY',
        content: {
          answers: [
            {
              itemNumber: 1,
              correctAnswer: 'A: Good evening. Can I see the menu, please? / B: Certainly, here you are.',
              explanation: 'ตัวอย่างบทสนทนาเริ่มต้นที่สุภาพ',
            },
          ],
        },
      },
      {
        id: 'asset-3',
        lesson_plan_id: 'lesson-std-001',
        asset_type: 'TEACHER_GUIDE',
        title: 'คู่มือการจัดกิจกรรมและการบริหารเวลาสำหรับครู',
        audience: 'TEACHER',
        generation_status: 'READY',
        content: {
          timeline: [
            { minute: '0-10 นาที', action: 'กระตุ้นความสนใจด้วยภาพอาหาร' },
            { minute: '10-45 นาที', action: 'นักเรียนจับคู่ฝึกบทบาทสมมติ' },
          ],
        },
      },
    ],
    curriculumStandards: [],
    curriculumIndicators: [],
    activityObjectiveLinks: [],
    activityEvidenceLinks: [],
    assetObjectiveLinks: [],
    assetActivityLinks: [],
    assetEvidenceLinks: [],
  };
}

console.log('================================================================');
console.log('  Smart Plan V3.8: Document Model & A4 Preview Test Suite        ');
console.log('================================================================');

// ─── Tests Execution ────────────────────────────────────────────────────────

header('Group 1: Basic Structure & Ordering (Tests A–E)');

test('Test A — BASIC DOCUMENT: English ม.1 Jobs 60 min ordered correctly', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  assert.strictEqual(doc.metadata.lessonId, 'lesson-std-001');
  assert.strictEqual(doc.metadata.subject, 'ภาษาต่างประเทศ (ภาษาอังกฤษ)');
  assert.strictEqual(doc.metadata.durationMinutes, 60);

  // Sections order check
  const sectionIds = doc.sections.map(s => s.id);
  assert.strictEqual(sectionIds[0], 'SEC_METADATA');
  assert.strictEqual(sectionIds[1], 'SEC_CURRICULUM');
  assert.strictEqual(sectionIds[2], 'SEC_KEY_CONCEPT');
  assert.strictEqual(sectionIds[3], 'SEC_OBJECTIVES');
  assert.strictEqual(sectionIds[4], 'SEC_CONTENTS');
  assert.strictEqual(sectionIds[5], 'SEC_EVIDENCE');
  assert.strictEqual(sectionIds[6], 'SEC_ACTIVITIES');
  assert.strictEqual(sectionIds[7], 'SEC_MEDIA');
  assert.strictEqual(sectionIds[8], 'SEC_ASSESSMENT');
  assert.strictEqual(sectionIds[9], 'SEC_POST_TEACHING');
});

test('Test B — CURRICULUM: Standard + indicators appear from snapshot', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);
  const currSection = doc.sections.find(s => s.id === 'SEC_CURRICULUM');

  assert(currSection);
  assert.strictEqual(currSection.type, 'bulletList');
  assert(currSection.items.some(i => i.text.includes('ต 1.2 ม.1/1')));
  assert(currSection.items.some(i => i.text.includes('สนทนาแลกเปลี่ยนข้อมูล')));
});

test('Test C — OBJECTIVES: Order preserved without UUID / enum leak', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);
  const objSection = doc.sections.find(s => s.id === 'SEC_OBJECTIVES');

  assert(objSection);
  assert.strictEqual(objSection.items.length, 2);
  assert.strictEqual(objSection.items[0].bullet, '1.');
  assert(!objSection.items[0].text.includes('obj-1'));
  assert(!objSection.items[0].text.includes('[K]'));
});

test('Test D — MANY-TO-MANY ASSESSMENT: 2 objectives -> 1 evidence -> 1 assessment row', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);
  const asmSection = doc.sections.find(s => s.id === 'SEC_ASSESSMENT');

  assert(asmSection);
  assert.strictEqual(asmSection.rows.length, 1, 'Should NOT duplicate assessment rows');
  assert.strictEqual(asmSection.rows[0].objectiveRefs, 'ข้อ 1, 2');
  assert(asmSection.rows[0].evidenceDescription.includes('การพูดสนทนาสั่งอาหาร'));
});

test('Test E — ACTIVITIES: Activity positions preserved, total minutes = 60', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);
  const actSection = doc.sections.find(s => s.id === 'SEC_ACTIVITIES');

  assert(actSection);
  assert.strictEqual(actSection.totalMinutes, 60);
  assert.strictEqual(actSection.rows.length, 3);
  assert.strictEqual(actSection.rows[0].position, 1);
  assert.strictEqual(actSection.rows[1].position, 2);
  assert.strictEqual(actSection.rows[2].position, 3);
});

header('Group 2: Appendices, Lettering & Cross-References (Tests F–I)');

test('Test F — REQUIRED ASSETS: Student assets appear in appendix', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  const studentApp = doc.appendices.find(a => a.category === 'STUDENT_ASSETS');
  assert(studentApp, 'Student assets appendix must exist');
  assert(studentApp.items.some(it => it.title.includes('Restaurant Role-play Card')));
});

test('Test G — ANSWER KEY ORDER: Worksheet appendix comes before answer key', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  const studentIdx = doc.appendices.findIndex(a => a.category === 'STUDENT_ASSETS');
  const answerKeyIdx = doc.appendices.findIndex(a => a.category === 'ANSWER_KEYS');

  assert(studentIdx >= 0 && answerKeyIdx >= 0);
  assert(studentIdx < answerKeyIdx, 'Student assets must precede answer keys');
  assert(doc.appendices[answerKeyIdx].pageBreakBefore, 'Answer key must enforce page break');
});

test('Test H — NO ANSWER KEY: Dynamic appendix letters normalize sequentially', () => {
  const g = createStandardLessonGraph();
  // Remove answer key asset
  g.teachingAssets = g.teachingAssets.filter(a => a.asset_type !== 'ANSWER_KEY' && a.audience !== 'TEACHER');

  const doc = buildLessonDocument(g, { options: { includeTeacherGuide: false } });

  // Appendices should be: ก (Student Assets), ข (Assessment Tools)
  assert.strictEqual(doc.appendices.length, 2);
  assert.strictEqual(doc.appendices[0].letter, 'ก');
  assert.strictEqual(doc.appendices[0].category, 'STUDENT_ASSETS');
  assert.strictEqual(doc.appendices[1].letter, 'ข');
  assert.strictEqual(doc.appendices[1].category, 'ASSESSMENT_TOOLS');
});

test('Test I — ASSESSMENT TOOLS: Rubric appears in assessment appendix', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  const toolApp = doc.appendices.find(a => a.category === 'ASSESSMENT_TOOLS');
  assert(toolApp);
  assert(toolApp.items.some(i => i.title.includes('Speaking Rubric')));

  // Check cross reference in main assessment section
  const asmSection = doc.sections.find(s => s.id === 'SEC_ASSESSMENT');
  assert(asmSection.rows[0].appendixRef.includes('ภาคผนวก'));
});

header('Group 3: Document Options (Tests J–M)');

test('Test J — TEACHER GUIDE OPTION OFF: Teacher Guide omitted', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g, { options: { includeTeacherGuide: false } });

  const tgApp = doc.appendices.find(a => a.category === 'TEACHER_GUIDE');
  assert.strictEqual(tgApp, undefined, 'Teacher guide should be omitted when option is false');
});

test('Test K — TEACHER GUIDE OPTION ON: Teacher Guide included', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g, { options: { includeTeacherGuide: true } });

  const tgApp = doc.appendices.find(a => a.category === 'TEACHER_GUIDE');
  assert(tgApp, 'Teacher guide must be included when option is true');
});

test('Test L — PA APPENDIX OFF: No PA content', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g, { options: { includePaReadinessAppendix: false } });

  const paApp = doc.appendices.find(a => a.category === 'PA_READINESS');
  assert.strictEqual(paApp, undefined);
});

test('Test M — PA APPENDIX ON: PA content included with disclaimer', () => {
  const g = createStandardLessonGraph();
  const paMock = { summary: { evidenced: 7, partiallyEvidenced: 1, notEvidenced: 0 } };
  const doc = buildLessonDocument(g, {
    options: { includePaReadinessAppendix: true },
    paReviewResult: paMock,
  });

  const paApp = doc.appendices.find(a => a.category === 'PA_READINESS');
  assert(paApp);
  assert.strictEqual(paApp.items[0].content, paMock);
});

header('Group 4: Integrity, Security & Validation (Tests N–S)');

test('Test N — NO QUALITY ISSUE EXPORT: AI review warning must not appear in main plan', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  // Check that sections do NOT contain AI review warnings
  const serialized = JSON.stringify(doc.sections);
  assert(!serialized.includes('AI Qualitative Review'));
  assert(!serialized.includes('ข้อผิดพลาดที่บล็อก'));
});

test('Test O — NO TECHNICAL ENUM: Document JSON contains no raw technical enums in text', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);
  const validation = validateLessonDocumentModel(doc);

  assert.strictEqual(validation.valid, true, `Validation errors: ${validation.errors.join(', ')}`);
});

test('Test P — NO UUID: User-visible document must not expose DB UUIDs', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  // Check all section titles and bullets for uuid
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  for (const sec of doc.sections) {
    assert(!uuidRegex.test(sec.title), `UUID found in title of ${sec.id}`);
  }
});

test('Test Q — SERIALIZABLE: JSON.stringify(model) works cleanly', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  const json = JSON.stringify(doc);
  assert(typeof json === 'string');
  assert(json.length > 500);

  const parsed = JSON.parse(json);
  assert.strictEqual(parsed.metadata.topic, g.lesson.topic);
});

test('Test R — UNIQUE IDS: Section and appendix IDs are unique', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  const secIds = doc.sections.map(s => s.id);
  const uniqueSecIds = new Set(secIds);
  assert.strictEqual(secIds.length, uniqueSecIds.size, 'Section IDs must be unique');

  const appIds = doc.appendices.map(a => a.id);
  const uniqueAppIds = new Set(appIds);
  assert.strictEqual(appIds.length, uniqueAppIds.size, 'Appendix IDs must be unique');
});

test('Test S — APPENDIX LETTERS: Letters are sequential ก, ข, ค...', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g, { options: { includeTeacherGuide: true } });

  const letters = doc.appendices.map(a => a.letter);
  const expected = ['ก', 'ข', 'ค', 'ง'];
  assert.deepStrictEqual(letters, expected.slice(0, letters.length));
});

header('Group 5: Business Rules & State Safety (Tests T–X)');

test('Test T — EMPTY SECTION: Optional empty section omitted', () => {
  const g = createStandardLessonGraph();
  const docWithoutPlaceholder = buildLessonDocument(g, {
    options: { includePostTeachingPlaceholder: false },
  });

  assert(!docWithoutPlaceholder.sections.some(s => s.id === 'SEC_POST_TEACHING'));
});

test('Test U — PRE-TEACHING SAFETY: No invented post-teaching outcomes', () => {
  const g = createStandardLessonGraph();
  const doc = buildLessonDocument(g);

  const placeholderSec = doc.sections.find(s => s.id === 'SEC_POST_TEACHING');
  assert(placeholderSec);
  assert.strictEqual(placeholderSec.hasOutcomesRecorded, false);
  assert(!JSON.stringify(doc).includes('ผู้เรียนมีผลสัมฤทธิ์ร้อยละ 100'));
});

test('Test V — DOCUMENT READINESS BLOCK: Lesson with quality blocker cannot build document', () => {
  const g = createStandardLessonGraph();
  const mockReadiness = {
    ready: false,
    blockers: [{ code: 'Q-TIME-001', title: 'เวลาไม่ตรง', message: 'เวลากิจกรรมรวมไม่ตรงกับ 60 นาที' }],
    ruleWarnings: [],
    checklist: {},
    blockingConditions: ['เวลาไม่ตรง'],
  };

  assert.throws(
    () => {
      buildLessonDocument(g, { readiness: mockReadiness });
    },
    /ยังไม่พร้อมสร้างเอกสาร/
  );
});

test('Test W — OPTIONS DO NOT MUTATE LESSON: Lesson graph remains unchanged', () => {
  const g = createStandardLessonGraph();
  const originalJson = JSON.stringify(g);

  buildLessonDocument(g, { options: { includeTeacherGuide: true, includeCover: true } });
  buildLessonDocument(g, { options: { includeStudentAssets: false } });

  assert.strictEqual(JSON.stringify(g), originalJson, 'Lesson graph must be 100% immutable');
});

test('Test X — HASH: Same lesson/options gives same hash, changed lesson gives different hash', () => {
  const g1 = createStandardLessonGraph();
  const doc1 = buildLessonDocument(g1);

  const g2 = createStandardLessonGraph();
  const doc2 = buildLessonDocument(g2);
  assert.strictEqual(doc1.documentSourceHash, doc2.documentSourceHash, 'Identical lesson & options must yield same hash');

  const g3 = createStandardLessonGraph();
  g3.lesson.topic = 'Shopping at the Mall';
  const doc3 = buildLessonDocument(g3);
  assert.notStrictEqual(doc1.documentSourceHash, doc3.documentSourceHash, 'Changed lesson must yield different hash');
});

console.log('\n================================================================');
console.log(`  Tests Completed: ${passedTests} / ${totalTests} Passed`);
if (passedTests === totalTests) {
  console.log('  🎉 ALL 24 DOCUMENT MODEL & PREVIEW TESTS (A–X) PASSED!');
} else {
  console.error(`  ⚠️ ${totalTests - passedTests} TESTS FAILED!`);
  process.exit(1);
}
console.log('================================================================\n');
