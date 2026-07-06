import type { EvaluationMode, LessonPlan } from '../schema';
import type { EvaluationRubricCriterion } from '../rubrics/master-rubric';
import type { ValidationSeverity } from '../validators/types';

export type EvaluationLevel =
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'fair'
  | 'needs_improvement';

export interface EvaluationResultIssue {
  severity: ValidationSeverity;
  issue_type: string;
  title: string;
  description: string;
  suggestion: string;
  auto_fixable: boolean;
}

export interface EvaluationSectionResult {
  section: string;
  score: number;
  max_score: number;
  level: EvaluationLevel;
  evidence_found: string[];
  missing_evidence: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  issues: EvaluationResultIssue[];
  reason: string;
}

export interface EvaluateSectionInput {
  plan: LessonPlan;
  mode: EvaluationMode;
  section: string;
  ruleBasedFindings?: unknown;
  apiKey?: string;
}

export interface SectionDefinition {
  key: string;
  title: string;
  critical: boolean;
  extractPlanData: (plan: LessonPlan) => unknown;
  extractRuleBasedFindings?: (findings: unknown) => unknown;
}

export interface SectionPromptInput {
  plan: LessonPlan;
  section: string;
  criterion: EvaluationRubricCriterion;
  mode: EvaluationMode;
  ruleBasedFindings?: unknown;
}

export interface ConsistencyFlag {
  section: string;
  severity: 'high' | 'medium';
  code: string;
  message: string;
  action: 'retry_section' | 'lower_confidence' | 'manual_review';
}

export interface SectionEvaluationOutcome {
  result: EvaluationSectionResult;
  consistencyFlags: ConsistencyFlag[];
  attempts: number;
}

export interface EvaluationAiRequest {
  prompt: string;
  section: string;
  mode: EvaluationMode;
  criterion: EvaluationRubricCriterion;
  attempt: number;
  timeoutMs: number;
  repairReason?: string;
}

export type EvaluationAiTransport = (
  request: EvaluationAiRequest
) => Promise<unknown>;
