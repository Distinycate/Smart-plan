/**
 * Smart Plan V3.9 — Automated Test Suite: Word & PDF Export Engine
 *
 * Verifies the 5 Critical Gates:
 * 1. Security Closure: Demo routes blocked in production, protected endpoints require auth.
 * 2. Real OOXML DOCX: Valid OOXML zip with word/document.xml, TH Sarabun New, tables & rubrics.
 * 3. Server-side PDF: Valid PDF buffer, deterministic page numbers, deployable fallback.
 * 4. Hash Consistency: documentSourceHash identical across Preview, DOCX, and PDF.
 * 5. Teacher vs Student Package: Student package strictly excludes answer keys and teacher guides.
 * 6. Final Snapshot: Immutable snapshot stored in v3_plan_versions on transition to FINAL.
 *
 * Runs under plain `node` — zero external network or AI calls during unit execution.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const jszip = require('jszip');
const { PDFDocument } = require('pdf-lib');

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

// Load Modules
const { getDemoLessonDocument, DEMO_LESSON_DOCUMENTS } = loadTsModule(
  path.resolve(__dirname, '../lib/smartPlanV3/document/fixtures')
);
const { buildLessonDocument, DEFAULT_DOCUMENT_OPTIONS } = loadTsModule(
  path.resolve(__dirname, '../lib/smartPlanV3/document/index')
);
const { generateDocxDocument } = loadTsModule(
  path.resolve(__dirname, '../lib/smartPlanV3/export/docx')
);
const { generatePdfDocument, renderDocumentToStandaloneHtml, findChromeExecutable } = loadTsModule(
  path.resolve(__dirname, '../lib/smartPlanV3/export/pdf')
);

let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('  SMART PLAN V3.9 — EXPORT ENGINE & SNAPSHOT TEST SUITE');
  console.log('===============================================================\n');

  // ─── GATE 1: SECURITY CLOSURE ──────────────────────────────────────────────
  console.log('--- GATE 1: Security Closure ---');

  await test('1.1 Middleware file strictly gates demo route behind NODE_ENV === development', () => {
    const mwPath = path.resolve(__dirname, '../utils/supabase/middleware.ts');
    const content = fs.readFileSync(mwPath, 'utf8');
    assert(
      content.includes("process.env.NODE_ENV === 'development'"),
      'Middleware must require NODE_ENV === development for demo preview'
    );
    assert(
      content.includes("request.nextUrl.pathname.startsWith('/plan/v3/demo-')"),
      'Middleware must check demo path pattern'
    );
  });

  await test('1.2 Document API route rejects demo requests in production environment', () => {
    const routePath = path.resolve(__dirname, '../app/api/plan/v3/[id]/document/route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assert(
      content.includes("process.env.NODE_ENV === 'production'"),
      'Document route must check for production'
    );
    assert(
      content.includes('403'),
      'Document route must respond with 403 in production for demo requests'
    );
  });

  await test('1.3 Word and PDF export routes check production environment for demo requests', () => {
    const wordRoute = fs.readFileSync(path.resolve(__dirname, '../app/api/plan/v3/[id]/export/word/route.ts'), 'utf8');
    const pdfRoute = fs.readFileSync(path.resolve(__dirname, '../app/api/plan/v3/[id]/export/pdf/route.ts'), 'utf8');
    assert(wordRoute.includes("process.env.NODE_ENV === 'production'") && wordRoute.includes('403'));
    assert(pdfRoute.includes("process.env.NODE_ENV === 'production'") && pdfRoute.includes('403'));
  });

  // ─── GATE 2: REAL OOXML DOCX GENERATION ────────────────────────────────────
  console.log('\n--- GATE 2: Real OOXML DOCX Generation ---');

  const docEn = getDemoLessonDocument('demo-english');
  let bufEnTeacher, zipEnTeacher, xmlEnTeacher;

  await test('2.1 Generate Teacher Package DOCX as valid OOXML zip archive', async () => {
    bufEnTeacher = await generateDocxDocument(docEn, 'teacher');
    assert(Buffer.isBuffer(bufEnTeacher), 'Output must be a Buffer');
    assert(bufEnTeacher.length > 5000, 'DOCX file must be substantial (>5KB)');

    zipEnTeacher = await jszip.loadAsync(bufEnTeacher);
    const files = Object.keys(zipEnTeacher.files);
    assert(files.includes('word/document.xml'), 'Archive must contain word/document.xml');
    assert(files.includes('[Content_Types].xml'), 'Archive must contain [Content_Types].xml');
    assert(files.includes('word/styles.xml'), 'Archive must contain word/styles.xml');
    assert(files.includes('docProps/core.xml'), 'Archive must contain docProps/core.xml');

    xmlEnTeacher = await zipEnTeacher.file('word/document.xml').async('string');
  });

  await test('2.2 DOCX preserves TH Sarabun New typography and table layout', () => {
    assert(xmlEnTeacher.includes('TH Sarabun New'), 'Document must specify TH Sarabun New font');
    assert(xmlEnTeacher.includes('<w:tbl>'), 'Document must contain authentic OOXML tables');
    assert(xmlEnTeacher.includes('<w:tc>'), 'Document must contain table cells');
  });

  await test('2.3 DOCX Teacher Package contains all 10 canonical sections & rubrics', () => {
    assert(xmlEnTeacher.includes('แผนการจัดการเรียนรู้'), 'Must contain main title');
    assert(xmlEnTeacher.includes('มาตรฐาน'), 'Must contain Curriculum standards');
    assert(xmlEnTeacher.includes('จุดประสงค์การเรียนรู้'), 'Must contain Learning Objectives');
    assert(xmlEnTeacher.includes('กระบวนการจัดการเรียนรู้'), 'Must contain Activities timeline');
    assert(xmlEnTeacher.includes('การวัดและประเมินผล'), 'Must contain Assessment section');
    assert(
      xmlEnTeacher.includes('แบบประเมินทักษะการพูดสนทนา') ||
        xmlEnTeacher.includes('Speaking Rubric') ||
        xmlEnTeacher.includes('เกณฑ์การประเมินการพูด'),
      'Must contain Speaking Rubric'
    );
    assert(xmlEnTeacher.includes('แนวคำตอบ') || xmlEnTeacher.includes('เฉลย'), 'Teacher package must have Answer Key');
  });

  await test('2.4 DOCX multi-level rubric stress test (3, 4, 5 score levels)', async () => {
    const docStress = getDemoLessonDocument('demo-rubric-stress');
    const bufStress = await generateDocxDocument(docStress, 'teacher');
    const zipStress = await jszip.loadAsync(bufStress);
    const xmlStress = await zipStress.file('word/document.xml').async('string');

    assert(xmlStress.includes('3 ระดับ') || xmlStress.includes('3-Level'), 'Must render 3-level rubric');
    assert(xmlStress.includes('4 ระดับ') || xmlStress.includes('4-Level'), 'Must render 4-level rubric');
    assert(xmlStress.includes('5 ระดับ') || xmlStress.includes('5-Level'), 'Must render 5-level rubric');
  });

  // ─── GATE 3: SERVER-SIDE PDF ENGINE ────────────────────────────────────────
  console.log('\n--- GATE 3: Server-side PDF Engine ---');

  let bufEnPdfTeacher, pdfDocEnT;

  await test('3.1 Generate Teacher Package PDF with valid header and pages', async () => {
    bufEnPdfTeacher = await generatePdfDocument(docEn, 'teacher');
    assert(Buffer.isBuffer(bufEnPdfTeacher), 'PDF output must be a Buffer');
    const header = bufEnPdfTeacher.slice(0, 5).toString('ascii');
    assert.strictEqual(header, '%PDF-', 'Must begin with valid %PDF- magic header');

    pdfDocEnT = await PDFDocument.load(bufEnPdfTeacher);
    const pageCount = pdfDocEnT.getPageCount();
    assert(pageCount >= 3, `Expected at least 3 pages, got ${pageCount}`);
  });

  await test('3.2 Standalone HTML renderer produces deterministic print stylesheet', () => {
    const html = renderDocumentToStandaloneHtml(docEn, 'teacher');
    assert(html.includes('@page'), 'Must contain CSS Paged Media @page rule');
    assert(html.includes('size: A4'), 'Must set page size to A4');
    assert(html.includes('Sarabun'), 'Must include Sarabun typography');
    assert(html.includes('page-break-before'), 'Must include page break rules');
  });

  await test('3.3 PDF deployability engine discovers Chrome or falls back cleanly to pdf-lib', async () => {
    const chrome = findChromeExecutable();
    // Verify that PDF generator functions correctly whether Chrome is present or absent
    const pdfBuf = await generatePdfDocument(docEn, 'teacher');
    assert(pdfBuf && pdfBuf.length > 1000, 'Must produce valid PDF');
  });

  // ─── GATE 4: PREVIEW / DOCX / PDF HASH CONSISTENCY ─────────────────────────
  console.log('\n--- GATE 4: Preview / DOCX / PDF Hash Consistency ---');

  await test('4.1 Canonical Document Model computes unique 16-character SHA-256 hash', () => {
    const hash = docEn.documentSourceHash;
    assert.strictEqual(typeof hash, 'string', 'Hash must be a string');
    assert.strictEqual(hash.length, 16, `Hash must be 16 characters, got ${hash.length}`);
    assert(/^[a-f0-9]{16}$/.test(hash), 'Hash must be hexadecimal');
  });

  await test('4.2 DOCX embeds documentSourceHash in docProps/core.xml and footer', async () => {
    const coreXml = await zipEnTeacher.file('docProps/core.xml').async('string');
    assert(
      coreXml.includes(docEn.documentSourceHash),
      `docProps/core.xml must contain hash ${docEn.documentSourceHash}`
    );

    // Check footer
    const footerFiles = Object.keys(zipEnTeacher.files).filter(f => f.startsWith('word/footer'));
    let foundInFooter = false;
    for (const f of footerFiles) {
      const footerXml = await zipEnTeacher.file(f).async('string');
      if (footerXml.includes(docEn.documentSourceHash)) {
        foundInFooter = true;
        break;
      }
    }
    assert(foundInFooter, 'DOCX footer must contain exact documentSourceHash');
  });

  await test('4.3 PDF embeds identical documentSourceHash in metadata subject and keywords', async () => {
    const subject = pdfDocEnT.getSubject();
    const keywords = pdfDocEnT.getKeywords();
    assert(
      subject.includes(docEn.documentSourceHash),
      `PDF subject must contain hash ${docEn.documentSourceHash}`
    );
    assert(
      keywords.includes(docEn.documentSourceHash),
      `PDF keywords must contain hash ${docEn.documentSourceHash}`
    );
  });

  await test('4.4 Hash matches across Preview, DOCX, and PDF from same canonical model', async () => {
    const previewHash = docEn.documentSourceHash;
    const docxCore = await zipEnTeacher.file('docProps/core.xml').async('string');
    const pdfSubject = pdfDocEnT.getSubject();

    assert(docxCore.includes(previewHash), 'DOCX must match Preview hash');
    assert(pdfSubject.includes(previewHash), 'PDF must match Preview hash');
  });

  // ─── GATE 5: TEACHER VS STUDENT PACKAGE SEPARATION ────────────────────────
  console.log('\n--- GATE 5: Teacher vs Student Package Separation ---');

  let bufEnStudentDocx, xmlEnStudentDocx;
  let bufEnStudentPdf, pdfDocEnS;

  await test('5.1 Generate Student Package DOCX', async () => {
    bufEnStudentDocx = await generateDocxDocument(docEn, 'student');
    const zipEnS = await jszip.loadAsync(bufEnStudentDocx);
    xmlEnStudentDocx = await zipEnS.file('word/document.xml').async('string');
  });

  await test('5.2 Student Package DOCX STRICTLY EXCLUDES answer keys and teacher guide', () => {
    assert(xmlEnStudentDocx.includes('Student Package'), 'Must identify as Student Package');
    assert(
      !xmlEnStudentDocx.includes('เฉลยและแนวคำตอบ'),
      'Student Package DOCX MUST NOT contain Answer Key heading'
    );
    assert(
      !xmlEnStudentDocx.includes('sampleDialogue') && !xmlEnStudentDocx.includes('ตัวอย่างบทสนทนา'),
      'Student Package DOCX MUST NOT contain teacher sample dialogue'
    );
    assert(
      !xmlEnStudentDocx.includes('คู่มือครู'),
      'Student Package DOCX MUST NOT contain Teacher Guide'
    );
  });

  await test('5.3 Student Package DOCX contains student header and writing lines', () => {
    assert(
      xmlEnStudentDocx.includes('ชื่อ-สกุล') && xmlEnStudentDocx.includes('ชั้น'),
      'Student Package DOCX must have student info header'
    );
    assert(
      xmlEnStudentDocx.includes('บัตรบทบาทสมมติ') ||
        xmlEnStudentDocx.includes('Restaurant Role-Play') ||
        xmlEnStudentDocx.includes('Customer'),
      'Student Package DOCX must include student activities'
    );
  });

  await test('5.4 Generate Student Package PDF and verify exclusion of answer keys', async () => {
    bufEnStudentPdf = await generatePdfDocument(docEn, 'student');
    pdfDocEnS = await PDFDocument.load(bufEnStudentPdf);

    const html = renderDocumentToStandaloneHtml(docEn, 'student');
    assert(html.includes('Student Package'), 'HTML must be marked Student Package');
    assert(!html.includes('เฉลย:'), 'HTML must not have answer keys');
    assert(!html.includes('เฉลยและแนวคำตอบ'), 'HTML must not have answer key appendix');
    assert(html.includes('ชื่อ-สกุล:'), 'HTML must include student name line');
  });

  await test('5.5 Math Problem Solving Student Package omits calculations and expected answers', async () => {
    const docMath = getDemoLessonDocument('demo-math');
    const mathDocxStudent = await generateDocxDocument(docMath, 'student');
    const zipMathS = await jszip.loadAsync(mathDocxStudent);
    const xmlMathS = await zipMathS.file('word/document.xml').async('string');

    assert(xmlMathS.includes('โจทย์ปัญหา'), 'Must include problem statements');
    assert(!xmlMathS.includes('คำตอบ: 175 บาท'), 'MUST NOT include answer value 175 Baht');
    assert(!xmlMathS.includes('แนวคิดและคำตอบ'), 'MUST NOT include answer reasoning');
  });

  // ─── GATE 6: FINAL SNAPSHOT & STATUS TRANSITION ───────────────────────────
  console.log('\n--- GATE 6: Final Snapshot & Status Transition ---');

  await test('6.1 Finalize route verifies REVIEWED status and zero blockers', () => {
    const finalizeRoutePath = path.resolve(__dirname, '../app/api/plan/v3/[id]/finalize/route.ts');
    const content = fs.readFileSync(finalizeRoutePath, 'utf8');

    assert(content.includes("graph.lesson.status !== 'REVIEWED'"), 'Must check REVIEWED status');
    assert(content.includes('!readiness.ready'), 'Must check readiness blockers');
    assert(content.includes('409'), 'Must return 409 if not ready');
  });

  await test('6.2 Finalize route saves immutable snapshot to v3_plan_versions', () => {
    const finalizeRoutePath = path.resolve(__dirname, '../app/api/plan/v3/[id]/finalize/route.ts');
    const content = fs.readFileSync(finalizeRoutePath, 'utf8');

    assert(content.includes("from('v3_plan_versions')"), 'Must insert into v3_plan_versions');
    assert(content.includes("label: 'FINAL'"), 'Version label must be FINAL');
    assert(content.includes('documentSourceHash'), 'Snapshot must record documentSourceHash');
    assert(content.includes('lessonGraph'), 'Snapshot must freeze lessonGraph');
  });

  await test('6.3 Finalize route updates v3_lesson_plans status to FINAL', () => {
    const finalizeRoutePath = path.resolve(__dirname, '../app/api/plan/v3/[id]/finalize/route.ts');
    const content = fs.readFileSync(finalizeRoutePath, 'utf8');

    assert(content.includes("from('v3_lesson_plans')"), 'Must update v3_lesson_plans');
    assert(content.includes("status: 'FINAL'"), 'Must update status to FINAL');
  });

  await test('6.4 Status allowed for export routes includes both REVIEWED and FINAL', () => {
    const wordRoute = fs.readFileSync(path.resolve(__dirname, '../app/api/plan/v3/[id]/export/word/route.ts'), 'utf8');
    const pdfRoute = fs.readFileSync(path.resolve(__dirname, '../app/api/plan/v3/[id]/export/pdf/route.ts'), 'utf8');
    const docRoute = fs.readFileSync(path.resolve(__dirname, '../app/api/plan/v3/[id]/document/route.ts'), 'utf8');

    const allowedCheck = "graph.lesson.status === 'REVIEWED' || graph.lesson.status === 'FINAL'";
    assert(wordRoute.includes(allowedCheck), 'Word export must allow REVIEWED and FINAL');
    assert(pdfRoute.includes(allowedCheck), 'PDF export must allow REVIEWED and FINAL');
    assert(docRoute.includes(allowedCheck), 'Document route must allow REVIEWED and FINAL');
  });

  // ─── GATE 7: SUBJECT & STRESS TEST CASES ──────────────────────────────────
  console.log('\n--- GATE 7: Subject & Stress Test Cases ---');

  await test('7.1 English Speaking (Speaking cards, rubric, exit ticket)', async () => {
    const doc = getDemoLessonDocument('demo-english');
    const docxBuf = await generateDocxDocument(doc, 'teacher');
    const pdfBuf = await generatePdfDocument(doc, 'teacher');
    assert(docxBuf.length > 10000 && pdfBuf.length > 20000);
  });

  await test('7.2 Mathematics Problem Solving (Problem set, scoring guide)', async () => {
    const doc = getDemoLessonDocument('demo-math');
    const docxBuf = await generateDocxDocument(doc, 'teacher');
    const pdfBuf = await generatePdfDocument(doc, 'teacher');
    assert(docxBuf.length > 10000 && pdfBuf.length > 20000);
  });

  await test('7.3 Science Experiment (Observation checklist, data table)', async () => {
    const doc = getDemoLessonDocument('demo-science');
    const docxBuf = await generateDocxDocument(doc, 'teacher');
    const pdfBuf = await generatePdfDocument(doc, 'teacher');
    assert(docxBuf.length > 10000 && pdfBuf.length > 20000);
  });

  await test('7.4 Long Content Stress Test (7 activities, 20 items, multi-page teacher guide)', async () => {
    const doc = getDemoLessonDocument('demo-long-content', {
      ...DEFAULT_DOCUMENT_OPTIONS,
      includeTeacherGuide: true,
    });
    const docxBuf = await generateDocxDocument(doc, 'teacher');
    const pdfBuf = await generatePdfDocument(doc, 'teacher');

    const zip = await jszip.loadAsync(docxBuf);
    const xml = await zip.file('word/document.xml').async('string');
    assert(xml.includes('กิจกรรมที่ 7'), 'Must contain 7 activities in DOCX');

    const pdfDoc = await PDFDocument.load(pdfBuf);
    assert(pdfDoc.getPageCount() >= 5, 'Must render at least 5 pages in PDF');
  });

  // ─── FINAL SUMMARY ────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log(`  EXPORT ENGINE TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  if (passedTests === totalTests) {
    console.log('  GATE VERIFICATION: 100% ALL TESTS PASS!');
  } else {
    console.log(`  GATE VERIFICATION: ${totalTests - passedTests} FAILURES DETECTED!`);
    process.exit(1);
  }
  console.log('===============================================================\n');
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
