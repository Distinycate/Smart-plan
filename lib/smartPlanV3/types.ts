/**
 * Smart Plan V3 Domain Types
 * Single Source of Truth for V3 entities and graph relationships.
 */

export type V3LessonStatus =
  | 'DRAFT'
  | 'BLUEPRINT_READY'
  | 'PACKAGE_READY'
  | 'REVIEWED'
  | 'FINAL'
  | 'TAUGHT'
  | 'REFLECTED';

export function isLessonLocked(status: string | null | undefined): boolean {
  if (!status) return false;
  return ['FINAL', 'TAUGHT', 'REFLECTED'].includes(status);
}

export type V3SourceType = 'MANUAL' | 'AI';

export type V3AudienceType = 'TEACHER' | 'STUDENT' | 'BOTH';

export type V3AssetStatus = 'DRAFT' | 'READY' | 'FAILED';

export type V3ReviewType = 'RULE' | 'AI' | 'PA_READINESS';

export type V3ReviewStatus = 'PENDING' | 'PASSED' | 'WARNING' | 'FAILED';

export interface V3LessonPlan {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  course_name: string;
  course_code: string;
  subject_key: string;
  grade_level: string;
  curriculum_version: string;
  unit_reference: string | null;
  duration_minutes: number;
  status: V3LessonStatus;
  // V3.3 additions
  learning_focus: string | null;
  teaching_date: string | null;    // ISO date string
  student_context: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Curriculum link: one row per indicator selected for a lesson.
 * Persists snapshot labels for long-term readability.
 */
export interface V3LessonCurriculumLink {
  id: string;
  lesson_plan_id: string;
  curriculum_version: string;
  subject_key: string;
  grade_level: string;
  standard_code: string;
  indicator_code: string;
  standard_label_snapshot: string;
  indicator_label_snapshot: string;
  position: number;
  created_at: string;
}



export interface V3LessonObjective {
  id: string;
  lesson_plan_id: string;
  position: number;
  statement: string;
  objective_type: string | null; // e.g. 'K' | 'P' | 'A'
  observable_behavior: string | null;
  source: V3SourceType;
  created_at: string;
  updated_at: string;
}

export interface V3LearningEvidence {
  id: string;
  lesson_plan_id: string;
  position: number;
  evidence_type: string; // e.g. 'WORKSHEET' | 'PERFORMANCE' | 'PRODUCT' | 'OBSERVATION'
  description: string;
  source: V3SourceType;
  created_at: string;
  updated_at: string;
}

export interface V3ObjectiveEvidenceLink {
  objective_id: string;
  evidence_id: string;
  created_at: string;
}

export interface V3LessonActivity {
  id: string;
  lesson_plan_id: string;
  position: number;
  phase: string; // e.g. 'WARM_UP' | 'PRESENTATION' | 'PRACTICE' | 'PRODUCTION' | 'WRAP_UP'
  minutes: number;
  title: string | null;
  teacher_actions: string;
  student_actions: string;
  assessment_moment: string | null;
  feedback_moment: string | null;
  source: V3SourceType;
  created_at: string;
  updated_at: string;
}

export interface V3ActivityObjectiveLink {
  activity_id: string;
  objective_id: string;
  created_at: string;
}

export interface V3ActivityEvidenceLink {
  activity_id: string;
  evidence_id: string;
  created_at: string;
}

export interface V3Assessment {
  id: string;
  lesson_plan_id: string;
  position: number;
  name: string;
  assessment_type: string; // e.g. 'RUBRIC' | 'CHECKLIST' | 'ANSWER_KEY'
  method: string;
  criteria_type: string; // e.g. 'SCORE' | 'PERCENTAGE' | 'RUBRIC_LEVEL'
  criteria_value: number | null;
  criteria_text: string | null;
  formative: boolean;
  source: V3SourceType;
  created_at: string;
  updated_at: string;
}

export interface V3AssessmentEvidenceLink {
  assessment_id: string;
  evidence_id: string;
  created_at: string;
}

export interface V3AssessmentTool {
  id: string;
  assessment_id: string;
  tool_type: string;
  title: string;
  content: Record<string, any>;
  source: V3SourceType;
  created_at: string;
  updated_at: string;
}

export interface V3TeachingAsset {
  id: string;
  lesson_plan_id: string;
  position: number;
  asset_type: string;
  title: string;
  content: Record<string, any>;
  audience: V3AudienceType;
  generation_status: V3AssetStatus;
  needs_review: boolean;
  source: V3SourceType;
  created_at: string;
  updated_at: string;
}

export interface V3PlanReview {
  id: string;
  lesson_plan_id: string;
  review_type: V3ReviewType;
  status: V3ReviewStatus;
  result: Record<string, any>;
  created_at: string;
}

export interface V3PlanVersion {
  id: string;
  lesson_plan_id: string;
  version_number: number;
  label: string | null;
  snapshot: Record<string, any>;
  created_by: string;
  created_at: string;
}

export interface V3PostTeachingRecord {
  id: string;
  lesson_plan_id: string;
  taught_at?: string | null;
  actual_duration_minutes?: number | null;
  students_total: number | null;
  students_present?: number | null;
  students_absent?: number | null;
  students_assessed?: number | null;
  students_passed: number | null;
  students_need_support: number | null;
  actual_teaching_notes: string | null;
  problems: string | null;
  adjustments_made: string | null;
  feedback_given: string | null;
  remediation_plan: string | null;
  reflection: string | null;
  what_worked?: string | null;
  next_lesson_adjustment?: string | null;
  session_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type V3ObservedEvidenceType =
  | 'AGGREGATE_RESULT'
  | 'STUDENT_WORK_SAMPLE'
  | 'OBSERVATION'
  | 'ASSESSMENT_RESULT'
  | 'PHOTO_EVIDENCE'
  | 'EXIT_TICKET_SAMPLE'
  | 'PERFORMANCE_SAMPLE'
  | 'OTHER';

export type V3ObservedOutcomeStatus =
  | 'OBSERVED'
  | 'PARTIALLY_OBSERVED'
  | 'NOT_OBSERVED'
  | 'NOT_ASSESSED';

export interface V3ObservedStudentEvidence {
  id: string;
  lesson_plan_id: string;
  post_teaching_record_id: string;
  planned_evidence_id: string | null;
  objective_id: string | null;
  assessment_id: string | null;
  evidence_type: V3ObservedEvidenceType | string;
  title: string;
  description: string;
  summary_data?: Record<string, any>;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  sample_label: string | null;
  outcome_status: V3ObservedOutcomeStatus;
  observed_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ObservedOutcomeItem {
  objectiveId?: string;
  objectiveTitle?: string;
  status: V3ObservedOutcomeStatus;
  evidenceCount: number;
  evidenceRefs: string[];
  notes?: string;
}

export interface ObservedOutcomeEvidenceSummary {
  items: ObservedOutcomeItem[];
  totalObserved: number;
  totalPartiallyObserved: number;
  totalNotObserved: number;
  totalNotAssessed: number;
  evaluatedAt: string;
}

export interface PostTeachingOverlayData {
  record: V3PostTeachingRecord | null;
  observedEvidence: V3ObservedStudentEvidence[];
  outcomeSummary?: ObservedOutcomeEvidenceSummary;
  postTeachingSourceHash?: string;
}


export interface V3AssessmentActivityLink {
  assessment_id: string;
  activity_id: string;
  created_at: string;
}

export interface V3AssetObjectiveLink {
  asset_id: string;
  objective_id: string;
  created_at: string;
}

export interface V3AssetActivityLink {
  asset_id: string;
  activity_id: string;
  created_at: string;
}

export interface V3AssetEvidenceLink {
  asset_id: string;
  evidence_id: string;
  created_at: string;
}

export interface V3TeachingAssetWithLinks extends V3TeachingAsset {
  linkedObjectiveIds: string[];
  linkedActivityIds: string[];
  linkedEvidenceIds: string[];
}

/**
 * Composite Aggregate Root for Lesson V3
 * Loaded via getLessonGraph(planId)
 */
export interface V3LessonGraph {
  lesson: V3LessonPlan;
  curriculumLinks: V3LessonCurriculumLink[];
  objectives: V3LessonObjective[];
  evidence: V3LearningEvidence[];
  objectiveEvidenceLinks: V3ObjectiveEvidenceLink[];
  activities: V3LessonActivity[];
  activityObjectiveLinks: V3ActivityObjectiveLink[];
  activityEvidenceLinks: V3ActivityEvidenceLink[];
  assessments: V3Assessment[];
  assessmentEvidenceLinks: V3AssessmentEvidenceLink[];
  assessmentActivityLinks: V3AssessmentActivityLink[];
  assessmentTools: V3AssessmentTool[];
  teachingAssets: V3TeachingAsset[];
  assetObjectiveLinks?: V3AssetObjectiveLink[];
  assetActivityLinks?: V3AssetActivityLink[];
  assetEvidenceLinks?: V3AssetEvidenceLink[];
  postTeaching: V3PostTeachingRecord | null;
  reviews?: V3PlanReview[];
}

// ─────────────────────────────────────────────────────────────────
// Wave V3.4 — Blueprint & Activity Engine Types
// ─────────────────────────────────────────────────────────────────

export type V3ActivityPhase =
  | 'ENGAGE'
  | 'EXPLORE'
  | 'LEARN'
  | 'MODEL'
  | 'PRACTICE'
  | 'APPLY'
  | 'PERFORM'
  | 'DISCUSS'
  | 'INVESTIGATE'
  | 'CREATE'
  | 'ASSESS'
  | 'REFLECT'
  | 'SUMMARIZE'
  | 'OTHER';

export interface V3ActivityWithLinks extends V3LessonActivity {
  linkedObjectiveIds: string[];
  linkedEvidenceIds: string[];
}

export interface V3BlueprintActivityDraft {
  temporaryId: string;
  phase: V3ActivityPhase | string;
  title: string;
  minutes: number;
  teacherActions: string[];
  studentActions: string[];
  linkedObjectiveRefs: string[]; // e.g. ['O1', 'O2']
  linkedEvidenceRefs: string[];  // e.g. ['E1']
  formativeCheck?: {
    enabled: boolean;
    description: string;
  };
  feedback?: {
    enabled: boolean;
    description: string;
  };
  requiredAssetHints?: string[];
  // Resolved UUIDs after mapping back on server
  resolvedObjectiveIds?: string[];
  resolvedEvidenceIds?: string[];
}

export interface V3LessonBlueprint {
  summary: {
    lessonApproach: string;
    learningFlow: string;
  };
  activities: V3BlueprintActivityDraft[];
}

export interface V3ContextObjective {
  ref: string;       // e.g. 'O1'
  id: string;        // real UUID
  statement: string;
  objective_type: string | null;
}

export interface V3ContextEvidence {
  ref: string;       // e.g. 'E1'
  id: string;        // real UUID
  evidence_type: string;
  description: string;
}

export interface V3LessonGenerationContext {
  lessonId: string;
  subject: string;
  grade: string;
  topic: string;
  durationMinutes: number;
  learningFocus: string;
  indicators: Array<{
    code: string;
    text: string;
  }>;
  objectives: V3ContextObjective[];
  evidence: V3ContextEvidence[];
  objectiveEvidenceLinks: Array<{
    objectiveRef: string;
    evidenceRef: string;
  }>;
  subjectProfile: {
    key: string;
    labelTh: string;
    learningFocusTh?: string;
    preferredLearningPatterns: string[];
    objectiveGuidance: string[];
    evidenceGuidance: string[];
    avoidPatterns: string[];
  };
}

export interface V3ActivityRuleSummary {
  duration: {
    totalMinutes: number;
    targetMinutes: number;
    valid: boolean;
    remainingMinutes: number;
    message: string;
  };
  objectives: {
    total: number;
    covered: number;
    uncoveredIds: string[];
    allCovered: boolean;
    message: string;
  };
  evidence: {
    total: number;
    linked: number;
    unlinkedIds: string[];
    message: string;
  };
  studentActions: {
    valid: boolean;
    emptyActivityPositions: number[];
    message: string;
  };
  hasFormativeCheck: boolean;
  hasFeedback: boolean;
  allPassed: boolean;
}

export interface V3TimeNormalizationSuggestion {
  index: number;
  originalMinutes: number;
  suggestedMinutes: number;
  diff: number;
  reason: string;
}

// ─────────────────────────────────────────────────────────────────
// Wave V3.5 — Assessment Engine Types
// ─────────────────────────────────────────────────────────────────

export type V3AssessmentType =
  | 'QUIZ'
  | 'OBSERVATION'
  | 'PERFORMANCE'
  | 'PRODUCT'
  | 'WRITTEN_RESPONSE'
  | 'DISCUSSION'
  | 'EXPERIMENT'
  | 'EXIT_TICKET'
  | 'OTHER';

export type V3AssessmentToolType =
  | 'ANSWER_KEY'
  | 'SCORING_GUIDE'
  | 'CHECKLIST'
  | 'RATING_SCALE'
  | 'RUBRIC'
  | 'PERFORMANCE_RUBRIC'
  | 'PRODUCT_RUBRIC'
  | 'OBSERVATION_FORM'
  | 'QUESTION_SET'
  | 'EXIT_TICKET'
  | 'OTHER';

export type V3CriteriaType =
  | 'SCORE_THRESHOLD'
  | 'PERCENTAGE'
  | 'ITEMS_PASSED'
  | 'RUBRIC_LEVEL'
  | 'PASS_FAIL'
  | 'CUSTOM';

export interface V3AssessmentWithLinks extends V3Assessment {
  linkedEvidenceIds: string[];
  linkedActivityIds: string[];
  tool?: V3AssessmentTool | null;
}

// Tool Content Schemas

export interface V3AnswerKeyItem {
  number: number;
  question?: string;
  answer: string;
  points: number;
}

export interface V3AnswerKeyContent {
  items: V3AnswerKeyItem[];
  totalPoints: number;
}

export interface V3ChecklistItem {
  id: string;
  criterion: string;
  observable: boolean;
}

export interface V3ChecklistContent {
  title?: string;
  items: V3ChecklistItem[];
  passingThreshold?: number;
}

export interface V3RatingScaleLevel {
  value: number;
  label: string;
}

export interface V3RatingScaleItem {
  id: string;
  criterion: string;
}

export interface V3RatingScaleContent {
  title?: string;
  scale: V3RatingScaleLevel[];
  items: V3RatingScaleItem[];
}

export interface V3RubricLevel {
  score: number;
  label: string;
}

export interface V3RubricCriterion {
  id?: string;
  name: string;
  weight?: number;
  descriptors: Record<string, string>; // key = score as string e.g. "4", "3", "2", "1"
}

export interface V3RubricContent {
  title: string;
  levels: V3RubricLevel[];
  criteria: V3RubricCriterion[];
}

export interface V3ScoringGuideItem {
  criterion: string;
  maxPoints: number;
  description?: string;
}

export interface V3ScoringGuideContent {
  title?: string;
  items: V3ScoringGuideItem[];
  totalPoints: number;
}

export interface V3ObservationBehavior {
  id: string;
  targetBehavior: string;
  lookFors: string[];
}

export interface V3ObservationFormContent {
  title?: string;
  behaviors: V3ObservationBehavior[];
  notesPrompt?: string;
}

export interface V3ExitTicketPrompt {
  question: string;
  expectedAnswer?: string;
  criteria?: string;
}

export interface V3ExitTicketContent {
  title?: string;
  prompts: V3ExitTicketPrompt[];
}

// Recommendation & Rule Types

export interface V3AssessmentRecommendation {
  preferredAssessmentType: V3AssessmentType;
  preferredToolTypes: V3AssessmentToolType[];
  supportedToolTypes: V3AssessmentToolType[];
  notRecommendedToolTypes: V3AssessmentToolType[];
  suggestedMethod: string;
  defaultCriteriaType: V3CriteriaType;
  defaultCriteriaValue?: number;
  defaultCriteriaText?: string;
  rationale: string;
}

export interface V3AssessmentRuleSummary {
  evidenceCoverage: {
    total: number;
    assessed: number;
    unassessedEvidenceIds: string[];
    allCovered: boolean;
    message: string;
  };
  toolsCompleteness: {
    total: number;
    withTools: number;
    missingToolAssessmentIds: string[];
    allComplete: boolean;
    message: string;
  };
  criteriaCompleteness: {
    total: number;
    withCriteria: number;
    missingCriteriaAssessmentIds: string[];
    allComplete: boolean;
    message: string;
  };
  hasFormativeAssessment: boolean;
  hasFeedbackOpportunity: boolean;
  toolWarnings: Array<{
    assessmentId: string;
    toolType: string;
    warning: string;
  }>;
  allPassed: boolean;
}

export interface V3AssessmentReadiness {
  ready: boolean;
  totalEvidenceCount: number;
  assessedEvidenceCount: number;
  missingAssessmentEvidenceIds: string[];
  missingToolAssessmentIds: string[];
  missingCriteriaAssessmentIds: string[];
  warnings: string[];
  summary: {
    evidenceCoverage: boolean;
    toolsComplete: boolean;
    criteriaComplete: boolean;
    hasFormative: boolean;
    hasFeedback: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────
// Wave V3.6 — Teaching Package Builder Types
// ─────────────────────────────────────────────────────────────────

export type V3TeachingAssetType =
  | 'WORKSHEET'
  | 'ACTIVITY_SHEET'
  | 'TASK_CARD'
  | 'SPEAKING_CARD'
  | 'READING_TEXT'
  | 'EXPERIMENT_SHEET'
  | 'DATA_TABLE'
  | 'PROBLEM_SET'
  | 'FLASHCARD'
  | 'QUESTION_SET'
  | 'QUIZ'
  | 'EXIT_TICKET'
  | 'ANSWER_KEY'
  | 'TEACHER_GUIDE'
  | 'ASSESSMENT_FORM'
  | 'OTHER';

export type V3AssetRequirementCategory = 'required' | 'recommended' | 'optional' | 'notNeeded';

export interface V3TeachingAssetRequirementItem {
  assetType: V3TeachingAssetType | string;
  labelTh: string;
  category: V3AssetRequirementCategory;
  audience: V3AudienceType;
  targetActivityPositions?: number[];
  targetObjectiveIds?: string[];
  targetEvidenceIds?: string[];
  rationale: string;
  isAssessmentToolReuse?: boolean;
  reusableToolType?: string;
  descriptionTh?: string;
}

export interface V3TeachingAssetRequirements {
  required: V3TeachingAssetRequirementItem[];
  recommended: V3TeachingAssetRequirementItem[];
  optional: V3TeachingAssetRequirementItem[];
  notNeeded: V3TeachingAssetRequirementItem[];
  summary: string;
}

export interface V3TeachingPackageReadiness {
  ready: boolean;
  requiredAssets: Array<{
    assetType: string;
    labelTh: string;
    ready: boolean;
    existingAssetId?: string;
    isAssessmentToolReuse?: boolean;
  }>;
  missingRequiredAssets: string[];
  assetsNeedReview: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  warnings: string[];
  summary: {
    blueprintReady: boolean;
    assessmentReady: boolean;
    requiredAssetsComplete: boolean;
    allAssetsReviewed: boolean;
  };
}
