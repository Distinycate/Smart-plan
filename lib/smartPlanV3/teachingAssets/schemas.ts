/**
 * Pure TypeScript Schemas and Validators for V3 Teaching Assets
 * Strict printable data models (no raw HTML, no zod dependency).
 */

// 1. Worksheet & Problem Set Content
export interface V3WorksheetItem {
  itemNumber: number;
  questionType:
    | 'MATCHING'
    | 'SHORT_ANSWER'
    | 'MULTIPLE_CHOICE'
    | 'FILL_IN'
    | 'OPEN_RESPONSE'
    | 'SORTING'
    | 'TRUE_FALSE'
    | 'CUSTOM';
  prompt: string;
  choices?: string[];
  matchingPairs?: Array<{ left: string; right: string }>;
  answerSpace?: string; // e.g. "พื้นที่แสดงวิธีคิดและเขียนอธิบายเหตุผล 4-5 บรรทัด"
  points?: number;
}

export interface V3WorksheetSection {
  title: string;
  instruction?: string;
  items: V3WorksheetItem[];
}

export interface V3WorksheetContent {
  title: string;
  instruction: string;
  estimatedMinutes: number;
  targetGrade?: string;
  sections: V3WorksheetSection[];
}

// 2. Speaking Card & Information Gap Content
export interface V3SpeakingCardItem {
  cardId: string;
  assignedTo: string; // e.g. "Student A (Partner 1)", "Student B"
  roleTitle?: string;
  situation: string;
  cuesOrClues: string[];
  targetVocabulary?: string[];
  expectedUtterances?: string[];
}

export interface V3SpeakingCardContent {
  title: string;
  instruction: string;
  estimatedMinutes: number;
  roleOrCardType: 'STUDENT_A_B' | 'ROLE_PLAY' | 'INFO_GAP' | 'INTERVIEW' | 'CARD_PROMPT';
  cards: V3SpeakingCardItem[];
  interactionRules: string[];
}

// 3. Experiment Sheet & Data Table Content
export interface V3DataTableDef {
  title: string;
  columns: string[];
  initialRows?: string[][];
}

export interface V3ExperimentSheetContent {
  title: string;
  instruction: string;
  estimatedMinutes: number;
  materials: string[];
  safetyGuidance?: string[];
  steps: string[];
  dataTable: V3DataTableDef;
  analysisQuestions: string[];
  evidenceSummaryPrompt: string; // "สรุปผลการทดลองจากข้อมูลหลักฐานเชิงประจักษ์"
}

// 4. Task Card Content (PE / Art / Practical Skill)
export interface V3TaskStationItem {
  stationNumber?: number;
  stationName: string;
  goal: string;
  steps: string[];
  keyTechniques: string[];
  repsOrDuration: string;
  safetyNotes?: string;
}

export interface V3TaskCardContent {
  title: string;
  instruction: string;
  estimatedMinutes: number;
  tasks: V3TaskStationItem[];
}

// 5. Flashcard Content
export interface V3FlashcardItem {
  cardNumber: number;
  frontText: string;
  backText: string;
  hintOrExample?: string;
  category?: string;
}

export interface V3FlashcardContent {
  title: string;
  instruction?: string;
  cards: V3FlashcardItem[];
}

// 6. Exit Ticket Content
export interface V3ExitTicketAssetPrompt {
  promptNumber: number;
  question: string;
  promptType: 'SHORT_REFLECTION' | 'QUICK_CHECK' | 'ONE_MINUTE_SUMMARY';
  sampleAnswerOrCriteria?: string;
}

export interface V3ExitTicketAssetContent {
  title: string;
  instruction: string;
  estimatedMinutes: number; // typically 1-5 mins
  prompts: V3ExitTicketAssetPrompt[];
}

// 7. Teacher Guide Content (Timeline-based)
export interface V3TeacherGuideTimelineItem {
  phaseName: string;
  timeRange: string; // e.g. "0–10 นาที (10 นาที)"
  teacherActions: string[];
  studentActions: string[];
  mediaOrAssets: string[];
  observableCheck: string;
  teacherPrompts?: string[];
  expectedResponses?: string[];
  teachingTips?: string[];
  formativeAssessmentMoment?: string;
  feedbackMoment?: string;
}

export interface V3TeacherGuideContent {
  title: string;
  totalMinutes: number;
  materialsNeeded: string[];
  timeline: V3TeacherGuideTimelineItem[];
}

