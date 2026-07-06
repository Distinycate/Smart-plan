-- Lesson Plan Quality Platform — Phase 2
-- Additive and idempotent. Does not modify LessonPlans or legacy ai_evaluation_* tables.
--
-- Compatibility decision:
-- LessonPlans.planId is VARCHAR(255) and uses values such as PLAN-XXXX.
-- Therefore lesson_plan_id is VARCHAR(255), not UUID as shown in the generic master spec.

CREATE TABLE IF NOT EXISTS public.evaluation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id VARCHAR(255) NOT NULL
    REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluation_mode TEXT NOT NULL
    CHECK (evaluation_mode IN ('lesson_plan_basic', 'wpa_w9', 'committee_4d')),
  lesson_plan_hash TEXT NOT NULL
    CHECK (lesson_plan_hash ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'lesson_plan_not_ready'
    )),
  current_section TEXT,
  progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress BETWEEN 0 AND 100),
  final_score NUMERIC(7,2)
    CHECK (final_score IS NULL OR final_score BETWEEN 0 AND 100),
  final_level TEXT,
  readiness_status TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.evaluation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL
    REFERENCES public.evaluation_jobs(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (length(btrim(section)) > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  score NUMERIC(7,2),
  max_score NUMERIC(7,2) NOT NULL CHECK (max_score > 0),
  level TEXT,
  evidence_found JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(evidence_found) = 'array'),
  missing_evidence JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(missing_evidence) = 'array'),
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(strengths) = 'array'),
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(weaknesses) = 'array'),
  suggestions JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(suggestions) = 'array'),
  issues JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(issues) = 'array'),
  raw_json JSONB,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT evaluation_results_score_range
    CHECK (score IS NULL OR (score >= 0 AND score <= max_score))
);

