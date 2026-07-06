-- Lesson Plan Quality Platform — Phase 10 Enhancements
-- 1. Add error tracking columns to evaluation_results
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS error_type TEXT;
ALTER TABLE public.evaluation_results ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;

-- 2. Modify evaluation_results check constraint to allow failed_rate_limited
ALTER TABLE public.evaluation_results DROP CONSTRAINT IF EXISTS evaluation_results_status_check;
ALTER TABLE public.evaluation_results ADD CONSTRAINT evaluation_results_status_check CHECK (
  status IN ('pending', 'processing', 'completed', 'failed', 'skipped', 'failed_rate_limited')
);

-- 3. Add user_id column to lesson_plan_versions for security/easier querying
ALTER TABLE public.lesson_plan_versions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Create patch_jobs table
CREATE TABLE IF NOT EXISTS public.patch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id VARCHAR(255) NOT NULL
    REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  evaluation_job_id UUID
    REFERENCES public.evaluation_jobs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('critical_only', 'critical_high', 'full_improvement')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  current_step TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  from_version_id UUID REFERENCES public.lesson_plan_versions(id) ON DELETE SET NULL,
  to_version_id UUID REFERENCES public.lesson_plan_versions(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 5. Create patch_job_steps table
CREATE TABLE IF NOT EXISTS public.patch_job_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_job_id UUID NOT NULL
    REFERENCES public.patch_jobs(id) ON DELETE CASCADE,
  issue_id UUID
    REFERENCES public.lesson_plan_issues(id) ON DELETE SET NULL,
  target_section TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
  ),
  patch_id UUID
    REFERENCES public.lesson_plan_patches(id) ON DELETE SET NULL,
  error_type TEXT,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 0 CHECK (attempt_count >= 0),
  metadata JSONB DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 6. Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_patch_jobs_lesson_plan_id ON public.patch_jobs(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_patch_jobs_user_id ON public.patch_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_patch_job_steps_job_id ON public.patch_job_steps(patch_job_id);

-- 7. Enable RLS and add basic security policies
ALTER TABLE public.patch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patch_job_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own patch jobs"
  ON public.patch_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users read own patch job steps"
  ON public.patch_job_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patch_jobs job
      WHERE job.id = patch_job_steps.patch_job_id
        AND job.user_id = auth.uid()
    )
  );

-- Admin/Service Role bypass RLS automatically (since service_role is superuser)
