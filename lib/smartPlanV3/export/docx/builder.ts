/**
 * Smart Plan V3 — Real OOXML DOCX Document Builder
 *
 * Converts canonical V3LessonDocument into genuine Office Open XML (.docx).
 * Adheres to:
 * - TH Sarabun New typography standards (16pt body, bold headings, proper twip spacing)
 * - Authentic tables with clean borders and header shading
 * - Header & Footer with deterministic source hash and PageNumber / TotalPages fields
 * - Distinct Teacher Package vs Student Package (student package strictly omits answer keys/teacher guides)
 * - Zero AI calls
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  Packer,
  convertMillimetersToTwip,
} from 'docx';
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
  PostTeachingRecordedSection,
} from '@/lib/smartPlanV3/document/types';

// Typography constants for TH Sarabun New
const FONT_FAMILY = 'TH Sarabun New';
const COLOR_DARK = '1E293B';
const COLOR_MUTED = '64748B';
const COLOR_BORDER = 'CBD5E1';
const COLOR_HEADER_BG = 'F1F5F9';
const COLOR_ALT_BG = 'F8FAFC';

// Half-point sizes (1 pt = 2 half-points)
const SIZE_TITLE = 36; // 18pt
const SIZE_SUBTITLE = 32; // 16pt
const SIZE_H1 = 32; // 16pt bold
const SIZE_H2 = 30; // 15pt bold
const SIZE_BODY = 28; // 14pt
const SIZE_SM = 24; // 12pt
const SIZE_FOOTER = 20; // 10pt

// Margin twips: 20mm top/bottom/left, 15mm right
const MARGIN_TOP = convertMillimetersToTwip(20);
const MARGIN_BOTTOM = convertMillimetersToTwip(20);
const MARGIN_LEFT = convertMillimetersToTwip(20);
const MARGIN_RIGHT = convertMillimetersToTwip(15);

// Standard table border style
const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: COLOR_BORDER,
};

const TABLE_BORDERS = {
  top: TABLE_BORDER,
  bottom: TABLE_BORDER,
  left: TABLE_BORDER,
  right: TABLE_BORDER,
  insideHorizontal: TABLE_BORDER,
  insideVertical: TABLE_BORDER,
};

export type DocxPackageType = 'teacher' | 'student';

// ─── Helper Functions ────────────────────────────────────────────────────────

function p(
  text: string,
  options: {
    bold?: boolean;
    size?: number;
    color?: string;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spaceBefore?: number;
    spaceAfter?: number;
    italic?: boolean;
  } = {}
): Paragraph {
  return new Paragraph({
    alignment: options.align || AlignmentType.LEFT,
    spacing: {
      before: options.spaceBefore ?? 60,
      after: options.spaceAfter ?? 60,
      line: 340,
    },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: options.size || SIZE_BODY,
        bold: options.bold || false,
        italics: options.italic || false,
        color: options.color || COLOR_DARK,
      }),
    ],
  });
}

function heading1(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: SIZE_H1,
        bold: true,
        color: '0F172A',
      }),
    ],
  });
}

function heading2(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 120, after: 60 },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        size: SIZE_H2,
        bold: true,
        color: '1E293B',
      }),
    ],
  });
}

function cell(
  content: string | Paragraph[],
  options: {
    bold?: boolean;
    header?: boolean;
    widthPercent?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    bg?: string;
  } = {}
): TableCell {
  const children = Array.isArray(content)
    ? content
    : [
        new Paragraph({
          alignment: options.align || AlignmentType.LEFT,
          spacing: { before: 40, after: 40, line: 300 },
          children: [
            new TextRun({
              text: content,
              font: FONT_FAMILY,
              size: options.header ? SIZE_BODY : SIZE_BODY,
              bold: options.header || options.bold || false,
              color: options.header ? '0F172A' : COLOR_DARK,
            }),
          ],
        }),
      ];

  return new TableCell({
    width: options.widthPercent ? { size: options.widthPercent, type: WidthType.PERCENTAGE } : undefined,
    shading: options.header
      ? { fill: COLOR_HEADER_BG }
      : options.bg
      ? { fill: options.bg }
      : undefined,
    margins: {
      top: 100,
      bottom: 100,
      left: 120,
      right: 120,
    },
    children,
  });
}

// ─── Section Renderers ───────────────────────────────────────────────────────

function renderKeyValueSection(section: KeyValueSection): Table {
  const rows: TableRow[] = section.pairs.map(pair => {
    return new TableRow({
      children: [
        cell(pair.key, { bold: true, widthPercent: 30, bg: COLOR_ALT_BG }),
        cell(pair.value, { widthPercent: 70 }),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows,
  });
}

function renderBulletListSection(section: BulletListSection): Paragraph[] {
  const elements: Paragraph[] = [];
  if (section.introText) {
    elements.push(p(section.introText, { spaceAfter: 60 }));
  }

  for (const item of section.items) {
    const bullet = item.bullet ? `${item.bullet} ` : '• ';
    elements.push(p(`${bullet}${item.text}`, { spaceBefore: 30, spaceAfter: 30 }));
    if (item.subItems && Array.isArray(item.subItems)) {
      for (const sub of item.subItems) {
        elements.push(p(`     ${sub}`, { color: COLOR_MUTED, size: SIZE_SM, spaceBefore: 20, spaceAfter: 20 }));
      }
    }
  }

  return elements;
}

function renderParagraphSection(section: ParagraphSection): Paragraph {
  return p(section.content, { spaceBefore: 60, spaceAfter: 80 });
}

function renderActivityTimelineSection(section: ActivityTimelineSection): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('ขั้นตอนและระยะเวลา', { header: true, widthPercent: 25 }),
        cell('กิจกรรมของครูผู้สอน', { header: true, widthPercent: 38 }),
        cell('กิจกรรมของผู้เรียน', { header: true, widthPercent: 37 }),
      ],
    }),
  ];

  for (const act of section.rows) {
    const timeLabel = `${act.phaseLabel}\n(${act.minutes} นาที)`;
    const teacherText = `${act.title}\n${act.teacherActions || '-'}`;
    const studentText = act.studentActions || '-';

    rows.push(
      new TableRow({
        children: [
          cell(timeLabel, { bold: true, widthPercent: 25 }),
          cell(teacherText, { widthPercent: 38 }),
          cell(studentText, { widthPercent: 37 }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows,
  });
}

function renderAssetSection(section: AssetSection): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('รหัส', { header: true, widthPercent: 12, align: AlignmentType.CENTER }),
        cell('ชื่อสื่อ / แหล่งการเรียนรู้', { header: true, widthPercent: 48 }),
        cell('ประเภทสื่อ', { header: true, widthPercent: 22 }),
        cell('อ้างอิงภาคผนวก', { header: true, widthPercent: 18, align: AlignmentType.CENTER }),
      ],
    }),
  ];

  section.rows.forEach(item => {
    rows.push(
      new TableRow({
        children: [
          cell(item.ref, { align: AlignmentType.CENTER, widthPercent: 12 }),
          cell(item.title, { bold: true, widthPercent: 48 }),
          cell(item.assetTypeLabel, { widthPercent: 22 }),
          cell(item.appendixRef, { align: AlignmentType.CENTER, widthPercent: 18 }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows,
  });
}

function renderAssessmentSection(section: AssessmentSection): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('จุดประสงค์การเรียนรู้', { header: true, widthPercent: 25 }),
        cell('หลักฐาน / ภาระงาน', { header: true, widthPercent: 25 }),
        cell('วิธีการและเครื่องมือวัด', { header: true, widthPercent: 25 }),
        cell('เกณฑ์การประเมิน', { header: true, widthPercent: 25 }),
      ],
    }),
  ];

  for (const row of section.rows) {
    const objText = `${row.objectiveRefs}\n${row.objectiveStatements.join('\n')}`;
    const methodTool = `${row.method}\nเครื่องมือ: ${row.toolName}`;

    rows.push(
      new TableRow({
        children: [
          cell(objText, { widthPercent: 25 }),
          cell(row.evidenceDescription, { widthPercent: 25 }),
          cell(methodTool, { widthPercent: 25 }),
          cell(row.criteria, { widthPercent: 25 }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows,
  });
}

function renderPostTeachingSection(section: PostTeachingPlaceholderSection): Table {
  const text =
    '1. ผลการจัดการเรียนรู้ตามจุดประสงค์:\n' +
    '   จำนวนนักเรียนทั้งหมด ............ คน\n' +
    '   ผ่านจุดประสงค์การเรียนรู้ ............ คน (คิดเป็นร้อยละ ........)\n' +
    '   ไม่ผ่านจุดประสงค์การเรียนรู้ ............ คน (คิดเป็นร้อยละ ........)\n\n' +
    '2. ปัญหาและอุปสรรคที่พบ:\n' +
    '   ................................................................................................................................................\n' +
    '   ................................................................................................................................................\n\n' +
    '3. แนวทางแก้ไขและพัฒนา (Remediation / Extension):\n' +
    '   ................................................................................................................................................\n' +
    '   ................................................................................................................................................\n\n' +
    'ลงชื่อ ................................................................ ครูผู้สอน\n' +
    '      (................................................................)\n' +
    'ตำแหน่ง .............................................................\n' +
    'วันที่ ...... เดือน ........................... พ.ศ. .........';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [cell(text, { widthPercent: 100 })],
      }),
    ],
  });
}

function renderPostTeachingRecordedSection(section: PostTeachingRecordedSection): Table {
  const lines: string[] = [];

  // 1. ผลการจัดการเรียนรู้จริง
  lines.push('1. ข้อมูลการจัดการเรียนรู้จริง:');
  if (section.taughtAt) {
    const d = new Date(section.taughtAt);
    lines.push(`   วันที่จัดการเรียนรู้: ${d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  }
  if (section.actualDurationMinutes) {
    lines.push(`   ระยะเวลาที่ใช้จริง: ${section.actualDurationMinutes} นาที`);
  }

  // สถิตินักเรียน
  const total = section.studentsTotal ?? '-';
  const passed = section.studentsPassed ?? '-';
  const support = section.studentsNeedSupport ?? '-';
  lines.push(`   • จำนวนนักเรียนทั้งหมด: ${total} คน`);
  if (section.studentsPresent !== null && section.studentsPresent !== undefined) {
    lines.push(`   • มาเรียน: ${section.studentsPresent} คน | ขาดเรียน: ${section.studentsAbsent ?? 0} คน`);
  }
  if (section.studentsAssessed !== null && section.studentsAssessed !== undefined) {
    lines.push(`   • ได้รับการประเมิน: ${section.studentsAssessed} คน`);
  }
  lines.push(`   • ผ่านเกณฑ์การประเมิน: ${passed} คน`);
  lines.push(`   • ต้องได้รับการช่วยเหลือ / สอนซ่อมเสริม: ${support} คน`);

  if (section.actualTeachingNotes) {
    lines.push(`\n   บันทึกการจัดกิจกรรมการเรียนรู้:`);
    lines.push(`   ${section.actualTeachingNotes}`);
  }

  // 2. หลักฐานเชิงประจักษ์ (Observed Evidence)
  if (section.observedEvidenceSummary && section.observedEvidenceSummary.length > 0) {
    lines.push('\n2. หลักฐานเชิงประจักษ์จากการจัดการเรียนรู้ (Observed Evidence):');
    section.observedEvidenceSummary.forEach((ev, idx) => {
      lines.push(`   ${idx + 1}. [${ev.evidenceType}] ${ev.title} (${ev.outcomeStatus})`);
      if (ev.description) lines.push(`      - รายละเอียด: ${ev.description}`);
    });
  }

  // 3. การสะท้อนผลและแนวทางพัฒนา (Reflection & Remediation)
  if (section.status === 'REFLECTED') {
    lines.push('\n3. การสะท้อนผลและการพัฒนา (Teacher Reflection & Remediation):');
    if (section.whatWorked) {
      lines.push(`   • สิ่งที่ได้ผลดี: ${section.whatWorked}`);
    }
    if (section.problems) {
      lines.push(`   • ปัญหาและอุปสรรคที่พบ: ${section.problems}`);
    }
    if (section.adjustmentsMade) {
      lines.push(`   • การปรับกิจกรรมระหว่างสอนจริง: ${section.adjustmentsMade}`);
    }
    if (section.feedbackGiven) {
      lines.push(`   • ข้อมูลย้อนกลับที่ให้แก่ผู้เรียน: ${section.feedbackGiven}`);
    }
    if (section.remediationPlan) {
      lines.push(`   • แผนการช่วยเหลือ / ซ่อมเสริม: ${section.remediationPlan}`);
    }
    if (section.nextLessonAdjustment) {
      lines.push(`   • ข้อเสนอแนะสำหรับการสอนครั้งต่อไป: ${section.nextLessonAdjustment}`);
    }
    if (section.reflection) {
      lines.push(`\n   บันทึกการสะท้อนผลของครู:`);
      lines.push(`   ${section.reflection}`);
    }

    if (section.observedOutcomes && section.observedOutcomes.length > 0) {
      lines.push('\n4. สรุปผลลัพธ์การเรียนรู้เชิงประจักษ์ (Observed Outcome Summary):');
      section.observedOutcomes.forEach((out, i) => {
        lines.push(`   ${i + 1}. ${out.objectiveTitle}: ${out.status} (หลักฐาน ${out.evidenceCount} รายการ)`);
      });
    }
  }

  lines.push('\nลงชื่อ ................................................................ ครูผู้สอน');
  lines.push('      (................................................................)');
  lines.push('ตำแหน่ง .............................................................');
  lines.push('วันที่ ...... เดือน ........................... พ.ศ. .........');

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [cell(lines.join('\n'), { widthPercent: 100 })],
      }),
    ],
  });
}


// ─── Appendix Item Renderers ─────────────────────────────────────────────────

function buildRubricTable(content: any): Table {
  const levels = content.levels || [];
  const criteria = content.criteria || [];

  const headerCells = [
    cell('ประเด็นการประเมิน', { header: true, widthPercent: 25 }),
  ];

  const colWidth = Math.floor(75 / Math.max(levels.length, 1));
  for (const lvl of levels) {
    headerCells.push(
      cell(lvl.label || `ระดับ ${lvl.score}`, {
        header: true,
        widthPercent: colWidth,
        align: AlignmentType.CENTER,
      })
    );
  }

  const rows: TableRow[] = [new TableRow({ children: headerCells })];

  for (const crit of criteria) {
    const rowCells = [cell(crit.name, { bold: true, widthPercent: 25 })];
    for (const lvl of levels) {
      const desc = crit.descriptors?.[String(lvl.score)] || '-';
      rowCells.push(cell(desc, { widthPercent: colWidth }));
    }
    rows.push(new TableRow({ children: rowCells }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows,
  });
}

function buildChecklistTable(content: any): Table {
  const items = content.items || [];
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('ลำดับ', { header: true, widthPercent: 10, align: AlignmentType.CENTER }),
        cell('พฤติกรรม / รายการประเมิน', { header: true, widthPercent: 60 }),
        cell('ผ่าน', { header: true, widthPercent: 15, align: AlignmentType.CENTER }),
        cell('ไม่ผ่าน', { header: true, widthPercent: 15, align: AlignmentType.CENTER }),
      ],
    }),
  ];

  items.forEach((item: any, idx: number) => {
    rows.push(
      new TableRow({
        children: [
          cell(String(idx + 1), { align: AlignmentType.CENTER, widthPercent: 10 }),
          cell(typeof item === 'string' ? item : item.label || item.description || '-', { widthPercent: 60 }),
          cell('[   ]', { align: AlignmentType.CENTER, widthPercent: 15 }),
          cell('[   ]', { align: AlignmentType.CENTER, widthPercent: 15 }),
        ],
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows,
  });
}

function buildAppendixItemElements(item: AppendixItem, packageType: DocxPackageType): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // In student package: STRICTLY NO answer keys, teacher guides, or expected answers
  if (packageType === 'student') {
    if (item.isAnswerKey || item.itemType === 'ANSWER_KEY' || item.itemType === 'TEACHER_GUIDE') {
      return [];
    }
  }

  elements.push(heading2(`${item.title}`));
  if (item.subtitle) {
    elements.push(p(item.subtitle, { italic: true, color: COLOR_MUTED, spaceAfter: 60 }));
  }

  const content = item.content || {};

  if (content.title && content.title !== item.title) {
    elements.push(p(content.title, { bold: true, color: '334155', spaceBefore: 30, spaceAfter: 50 }));
  }

  // 1. Worksheet / Problem Set / Experiment Sheet / Task Card / Speaking Card
  if (
    item.itemType === 'WORKSHEET' ||
    item.itemType === 'PROBLEM_SET' ||
    item.itemType === 'EXPERIMENT_SHEET' ||
    item.itemType === 'TASK_CARD' ||
    item.itemType === 'SPEAKING_CARD'
  ) {
    if (content.instruction) {
      elements.push(p(`คำชี้แจง: ${content.instruction}`, { bold: true, spaceAfter: 80 }));
    }

    const problems = content.problems || content.items || content.questions || [];
    if (Array.isArray(problems) && problems.length > 0) {
      problems.forEach((prob: any, idx: number) => {
        const questionText = typeof prob === 'string' ? prob : prob.question || prob.prompt || prob.text || '';
        elements.push(p(`ข้อที่ ${idx + 1}: ${questionText}`, { bold: true, spaceBefore: 80, spaceAfter: 40 }));

        if (packageType === 'student') {
          elements.push(p('วิธีคิด / คำตอบ: .............................................................................................................................................', { spaceBefore: 20, spaceAfter: 20 }));
          elements.push(p('.......................................................................................................................................................................', { spaceBefore: 20, spaceAfter: 40 }));
        } else {
          if (prob.expectedAnswer || prob.answer) {
            elements.push(p(`แนวคำตอบ: ${prob.expectedAnswer || prob.answer}`, { italic: true, color: '15803D', spaceAfter: 40 }));
          }
          if (prob.score) {
            elements.push(p(`(คะแนนเต็ม ${prob.score} คะแนน)`, { color: COLOR_MUTED, size: SIZE_SM }));
          }
        }
      });
    }

    // Role-play / Speaking Cards
    if (content.cards && Array.isArray(content.cards)) {
      for (const card of content.cards) {
        elements.push(p(`[${card.assignedTo || card.roleTitle || 'บัตรบทบาท'}]`, { bold: true, spaceBefore: 80 }));
        if (card.situation) {
          elements.push(p(`สถานการณ์: ${card.situation}`, { italic: true }));
        }
        if (card.cuesOrClues && Array.isArray(card.cuesOrClues)) {
          elements.push(p('แนวทางบทสนทนา (Dialogue Cues):', { bold: true, spaceBefore: 40 }));
          card.cuesOrClues.forEach((cue: string) => {
            elements.push(p(`   • ${cue}`, { spaceBefore: 20, spaceAfter: 20 }));
          });
        }
        if (card.targetVocabulary && Array.isArray(card.targetVocabulary)) {
          elements.push(p(`คำศัพท์เป้าหมาย: ${card.targetVocabulary.join(', ')}`, { size: SIZE_SM, color: COLOR_MUTED }));
        }
      }
    }

    // Experiment Sheet: Materials List
    if (content.materials && Array.isArray(content.materials)) {
      elements.push(p('อุปกรณ์และสารเคมี:', { bold: true, spaceBefore: 60, spaceAfter: 20 }));
      content.materials.forEach((m: string) => {
        elements.push(p(`   • ${m}`, { spaceBefore: 10, spaceAfter: 10 }));
      });
    }

    // Experiment Sheet: Steps List
    if (content.steps && Array.isArray(content.steps)) {
      elements.push(p('ขั้นตอนการทดลอง:', { bold: true, spaceBefore: 60, spaceAfter: 20 }));
      content.steps.forEach((step: string) => {
        elements.push(p(`   ${step}`, { spaceBefore: 15, spaceAfter: 15 }));
      });
    }

    // Experiment Sheet: Data Table
    if (content.dataTable && content.dataTable.columns) {
      if (content.dataTable.title) {
        elements.push(p(content.dataTable.title, { bold: true, spaceBefore: 60, spaceAfter: 30 }));
      }
      const cols = content.dataTable.columns;
      const rowsData = content.dataTable.initialRows || [];
      const colW = Math.floor(100 / cols.length);
      const headerCells = cols.map((c: string) => cell(c, { header: true, widthPercent: colW, align: AlignmentType.CENTER }));
      const tableRows: TableRow[] = [new TableRow({ children: headerCells })];
      rowsData.forEach((r: string[]) => {
        const rowCells = r.map((cellText: string, cIdx: number) => {
          let displayText = cellText;
          if (packageType === 'student' && cIdx >= 2) {
            // For student: leave observation/results column open for recording
            displayText = '';
          }
          return cell(displayText, { widthPercent: colW, align: AlignmentType.CENTER });
        });
        tableRows.push(new TableRow({ children: rowCells }));
      });
      elements.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: tableRows,
      }));
    }

    // Experiment Sheet: Evidence Summary Prompt
    if (content.evidenceSummaryPrompt) {
      if (packageType === 'student') {
        elements.push(p('สรุปผลการทดลอง: ...........................................................................................................................................', { spaceBefore: 60 }));
        elements.push(p('.......................................................................................................................................................................', { spaceBefore: 20, spaceAfter: 40 }));
      } else {
        elements.push(p(`แนวทางการสรุปผล: ${content.evidenceSummaryPrompt}`, { italic: true, color: '15803D', spaceBefore: 60, spaceAfter: 40 }));
      }
    }
  }
  // 2. Rubric
  else if (item.itemType === 'PERFORMANCE_RUBRIC' || item.itemType === 'RUBRIC' || content.levels) {
    elements.push(buildRubricTable(content));
  }
  // 3. Checklist
  else if (item.itemType === 'OBSERVATION_CHECKLIST' || item.itemType === 'CHECKLIST') {
    elements.push(buildChecklistTable(content));
  }
  // 4. Answer Key (Teacher Package only)
  else if (item.isAnswerKey || item.itemType === 'ANSWER_KEY') {
    if (content.answers && Array.isArray(content.answers)) {
      content.answers.forEach((ans: any, idx: number) => {
        elements.push(p(`ข้อ ${idx + 1}: ${ans.question || ''}`, { bold: true }));
        elements.push(p(`เฉลย: ${ans.answer || ans.expectedAnswer || ''}`, { color: '15803D', spaceAfter: 40 }));
      });
    }
    if (content.sampleDialogue) {
      elements.push(p(`ตัวอย่างบทสนทนา: ${content.sampleDialogue}`, { italic: true }));
    }
    if (content.guidance) {
      elements.push(p(`ข้อแนะนำครู: ${content.guidance}`, { italic: true }));
    }
  }
  // 5. Prompts / Exit Ticket
  else if (content.prompts && Array.isArray(content.prompts)) {
    content.prompts.forEach((pr: string, idx: number) => {
      elements.push(p(`${idx + 1}. ${pr}`, { bold: true, spaceBefore: 60 }));
      if (packageType === 'student') {
        elements.push(p('ตอบ: ...........................................................................................................................................................', { spaceBefore: 30, spaceAfter: 40 }));
      }
    });
  }

  return elements;
}

// ─── Main Document Assembly ──────────────────────────────────────────────────

export async function generateDocxDocument(
  doc: V3LessonDocument,
  packageType: DocxPackageType = 'teacher'
): Promise<Buffer> {
  const meta = doc.metadata;
  const isTeacher = packageType === 'teacher';

  const children: (Paragraph | Table)[] = [];

  // ── Header / Banner ──
  if (isTeacher) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: 'แผนการจัดการเรียนรู้',
            font: FONT_FAMILY,
            size: SIZE_TITLE,
            bold: true,
            color: '0F172A',
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 140 },
        children: [
          new TextRun({
            text: `เรื่อง ${meta.topic} (${meta.courseName} ${meta.courseCode})`,
            font: FONT_FAMILY,
            size: SIZE_SUBTITLE,
            bold: true,
            color: '334155',
          }),
        ],
      })
    );

    // ── Main Plan Sections 1-10 ──
    for (const section of doc.sections) {
      if (section.pageBreakBefore) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }

      children.push(heading1(section.title || ''));

      switch (section.type) {
        case 'keyValue':
          children.push(renderKeyValueSection(section as KeyValueSection));
          break;

        case 'bulletList':
          children.push(...renderBulletListSection(section as BulletListSection));
          break;

        case 'paragraph':
          children.push(renderParagraphSection(section as ParagraphSection));
          break;

        case 'activityTimeline':
          children.push(renderActivityTimelineSection(section as ActivityTimelineSection));
          break;

        case 'asset':
          children.push(renderAssetSection(section as AssetSection));
          break;

        case 'assessment':
          children.push(renderAssessmentSection(section as AssessmentSection));
          break;

        case 'postTeachingPlaceholder':
          children.push(renderPostTeachingSection(section as PostTeachingPlaceholderSection));
          break;

        case 'postTeachingRecorded':
          children.push(renderPostTeachingRecordedSection(section as PostTeachingRecordedSection));
          break;


        default:
          break;
      }
    }
  } else {
    // ── Student Package Banner ──
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: 'ชุดใบงานและสื่อการเรียนรู้สำหรับผู้เรียน (Student Package)',
            font: FONT_FAMILY,
            size: SIZE_TITLE,
            bold: true,
            color: '0F172A',
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        children: [
          new TextRun({
            text: `รายวิชา ${meta.courseName} (${meta.courseCode}) — เรื่อง ${meta.topic}`,
            font: FONT_FAMILY,
            size: SIZE_SUBTITLE,
            bold: true,
            color: '334155',
          }),
        ],
      })
    );

    // Student Header Table
    const studentHeaderTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          children: [
            cell('ชื่อ-สกุล: .......................................................................... ชั้น: ............. เลขที่: ......... วันที่: ....................', {
              bold: true,
              widthPercent: 100,
              bg: COLOR_ALT_BG,
            }),
          ],
        }),
      ],
    });
    children.push(studentHeaderTable);
    children.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // ── Appendices ──
  for (const app of doc.appendices) {
    // In student package: skip Answer Keys (Appendix ข), Teacher Guides (Appendix ง), and PA Readiness
    if (!isTeacher) {
      if (app.category === 'ANSWER_KEYS' || app.category === 'TEACHER_GUIDE' || app.category === 'PA_READINESS') {
        continue;
      }
    }

    if (children.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    children.push(heading1(app.title));
    if (app.description) {
      children.push(p(app.description, { italic: true, color: COLOR_MUTED, spaceAfter: 80 }));
    }

    for (const item of app.items) {
      const itemElements = buildAppendixItemElements(item, packageType);
      children.push(...itemElements);
    }
  }

  // ── Construct Genuine Document ──
  const wordDoc = new Document({
    title: `${meta.topic} - ${isTeacher ? 'แผนการจัดการเรียนรู้' : 'ชุดใบงานผู้เรียน'}`,
    description: `Smart Plan V3 Document - Source Hash: ${doc.documentSourceHash}`,
    creator: 'Smart Plan V3 Export Engine',
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: SIZE_BODY,
            color: '0F172A',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_LEFT,
              right: MARGIN_RIGHT,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: `${meta.courseName} | ${meta.topic} [${isTeacher ? 'ฉบับครูผู้สอน' : 'ฉบับผู้เรียน'}]`,
                    font: FONT_FAMILY,
                    size: SIZE_FOOTER,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Smart Plan V3 [${doc.documentSourceHash}]  —  หน้า `,
                    font: FONT_FAMILY,
                    size: SIZE_FOOTER,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_FAMILY,
                    size: SIZE_FOOTER,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    text: ' / ',
                    font: FONT_FAMILY,
                    size: SIZE_FOOTER,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT_FAMILY,
                    size: SIZE_FOOTER,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(wordDoc);
}