CREATE TABLE IF NOT EXISTS public.lesson_plan_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL
    REFERENCES public.evaluation_jobs(id) ON DELETE CASCADE,
  lesson_plan_id VARCHAR(255) NOT NULL
    REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (length(btrim(section)) > 0),
  severity TEXT NOT NULL
    CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  issue_type TEXT NOT NULL CHECK (length(btrim(issue_type)) > 0),
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL CHECK (length(btrim(description)) > 0),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(evidence) = 'array'),
  suggestion TEXT,
  auto_fixable BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'fixed', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fixed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.lesson_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id VARCHAR(255) NOT NULL
    REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  version TEXT NOT NULL CHECK (length(btrim(version)) > 0),
  content JSONB NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  content_hash TEXT NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_by TEXT NOT NULL DEFAULT 'system',
  change_summary TEXT,
  parent_version_id UUID
    REFERENCES public.lesson_plan_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lesson_plan_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id VARCHAR(255) NOT NULL
    REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  job_id UUID
    REFERENCES public.evaluation_jobs(id) ON DELETE SET NULL,
  from_version_id UUID
    REFERENCES public.lesson_plan_versions(id) ON DELETE SET NULL,
  to_version_id UUID
    REFERENCES public.lesson_plan_versions(id) ON DELETE SET NULL,
  patch_type TEXT NOT NULL
    CHECK (patch_type IN ('replace', 'append', 'merge', 'delete')),
  target_section TEXT NOT NULL CHECK (length(btrim(target_section)) > 0),
  severity TEXT
    CHECK (severity IS NULL OR severity IN ('critical', 'high', 'medium', 'low')),
  before_content JSONB,
  after_content JSONB,
  patch_json JSONB NOT NULL CHECK (jsonb_typeof(patch_json) = 'object'),
  reason TEXT,
  applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  CONSTRAINT lesson_plan_patches_applied_timestamp
    CHECK (
      (applied = FALSE AND applied_at IS NULL)
      OR (applied = TRUE AND applied_at IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.evaluation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_hash TEXT NOT NULL
    CHECK (lesson_plan_hash ~ '^[0-9a-f]{64}$'),
  evaluation_mode TEXT NOT NULL
    CHECK (evaluation_mode IN ('lesson_plan_basic', 'wpa_w9', 'committee_4d')),
  final_score NUMERIC(7,2)
    CHECK (final_score IS NULL OR final_score BETWEEN 0 AND 100),
  final_level TEXT,
  result_json JSONB NOT NULL CHECK (jsonb_typeof(result_json) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT evaluation_cache_hash_mode_unique
    UNIQUE (lesson_plan_hash, evaluation_mode)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluation_results_job_section
  ON public.evaluation_results(job_id, section);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_plan_versions_plan_version
  ON public.lesson_plan_versions(lesson_plan_id, version);

CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_lesson_plan_id
  ON public.evaluation_jobs(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_user_created
  ON public.evaluation_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_hash_mode
  ON public.evaluation_jobs(lesson_plan_hash, evaluation_mode);
CREATE INDEX IF NOT EXISTS idx_evaluation_jobs_status_updated
  ON public.evaluation_jobs(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_job_status
  ON public.evaluation_results(job_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_issues_job_id
  ON public.lesson_plan_issues(job_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_issues_plan_status
  ON public.lesson_plan_issues(lesson_plan_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_versions_lesson_plan_id
  ON public.lesson_plan_versions(lesson_plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_versions_content_hash
  ON public.lesson_plan_versions(content_hash);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_patches_plan_created
  ON public.lesson_plan_patches(lesson_plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_patches_job_id
  ON public.lesson_plan_patches(job_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_cache_expires_at
  ON public.evaluation_cache(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_quality_platform_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_evaluation_jobs_updated_at'
      AND tgrelid = 'public.evaluation_jobs'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER set_evaluation_jobs_updated_at
      BEFORE UPDATE ON public.evaluation_jobs
      FOR EACH ROW
      EXECUTE FUNCTION public.set_quality_platform_updated_at();
  END IF;
END $$;

ALTER TABLE public.evaluation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plan_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_plan_patches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evaluation_jobs'
      AND policyname = 'Users read own quality evaluation jobs'
  ) THEN
    CREATE POLICY "Users read own quality evaluation jobs"
      ON public.evaluation_jobs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'evaluation_results'
      AND policyname = 'Users read own quality evaluation results'
  ) THEN
    CREATE POLICY "Users read own quality evaluation results"
      ON public.evaluation_results FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.evaluation_jobs job
          WHERE job.id = evaluation_results.job_id
            AND job.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lesson_plan_issues'
      AND policyname = 'Users read own lesson plan issues'
  ) THEN
    CREATE POLICY "Users read own lesson plan issues"
      ON public.lesson_plan_issues FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.evaluation_jobs job
          WHERE job.id = lesson_plan_issues.job_id
            AND job.user_id = auth.uid()
        )
      );
  END IF;

END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lesson_plan_versions'
      AND policyname = 'Users read own lesson plan versions'
  ) THEN
    CREATE POLICY "Users read own lesson plan versions"
      ON public.lesson_plan_versions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public."LessonPlans" plan
          WHERE plan."planId" = lesson_plan_versions.lesson_plan_id
            AND plan.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lesson_plan_patches'
      AND policyname = 'Users read own lesson plan patches'
  ) THEN
    CREATE POLICY "Users read own lesson plan patches"
      ON public.lesson_plan_patches FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public."LessonPlans" plan
          WHERE plan."planId" = lesson_plan_patches.lesson_plan_id
            AND plan.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- evaluation_cache deliberately has RLS enabled without anon/authenticated policies.
-- All six tables deliberately omit direct client write policies.
-- Only trusted server-side service_role code may create/update evaluation data.

DO $$
BEGIN
  IF to_regclass('public."SchemaVersions"') IS NOT NULL THEN
    INSERT INTO public."SchemaVersions"
      ("schemaVersionId", "version", "description", "checksum", "appliedBy")
    VALUES (
      'SCHEMA-QUALITY-PLATFORM-PHASE2-001',
      '2.2.0-quality-platform-phase2',
      'Add evaluation jobs/results, issues, versions, patches and cache',
      '09_lesson_plan_quality_platform.sql',
      'manual-migration'
    )
    ON CONFLICT ("version") DO NOTHING;
  END IF;
END $$;
