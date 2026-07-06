import type { EvaluationMode } from '../schema';
import type { EvaluationSectionResult } from '../evaluation/types';

export interface EvaluationJobRecord {
  id: string;
  lesson_plan_id: string;
  user_id: string;
  evaluation_mode: EvaluationMode;
  lesson_plan_hash: string;
  status:
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'lesson_plan_not_ready';
  current_section: string | null;
  progress: number;
  final_score: number | null;
  final_level: string | null;
  readiness_status: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface EvaluationResultRecord {
  id: string;
  job_id: string;
  section: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  score: number | null;
  max_score: number;
  level: string | null;
  evidence_found: string[];
  missing_evidence: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  issues: EvaluationSectionResult['issues'];
  raw_json: EvaluationSectionResult | null;
  error_message: string | null;
  attempt_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const PUBLIC_JOB_COLUMNS = [
  'id',
  'lesson_plan_id',
  'evaluation_mode',
  'lesson_plan_hash',
  'status',
  'current_section',
  'progress',
  'final_score',
  'final_level',
  'readiness_status',
  'error_message',
  'metadata',
  'created_at',
  'updated_at',
  'started_at',
  'completed_at',
].join(',');

export const RESULT_COLUMNS = [
  'id',
  'job_id',
  'section',
  'status',
  'score',
  'max_score',
  'level',
  'evidence_found',
  'missing_evidence',
  'strengths',
  'weaknesses',
  'suggestions',
  'issues',
  'raw_json',
  'error_message',
  'attempt_count',
  'started_at',
  'completed_at',
  'created_at',
].join(',');
