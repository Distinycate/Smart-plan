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
  created_at: string;
  updated_at: string;
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
  students_total: number | null;
  students_passed: number | null;
  students_need_support: number | null;
  actual_teaching_notes: string | null;
  problems: string | null;
  adjustments_made: string | null;
  feedback_given: string | null;
  remediation_plan: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Composite Aggregate Root for Lesson V3
 * Loaded via getV3LessonGraph(planId)
 */
export interface V3LessonGraph {
  lesson: V3LessonPlan;
  objectives: V3LessonObjective[];
  evidence: V3LearningEvidence[];
  objectiveEvidenceLinks: V3ObjectiveEvidenceLink[];
  activities: V3LessonActivity[];
  activityObjectiveLinks: V3ActivityObjectiveLink[];
  activityEvidenceLinks: V3ActivityEvidenceLink[];
  assessments: V3Assessment[];
  assessmentEvidenceLinks: V3AssessmentEvidenceLink[];
  assessmentTools: V3AssessmentTool[];
  teachingAssets: V3TeachingAsset[];
  postTeaching: V3PostTeachingRecord | null;
  reviews?: V3PlanReview[];
}
