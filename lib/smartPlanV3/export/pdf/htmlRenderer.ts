/**
 * Smart Plan V3 — Standalone Print HTML Generator for PDF Export
 *
 * Converts canonical V3LessonDocument into self-contained HTML
 * optimized for headless Chrome and print rendering.
 *
 * Distinct Teacher Package vs Student Package:
 * - Teacher Package: Complete 10-section plan + all appendices (including answer keys & rubrics)
 * - Student Package: Worksheets and student materials ONLY with writing lines.
 *   STRICTLY NO answer keys, NO expected answers, and NO teacher guides.
 *
 * Zero AI calls.
 */

import type {
  V3LessonDocument,
  DocumentSection,
  DocumentAppendix,
  AppendixItem,
  KeyValueSection,
  BulletListSection,
  ParagraphSection,
  ActivityTimelineSection,
  AssetSection,
  AssessmentSection,
  PostTeachingPlaceholderSection,
} from '@/lib/smartPlanV3/document/types';
import { DOCUMENT_A4_CSS } from '@/lib/smartPlanV3/document';

export type PdfPackageType = 'teacher' | 'student';

function escapeHtml(text: any): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderKeyValueHtml(section: KeyValueSection): string {
  const rows = section.pairs
    .map(
      pair => `
      <tr>
        <td class="font-semibold text-slate-800 bg-slate-50 w-1/3 py-2 px-3 border border-slate-300">${escapeHtml(pair.key)}</td>
        <td class="text-slate-700 py-2 px-3 border border-slate-300">${escapeHtml(pair.value)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table class="w-full text-sm border-collapse border border-slate-300 my-2">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBulletListHtml(section: BulletListSection): string {
  const intro = section.introText ? `<p class="mb-2 text-slate-700">${escapeHtml(section.introText)}</p>` : '';
  const items = section.items
    .map(item => {
      const sub = item.subItems && item.subItems.length > 0
        ? `<div class="text-xs text-slate-500 pl-4 mt-1 space-y-0.5">${item.subItems.map(s => `<div>${escapeHtml(s)}</div>`).join('')}</div>`
        : '';
      const bullet = item.bullet ? `<span class="font-medium mr-1.5">${escapeHtml(item.bullet)}</span>` : '<span class="mr-1.5">•</span>';
      return `<li class="my-1.5 leading-relaxed text-slate-700">${bullet}${escapeHtml(item.text)}${sub}</li>`;
    })
    .join('');

  return `
    <div class="my-2">
      ${intro}
      <ul class="list-none pl-1 space-y-1">${items}</ul>
    </div>
  `;
}

function renderParagraphHtml(section: ParagraphSection): string {
  return `<p class="my-2 text-slate-700 indent-6 leading-relaxed">${escapeHtml(section.content)}</p>`;
}

function renderActivityTimelineHtml(section: ActivityTimelineSection): string {
  const rows = section.rows
    .map(
      act => `
      <tr class="border-b border-slate-200">
        <td class="py-2.5 px-3 border border-slate-300 align-top w-1/4">
          <div class="font-bold text-slate-900">${escapeHtml(act.title)}</div>
          <div class="text-xs font-semibold text-slate-500 mt-1">${escapeHtml(act.phaseLabel)} (${act.minutes} นาที)</div>
        </td>
        <td class="py-2.5 px-3 border border-slate-300 align-top w-[38%] text-slate-700 leading-relaxed whitespace-pre-line">${escapeHtml(act.teacherActions || '-')}</td>
        <td class="py-2.5 px-3 border border-slate-300 align-top w-[37%] text-slate-700 leading-relaxed whitespace-pre-line">${escapeHtml(act.studentActions || '-')}</td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="my-2 overflow-hidden">
      <table class="w-full text-sm border-collapse border border-slate-300">
        <thead>
          <tr class="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
            <th class="py-2 px-3 border border-slate-300 text-left w-1/4">ขั้นตอนและระยะเวลา</th>
            <th class="py-2 px-3 border border-slate-300 text-left w-[38%]">กิจกรรมของครูผู้สอน</th>
            <th class="py-2 px-3 border border-slate-300 text-left w-[37%]">กิจกรรมของผู้เรียน</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderAssetHtml(section: AssetSection): string {
  const rows = section.rows
    .map(
      r => `
      <tr class="border-b border-slate-200">
        <td class="py-2 px-3 border border-slate-300 text-center font-semibold text-slate-700 w-12">${escapeHtml(r.ref)}</td>
        <td class="py-2 px-3 border border-slate-300 font-medium text-slate-800">${escapeHtml(r.title)}</td>
        <td class="py-2 px-3 border border-slate-300 text-slate-600 text-center w-36">${escapeHtml(r.assetTypeLabel)}</td>
        <td class="py-2 px-3 border border-slate-300 text-center text-slate-600 w-32 font-semibold text-xs">${escapeHtml(r.appendixRef)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table class="w-full text-sm border-collapse border border-slate-300 my-2">
      <thead>
        <tr class="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
          <th class="py-2 px-3 border border-slate-300 text-center w-12">ลำดับ</th>
          <th class="py-2 px-3 border border-slate-300 text-left">ชื่อสื่อ / แหล่งการเรียนรู้</th>
          <th class="py-2 px-3 border border-slate-300 text-center w-36">ประเภทสื่อ</th>
          <th class="py-2 px-3 border border-slate-300 text-center w-32">อ้างอิงภาคผนวก</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAssessmentHtml(section: AssessmentSection): string {
  const rows = section.rows
    .map(
      r => `
      <tr class="border-b border-slate-200">
        <td class="py-2 px-3 border border-slate-300 align-top w-1/4">
          <div class="font-bold text-slate-800 text-xs mb-1">${escapeHtml(r.objectiveRefs)}</div>
          <div class="text-xs text-slate-600 leading-snug">${escapeHtml(r.objectiveStatements.join(', '))}</div>
        </td>
        <td class="py-2 px-3 border border-slate-300 align-top w-1/4 text-xs text-slate-700">${escapeHtml(r.evidenceDescription)}</td>
        <td class="py-2 px-3 border border-slate-300 align-top w-1/4 text-xs">
          <div class="font-medium text-slate-800">${escapeHtml(r.method)}</div>
          <div class="text-slate-500 mt-0.5">เครื่องมือ: ${escapeHtml(r.toolName)}</div>
        </td>
        <td class="py-2 px-3 border border-slate-300 align-top w-1/4 text-xs text-slate-700">${escapeHtml(r.criteria)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <table class="w-full text-sm border-collapse border border-slate-300 my-2">
      <thead>
        <tr class="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-xs">
          <th class="py-2 px-3 border border-slate-300 text-left w-1/4">จุดประสงค์การเรียนรู้</th>
          <th class="py-2 px-3 border border-slate-300 text-left w-1/4">หลักฐาน / ภาระงาน</th>
          <th class="py-2 px-3 border border-slate-300 text-left w-1/4">วิธีการและเครื่องมือวัด</th>
          <th class="py-2 px-3 border border-slate-300 text-left w-1/4">เกณฑ์การประเมิน</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderPostTeachingHtml(): string {
  return `
    <div class="border border-slate-300 p-4 text-sm text-slate-700 space-y-4 my-2">
      <div>
        <p class="font-bold text-slate-800">1. ผลการจัดการเรียนรู้ตามจุดประสงค์:</p>
        <p class="mt-1 pl-4">จำนวนนักเรียนทั้งหมด ............ คน | ผ่าน ............ คน (ร้อยละ ........) | ไม่ผ่าน ............ คน (ร้อยละ ........)</p>
      </div>
      <div>
        <p class="font-bold text-slate-800">2. ปัญหาและอุปสรรคที่พบ:</p>
        <p class="mt-1 pl-4 text-slate-400">.............................................................................................................................................................................................</p>
      </div>
      <div>
        <p class="font-bold text-slate-800">3. แนวทางแก้ไขและพัฒนา (Remediation / Extension):</p>
        <p class="mt-1 pl-4 text-slate-400">.............................................................................................................................................................................................</p>
      </div>
      <div class="pt-4 text-right pr-8 space-y-1">
        <p>ลงชื่อ ................................................................ ครูผู้สอน</p>
        <p>(................................................................)</p>
        <p>ตำแหน่ง .............................................................</p>
        <p>วันที่ ...... เดือน ........................... พ.ศ. .........</p>
      </div>
    </div>
  `;
}

function renderRubricTableHtml(content: any): string {
  const levels = content.levels || [];
  const criteria = content.criteria || [];

  const ths = levels
    .map((l: any) => `<th class="py-2 px-2 border border-slate-300 text-center font-bold">${escapeHtml(l.label || `ระดับ ${l.score}`)}</th>`)
    .join('');

  const rows = criteria
    .map((c: any) => {
      const tds = levels
        .map((l: any) => `<td class="py-2 px-2.5 border border-slate-300 text-xs text-slate-700 align-top">${escapeHtml(c.descriptors?.[String(l.score)] || '-')}</td>`)
        .join('');
      return `
        <tr>
          <td class="py-2 px-3 border border-slate-300 font-semibold text-xs text-slate-800 align-top w-1/4">${escapeHtml(c.name)}</td>
          ${tds}
        </tr>
      `;
    })
    .join('');

  return `
    <table class="w-full text-sm border-collapse border border-slate-300 my-2">
      <thead>
        <tr class="bg-slate-100 text-slate-900 border-b border-slate-300 text-xs">
          <th class="py-2 px-3 border border-slate-300 text-left w-1/4 font-bold">ประเด็นการประเมิน</th>
          ${ths}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderChecklistHtml(content: any): string {
  const items = content.items || [];
  const rows = items
    .map(
      (item: any, idx: number) => `
      <tr>
        <td class="py-2 px-2 border border-slate-300 text-center font-semibold w-12">${idx + 1}</td>
        <td class="py-2 px-3 border border-slate-300 text-sm text-slate-700">${escapeHtml(typeof item === 'string' ? item : item.label || item.description || '-')}</td>
        <td class="py-2 px-3 border border-slate-300 text-center w-20">[ &nbsp; ]</td>
        <td class="py-2 px-3 border border-slate-300 text-center w-20">[ &nbsp; ]</td>
      </tr>
    `
    )
    .join('');

  return `
    <table class="w-full text-sm border-collapse border border-slate-300 my-2">
      <thead>
        <tr class="bg-slate-100 text-slate-900 border-b border-slate-300 text-xs">
          <th class="py-2 px-2 border border-slate-300 text-center w-12 font-bold">ลำดับ</th>
          <th class="py-2 px-3 border border-slate-300 text-left font-bold">พฤติกรรม / รายการประเมิน</th>
          <th class="py-2 px-3 border border-slate-300 text-center w-20 font-bold">ผ่าน</th>
          <th class="py-2 px-3 border border-slate-300 text-center w-20 font-bold">ไม่ผ่าน</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAppendixItemHtml(item: AppendixItem, packageType: PdfPackageType): string {
  // In student package: STRICTLY NO answer keys or teacher guides
  if (packageType === 'student') {
    if (item.isAnswerKey || item.itemType === 'ANSWER_KEY' || item.itemType === 'TEACHER_GUIDE') {
      return '';
    }
  }

  const content = item.content || {};
  let bodyHtml = '';

  // 1. Worksheet / Problem Set / Experiment Sheet / Task Card / Speaking Card
  if (
    item.itemType === 'WORKSHEET' ||
    item.itemType === 'PROBLEM_SET' ||
    item.itemType === 'EXPERIMENT_SHEET' ||
    item.itemType === 'TASK_CARD' ||
    item.itemType === 'SPEAKING_CARD'
  ) {
    const instruction = content.instruction ? `<p class="font-bold text-sm text-slate-800 mb-3">คำชี้แจง: ${escapeHtml(content.instruction)}</p>` : '';
    const problems = content.problems || content.items || content.questions || [];
    const problemsHtml = Array.isArray(problems)
      ? problems
          .map((prob: any, idx: number) => {
            const q = typeof prob === 'string' ? prob : prob.question || prob.prompt || prob.text || '';
            const studentLines = packageType === 'student'
              ? `
                <div class="mt-2 text-xs text-slate-500">
                  <p>วิธีคิด / คำตอบ: ..............................................................................................................................................................</p>
                  <p class="mt-1">................................................................................................................................................................................................</p>
                </div>
              `
              : (prob.expectedAnswer || prob.answer)
              ? `<div class="mt-1 text-xs text-emerald-700 italic font-medium">แนวคำตอบ: ${escapeHtml(prob.expectedAnswer || prob.answer)}</div>`
              : '';

            return `
              <div class="my-3 p-3 bg-slate-50/70 border border-slate-200 rounded">
                <div class="font-semibold text-sm text-slate-900">ข้อที่ ${idx + 1}: ${escapeHtml(q)}</div>
                ${studentLines}
              </div>
            `;
          })
          .join('')
      : '';

    // Role-play cards
    let cardsHtml = '';
    if (content.cards && Array.isArray(content.cards)) {
      cardsHtml = content.cards
        .map(
          (c: any) => `
          <div class="my-3 p-3 border-2 border-indigo-200 rounded-lg bg-indigo-50/30">
            <div class="font-bold text-indigo-900">${escapeHtml(c.assignedTo || c.roleTitle || 'บัตรบทบาท')}</div>
            ${c.situation ? `<p class="text-xs text-slate-700 italic mt-1">สถานการณ์: ${escapeHtml(c.situation)}</p>` : ''}
            ${c.cuesOrClues ? `
              <div class="mt-2 text-xs">
                <span class="font-bold text-slate-800">แนวทางบทสนทนา:</span>
                <ul class="list-disc pl-5 mt-1 space-y-0.5 text-slate-700">${c.cuesOrClues.map((cue: string) => `<li>${escapeHtml(cue)}</li>`).join('')}</ul>
              </div>
            ` : ''}
          </div>
        `
        )
        .join('');
    }

    // Experiment Sheet: Materials
    let materialsHtml = '';
    if (content.materials && Array.isArray(content.materials)) {
      materialsHtml = `
        <div class="my-2">
          <div class="font-bold text-xs text-slate-800">อุปกรณ์และสารเคมี:</div>
          <ul class="list-disc pl-5 mt-1 text-xs text-slate-700 space-y-0.5">${content.materials.map((m: string) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
        </div>
      `;
    }

    // Experiment Sheet: Steps
    let stepsHtml = '';
    if (content.steps && Array.isArray(content.steps)) {
      stepsHtml = `
        <div class="my-2">
          <div class="font-bold text-xs text-slate-800">ขั้นตอนการทดลอง:</div>
          <div class="pl-2 mt-1 text-xs text-slate-700 space-y-1">${content.steps.map((s: string) => `<div>${escapeHtml(s)}</div>`).join('')}</div>
        </div>
      `;
    }

    // Experiment Sheet: Data Table
    let dataTableHtml = '';
    if (content.dataTable && content.dataTable.columns) {
      const title = content.dataTable.title ? `<div class="font-bold text-xs text-slate-800 mb-1">${escapeHtml(content.dataTable.title)}</div>` : '';
      const ths = content.dataTable.columns.map((c: string) => `<th class="py-1.5 px-2 border border-slate-300 text-center font-bold text-xs">${escapeHtml(c)}</th>`).join('');
      const rows = (content.dataTable.initialRows || []).map((r: string[]) => {
        const tds = r.map((cellText: string, cIdx: number) => {
          let text = cellText;
          if (packageType === 'student' && cIdx >= 2) {
            text = '&nbsp;';
          }
          return `<td class="py-1.5 px-2 border border-slate-300 text-xs text-center">${escapeHtml(text)}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      dataTableHtml = `
        <div class="my-3">
          ${title}
          <table class="w-full text-xs border-collapse border border-slate-300">
            <thead><tr class="bg-slate-100">${ths}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    // Experiment Sheet: Summary Prompt
    let summaryHtml = '';
    if (content.evidenceSummaryPrompt) {
      if (packageType === 'student') {
        summaryHtml = `
          <div class="my-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500">
            <p class="font-bold text-slate-700">สรุปผลการทดลอง:</p>
            <p class="mt-2">................................................................................................................................................................................................</p>
          </div>
        `;
      } else {
        summaryHtml = `
          <div class="my-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
            <span class="font-bold">แนวทางการสรุปผล:</span> ${escapeHtml(content.evidenceSummaryPrompt)}
          </div>
        `;
      }
    }

    bodyHtml = instruction + problemsHtml + cardsHtml + materialsHtml + stepsHtml + dataTableHtml + summaryHtml;
  }
  // 2. Rubric
  else if (item.itemType === 'PERFORMANCE_RUBRIC' || item.itemType === 'RUBRIC' || content.levels) {
    bodyHtml = renderRubricTableHtml(content);
  }
  // 3. Checklist
  else if (item.itemType === 'OBSERVATION_CHECKLIST' || item.itemType === 'CHECKLIST') {
    bodyHtml = renderChecklistHtml(content);
  }
  // 4. Answer Key (Teacher Package only)
  else if (item.isAnswerKey || item.itemType === 'ANSWER_KEY') {
    const ansHtml = content.answers && Array.isArray(content.answers)
      ? content.answers
          .map(
            (a: any, idx: number) => `
            <div class="my-2 text-xs">
              <span class="font-bold text-slate-900">ข้อ ${idx + 1}: ${escapeHtml(a.question || '')}</span>
              <div class="text-emerald-700 font-semibold pl-2 mt-0.5">เฉลย: ${escapeHtml(a.answer || a.expectedAnswer || '')}</div>
            </div>
          `
          )
          .join('')
      : '';
    bodyHtml = ansHtml;
  }
  // 5. Prompts / Exit Ticket
  else if (content.prompts && Array.isArray(content.prompts)) {
    bodyHtml = content.prompts
      .map(
        (pr: string, idx: number) => `
        <div class="my-2 p-2 border border-slate-200 rounded">
          <div class="font-semibold text-xs text-slate-800">${idx + 1}. ${escapeHtml(pr)}</div>
          ${packageType === 'student' ? '<div class="mt-2 text-xs text-slate-400">ตอบ: ............................................................................................................................</div>' : ''}
        </div>
      `
      )
      .join('');
  }

  return `
    <div class="my-4 avoid-break-inside">
      <h3 class="font-bold text-base text-slate-900 border-l-4 border-indigo-600 pl-2.5 mb-1">${escapeHtml(item.title)}</h3>
      ${item.subtitle ? `<p class="text-xs text-slate-500 italic mb-2">${escapeHtml(item.subtitle)}</p>` : ''}
      ${bodyHtml}
    </div>
  `;
}

export function renderDocumentToStandaloneHtml(
  doc: V3LessonDocument,
  packageType: PdfPackageType = 'teacher'
): string {
  const isTeacher = packageType === 'teacher';
  const meta = doc.metadata;

  let mainBodyHtml = '';

  if (isTeacher) {
    // Render Sections 1-10
    const sectionsHtml = doc.sections
      .map(section => {
        let secContent = '';
        switch (section.type) {
          case 'keyValue':
            secContent = renderKeyValueHtml(section as KeyValueSection);
            break;
          case 'bulletList':
            secContent = renderBulletListHtml(section as BulletListSection);
            break;
          case 'paragraph':
            secContent = renderParagraphHtml(section as ParagraphSection);
            break;
          case 'activityTimeline':
            secContent = renderActivityTimelineHtml(section as ActivityTimelineSection);
            break;
          case 'asset':
            secContent = renderAssetHtml(section as AssetSection);
            break;
          case 'assessment':
            secContent = renderAssessmentHtml(section as AssessmentSection);
            break;
          case 'postTeachingPlaceholder':
            secContent = renderPostTeachingHtml();
            break;
          default:
            break;
        }

        return `
          <div class="my-4 ${section.pageBreakBefore ? 'page-break-before' : ''} ${section.avoidBreakInside ? 'avoid-break-inside' : ''}">
            <h2 class="text-base font-bold text-slate-900 border-b border-slate-300 pb-1 mb-2">${escapeHtml(section.title)}</h2>
            ${secContent}
          </div>
        `;
      })
      .join('');

    mainBodyHtml = `
      <div class="main-plan-sheet">
        <div class="text-center pb-4 mb-4 border-b-2 border-slate-900 space-y-1">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">แผนการจัดการเรียนรู้</h1>
          <div class="text-lg font-bold text-slate-800">เรื่อง: ${escapeHtml(meta.topic)}</div>
          <div class="text-sm text-slate-600 flex justify-center gap-4 flex-wrap">
            <span>กลุ่มสาระ: ${escapeHtml(meta.subject)}</span>
            <span>ระดับชั้น: ${escapeHtml(meta.grade)}</span>
            <span>เวลา: ${escapeHtml(meta.durationFormatted)}</span>
          </div>
        </div>
        ${sectionsHtml}
      </div>
    `;
  } else {
    // Student Package Header
    mainBodyHtml = `
      <div class="student-package-sheet">
        <div class="text-center pb-4 mb-4 border-b-2 border-slate-900 space-y-1">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">ชุดใบงานและสื่อการเรียนรู้สำหรับผู้เรียน (Student Package)</h1>
          <div class="text-base font-bold text-slate-800">รายวิชา ${escapeHtml(meta.courseName)} (${escapeHtml(meta.courseCode)}) — เรื่อง ${escapeHtml(meta.topic)}</div>
        </div>
        <div class="p-3 bg-slate-50 border border-slate-300 rounded text-sm text-slate-800 font-medium mb-4">
          ชื่อ-สกุล: .......................................................................... ชั้น: ............. เลขที่: ......... วันที่: ....................
        </div>
      </div>
    `;
  }

  // Render Appendices
  const appendicesHtml = doc.appendices
    .map(app => {
      if (!isTeacher) {
        if (app.category === 'ANSWER_KEYS' || app.category === 'TEACHER_GUIDE' || app.category === 'PA_READINESS') {
          return '';
        }
      }

      const itemsHtml = app.items.map(it => renderAppendixItemHtml(it, packageType)).join('');

      return `
        <div class="appendix-sheet page-break-before mt-6 pt-4 border-t-2 border-slate-400">
          <h2 class="text-xl font-bold text-slate-900 mb-1">${escapeHtml(app.title)}</h2>
          ${app.description ? `<p class="text-xs text-slate-500 italic mb-4">${escapeHtml(app.description)}</p>` : ''}
          ${itemsHtml}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="th">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(meta.topic)} - ${isTeacher ? 'แผนการจัดการเรียนรู้' : 'ชุดใบงานผู้เรียน'}</title>
        <meta name="x-document-source-hash" content="${escapeHtml(doc.documentSourceHash)}">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
        <style>
          ${DOCUMENT_A4_CSS}
          body {
            font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif;
            font-size: 14pt;
            line-height: 1.5;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          .avoid-break-inside {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
          }
          th {
            background-color: #f1f5f9;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="document-container">
          ${mainBodyHtml}
          ${appendicesHtml}
        </div>
      </body>
    </html>
  `;
}
