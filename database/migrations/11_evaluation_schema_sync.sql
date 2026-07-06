-- 11_evaluation_schema_sync.sql
-- This migration ensures that all expected columns exist on the evaluation tables
-- using safe ADD COLUMN IF NOT EXISTS statements.

-- ==============================================================================
-- 1. evaluation_jobs
-- ==============================================================================
DO $$ 
BEGIN 
  ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN END; $$;

ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS lesson_plan_id TEXT;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS evaluation_mode TEXT DEFAULT 'lesson_plan_basic';
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS lesson_plan_hash TEXT;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS current_section TEXT;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS progress NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS final_score NUMERIC(7,2);
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS final_level TEXT;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS readiness_status TEXT;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.evaluation_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ==============================================================================
-- 2. evaluation_results
-- ==============================================================================
DO $$ 
BEGIN 
  ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN END; $$;

ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.evaluation_jobs(id) ON DELETE CASCADE;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS score NUMERIC(7,2);
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS max_score NUMERIC(7,2) DEFAULT 1;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS evidence_found TEXT[];
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS missing_evidence TEXT[];
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS strengths TEXT[];
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS weaknesses TEXT[];
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS suggestions TEXT[];
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS issues JSONB;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS raw_json JSONB;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS error_type TEXT;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS attempt_count INT DEFAULT 0;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ==============================================================================
-- 3. lesson_plan_issues
-- ==============================================================================
DO $$ 
BEGIN 
  ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
EXCEPTION WHEN OTHERS THEN END; $$;

ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.evaluation_jobs(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS lesson_plan_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT '';
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'low';
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS issue_type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS evidence TEXT[];
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS suggestion TEXT;
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS auto_fixable BOOLEAN DEFAULT false;
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.lesson_plan_issues ADD COLUMN IF NOT EXISTS fixed_at TIMESTAMPTZ;

-- Drop constraints if needed, but since it's just sync, adding columns is the safest approach