// 8. Answer Key Content
export interface V3AnswerKeyAssetItem {
  itemNumber: number;
  sectionTitle?: string;
  questionPrompt?: string;
  exactAnswer?: string;
  acceptedAnswers?: string[];
  scoringCriteria?: string; // "แนวคำตอบ ประเด็นสำคัญ และเกณฑ์ตรวจ"
  points?: number;
}

export interface V3AnswerKeyAssetContent {
  title: string;
  targetAssetTitle: string;
  targetAssetType: string;
  items: V3AnswerKeyAssetItem[];
  totalPoints: number;
}

// ─────────────────────────────────────────────────────────────────
// Validation Helpers (Pure TypeScript)
// ─────────────────────────────────────────────────────────────────

export interface V3ContentValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTeachingAssetContent(
  assetType: string,
  content: any
): V3ContentValidationResult {
  const errors: string[] = [];

  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['เนื้อหาสื่อการสอนต้องเป็น Object ที่ถูกต้อง'] };
  }

  const normType = (assetType || '').toUpperCase().trim();

  // Common title check
  if (!content.title || typeof content.title !== 'string' || !content.title.trim()) {
    errors.push('กรุณาระบุชื่อเรื่องของสื่อการสอน (title)');
  }

  switch (normType) {
    case 'WORKSHEET':
    case 'PROBLEM_SET':
    case 'ACTIVITY_SHEET':
    case 'QUESTION_SET':
    case 'QUIZ': {
      if (!Array.isArray(content.sections) || content.sections.length === 0) {
        errors.push('ใบงาน/ชุดแบบฝึกต้องมีอย่างน้อย 1 section');
      } else {
        content.sections.forEach((sec: any, sIdx: number) => {
          if (!sec || typeof sec !== 'object') {
            errors.push(`Section ที่ ${sIdx + 1} ไม่ถูกต้อง`);
            return;
          }
          if (!sec.title || !String(sec.title).trim()) {
            errors.push(`Section ที่ ${sIdx + 1} ต้องมีชื่อหัวข้อ`);
          }
          if (!Array.isArray(sec.items) || sec.items.length === 0) {
            errors.push(`Section ที่ ${sIdx + 1} (${sec.title || 'ไม่มีชื่อ'}) ต้องมีโจทย์อย่างน้อย 1 ข้อ`);
          } else {
            sec.items.forEach((item: any, iIdx: number) => {
              if (!item || !item.prompt || !String(item.prompt).trim()) {
                errors.push(`Section ${sIdx + 1}, ข้อที่ ${iIdx + 1}: ต้องระบุคำถาม/โจทย์`);
              }
            });
          }
        });
      }
      break;
    }

    case 'SPEAKING_CARD': {
      if (!Array.isArray(content.cards) || content.cards.length === 0) {
        errors.push('Speaking Card ต้องมีบัตรคำสั่งสนทนาอย่างน้อย 1 ใบ');
      } else {
        content.cards.forEach((c: any, idx: number) => {
          if (!c.assignedTo || !String(c.assignedTo).trim()) {
            errors.push(`Card ใบที่ ${idx + 1}: ต้องระบุผู้ปฏิบัติ (assignedTo)`);
          }
          if (!c.situation || !String(c.situation).trim()) {
            errors.push(`Card ใบที่ ${idx + 1}: ต้องระบุสถานการณ์จำลอง (situation)`);
          }
          if (!Array.isArray(c.cuesOrClues) || c.cuesOrClues.length === 0) {
            errors.push(`Card ใบที่ ${idx + 1}: ต้องมีข้อความชี้นำ/คำถามอย่างน้อย 1 ข้อ (cuesOrClues)`);
          }
        });
      }
      break;
    }

    case 'EXPERIMENT_SHEET':
    case 'DATA_TABLE': {
      if (!Array.isArray(content.materials) || content.materials.length === 0) {
        errors.push('ใบการทดลองต้องระบุรายการวัสดุ/อุปกรณ์');
      }
      if (!Array.isArray(content.steps) || content.steps.length === 0) {
        errors.push('ใบการทดลองต้องระบุขั้นตอนการทดลองอย่างน้อย 1 ขั้น');
      }
      if (!content.dataTable || !Array.isArray(content.dataTable.columns) || content.dataTable.columns.length === 0) {
        errors.push('ใบการทดลองต้องมีตารางบันทึกผล (columns)');
      }
      break;
    }

    case 'TASK_CARD': {
      if (!Array.isArray(content.tasks) || content.tasks.length === 0) {
        errors.push('Task Card ต้องมีภารกิจ/ฐานการฝึกอย่างน้อย 1 รายการ');
      } else {
        content.tasks.forEach((t: any, idx: number) => {
          if (!t.stationName || !String(t.stationName).trim()) {
            errors.push(`Task ที่ ${idx + 1}: ต้องระบุชื่อฐาน/ภารกิจ`);
          }
          if (!Array.isArray(t.steps) || t.steps.length === 0) {
            errors.push(`Task ที่ ${idx + 1}: ต้องระบุขั้นตอนการปฏิบัติ`);
          }
        });
      }
      break;
    }

    case 'FLASHCARD': {
      if (!Array.isArray(content.cards) || content.cards.length === 0) {
        errors.push('Flashcard ต้องมีบัตรคำอย่างน้อย 1 ใบ');
      } else {
        content.cards.forEach((c: any, idx: number) => {
          if (!c.frontText || !String(c.frontText).trim()) {
            errors.push(`Flashcard ใบที่ ${idx + 1}: ด้านหน้าต้องไม่ว่าง`);
          }
          if (!c.backText || !String(c.backText).trim()) {
            errors.push(`Flashcard ใบที่ ${idx + 1}: ด้านหลังต้องไม่ว่าง`);
          }
        });
      }
      break;
    }

    case 'EXIT_TICKET': {
      if (!Array.isArray(content.prompts) || content.prompts.length === 0) {
        errors.push('Exit Ticket ต้องมีคำถามประเมินอย่างน้อย 1 ข้อ');
      } else {
        content.prompts.forEach((p: any, idx: number) => {
          if (!p.question || !String(p.question).trim()) {
            errors.push(`Exit Ticket ข้อที่ ${idx + 1}: คำถามต้องไม่ว่าง`);
          }
        });
      }
      break;
    }

    case 'TEACHER_GUIDE': {
      if (!Array.isArray(content.timeline) || content.timeline.length === 0) {
        errors.push('คู่มือครู (Teacher Guide) ต้องมี Timeline ของกิจกรรม');
      } else {
        content.timeline.forEach((item: any, idx: number) => {
          if (!item.phaseName || !String(item.phaseName).trim()) {
            errors.push(`Timeline ขั้นที่ ${idx + 1}: ต้องระบุชื่อช่วงกิจกรรม`);
          }
          if (!Array.isArray(item.teacherActions) || item.teacherActions.length === 0) {
            errors.push(`Timeline ขั้นที่ ${idx + 1}: ต้องระบุสิ่งที่ครูทำ`);
          }
          if (!Array.isArray(item.studentActions) || item.studentActions.length === 0) {
            errors.push(`Timeline ขั้นที่ ${idx + 1}: ต้องระบุสิ่งที่นักเรียนทำ`);
          }
        });
      }
      break;
    }

    case 'ANSWER_KEY': {
      if (!Array.isArray(content.items) || content.items.length === 0) {
        errors.push('เฉลย/แนวคำตอบต้องมีรายการอย่างน้อย 1 ข้อ');
      } else {
        content.items.forEach((item: any, idx: number) => {
          const hasExact = item.exactAnswer && String(item.exactAnswer).trim().length > 0;
          const hasCriteria = item.scoringCriteria && String(item.scoringCriteria).trim().length > 0;
          const hasAccepted = Array.isArray(item.acceptedAnswers) && item.acceptedAnswers.length > 0;
          if (!hasExact && !hasCriteria && !hasAccepted) {
            errors.push(`เฉลยข้อที่ ${idx + 1}: ต้องมีคำตอบที่ถูกต้องหรือเกณฑ์ตรวจแนวคำตอบ`);
          }
        });
      }
      break;
    }

    default:
      // Other custom content requires at least title and some body/description
      if (!content.description && !content.body && !content.sections && !content.items) {
        errors.push('สื่อการสอนต้องมีเนื้อหาหรือคำอธิบายอย่างน้อยหนึ่งส่วน');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Duration Rule:
 * Validates that estimated asset duration does not exceed the allotted activity minutes.
 */
export function validateAssetDuration(
  estimatedMinutes: number,
  activityMinutes: number
): { valid: boolean; warning?: string } {
  const est = Number(estimatedMinutes) || 0;
  const act = Number(activityMinutes) || 0;

  if (est > 0 && act > 0 && est > act) {
    return {
      valid: false,
      warning: `เวลาทำสื่อ (${est} นาที) เกินเวลาของกิจกรรม (${act} นาที) ⚠ กรุณาปรับลดจำนวนข้อหรือขยายเวลากิจกรรม`,
    };
  }

  return { valid: true };
}
