/**
 * Smart Plan V3 — Canonical Document Model Types
 *
 * Pure data structures representing the structured lesson document.
 * Strictly JSON serializable: NO ReactNode, NO functions, NO Date objects, NO class instances.
 * Shared across A4 Preview (V3.8), DOCX Export (V3.9), and PDF Export (V3.9).
 */

export interface DocumentMetadata {
  lessonId: string;
  topic: string;
  unitTitle: string;
  subject: string;
  subjectKey: string;
  courseName: string;
  courseCode: string;
  grade: string;
  durationMinutes: number;
  durationFormatted: string;
  teacherName: string;
  schoolName: string;
  curriculumVersion: string;
  teachingDate?: string | null;
  status: string;
  statusLabel: string;
  learningFocus?: string | null;
  learningFocusLabel?: string | null;
}

export interface DocumentOptions {
  includeCover: boolean;
  includeStudentAssets: boolean;
  includeAnswerKeys: boolean;
  includeAssessmentTools: boolean;
  includeTeacherGuide: boolean;
  includePaReadinessAppendix: boolean;
  includePostTeachingPlaceholder: boolean;
}

export const DEFAULT_DOCUMENT_OPTIONS: DocumentOptions = {
  includeCover: false,
  includeStudentAssets: true,
  includeAnswerKeys: true,
  includeAssessmentTools: true,
  includeTeacherGuide: false,
  includePaReadinessAppendix: false,
  includePostTeachingPlaceholder: true,
};

// ─── Discriminated Union for Document Sections ──────────────────────────

export interface BaseSection {
  id: string; // e.g. "SEC_METADATA", "SEC_OBJECTIVES"
  title: string;
  sectionNumber?: number | string;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  avoidBreakInside?: boolean;
}

export interface HeadingSection extends BaseSection {
  type: 'heading';
  level: 1 | 2 | 3;
  subtitle?: string;
}

export interface ParagraphSection extends BaseSection {
  type: 'paragraph';
  content: string;
  isIndent?: boolean;
}

export interface BulletListSection extends BaseSection {
  type: 'bulletList';
  introText?: string;
  items: Array<{
    id?: string;
    bullet?: string; // e.g. "1.", "•", "1.1"
    text: string;
    subItems?: string[];
  }>;
}

export interface KeyValueSection extends BaseSection {
  type: 'keyValue';
  pairs: Array<{
    key: string;
    value: string;
  }>;
}

export interface TableSection extends BaseSection {
  type: 'table';
  headers: string[];
  rows: string[][];
  columnWidths?: string[]; // e.g. ["20%", "40%", "40%"]
  repeatHeaderOnBreak?: boolean;
}

export interface ActivityTimelineRow {
  position: number;
  phase: string;
  phaseLabel: string;
  minutes: number;
  title: string;
  teacherActions: string;
  studentActions: string;
  assessmentMoment?: string | null;
  feedbackMoment?: string | null;
  linkedObjectiveRefs?: string[];
  linkedEvidenceRefs?: string[];
}

export interface ActivityTimelineSection extends BaseSection {
  type: 'activityTimeline';
  totalMinutes: number;
  rows: ActivityTimelineRow[];
  repeatHeaderOnBreak?: boolean;
}

export interface AssessmentTableRow {
  objectiveRefs: string; // e.g. "ข้อ 1, 2"
  objectiveStatements: string[];
  evidenceRef: string; // e.g. "E1"
  evidenceDescription: string;
  method: string;
  toolType: string;
  toolName: string;
  criteria: string;
  isFormative: boolean;
  appendixRef?: string | null; // e.g. "ดูภาคผนวก ค"
}

export interface AssessmentSection extends BaseSection {
  type: 'assessment';
  rows: AssessmentTableRow[];
}

export interface AssetSummaryRow {
  ref: string;
  title: string;
  assetType: string;
  assetTypeLabel: string;
  audience: string;
  audienceLabel: string;
  appendixRef: string; // e.g. "ดูภาคผนวก ก (ใบงานที่ 1)"
}

export interface AssetSection extends BaseSection {
  type: 'asset';
  rows: AssetSummaryRow[];
}

export interface PostTeachingPlaceholderSection extends BaseSection {
  type: 'postTeachingPlaceholder';
  hasOutcomesRecorded: boolean;
  resultsPlaceholder: string;
  problemsPlaceholder: string;
  solutionsPlaceholder: string;
}

export interface PageBreakSection {
  id: string;
  type: 'pageBreak';
  title?: string;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  avoidBreakInside?: boolean;
}

export type DocumentSection =
  | HeadingSection
  | ParagraphSection
  | BulletListSection
  | KeyValueSection
  | TableSection
  | ActivityTimelineSection
  | AssessmentSection
  | AssetSection
  | PostTeachingPlaceholderSection
  | PageBreakSection;

// ─── Appendix Structure ──────────────────────────────────────────────────

export type AppendixCategory =
  | 'STUDENT_ASSETS'
  | 'ANSWER_KEYS'
  | 'ASSESSMENT_TOOLS'
  | 'TEACHER_GUIDE'
  | 'PA_READINESS';

export interface AppendixItem {
  id: string;
  title: string;
  subtitle?: string;
  itemType: string;
  itemTypeLabel: string;
  content: any; // Structured payload matching Teaching Asset or Assessment Tool schema
  audience?: string;
  isAnswerKey?: boolean;
}

export interface DocumentAppendix {
  id: string; // e.g. "APPENDIX_A"
  letter: string; // e.g. "ก", "ข", "ค"
  category: AppendixCategory;
  categoryLabel: string; // e.g. "ใบงานและสื่อการเรียนรู้สำหรับผู้เรียน"
  title: string; // e.g. "ภาคผนวก ก: ใบงานและสื่อสำหรับผู้เรียน"
  description?: string;
  items: AppendixItem[];
  pageBreakBefore: boolean;
}

// ─── Top-Level Canonical Document ────────────────────────────────────────

export interface V3LessonDocument {
  metadata: DocumentMetadata;
  options: DocumentOptions;
  sections: DocumentSection[];
  appendices: DocumentAppendix[];
  generatedAt: string;
  sourceLessonUpdatedAt: string;
  documentSourceHash: string;
}
