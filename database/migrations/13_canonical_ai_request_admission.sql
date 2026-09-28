-- Phase 1 / Wave 2A: distributed admission control for canonical AI routes.
-- Additive and idempotent. Does not modify LessonPlans or teacher content.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'processing', 'complete', 'cancel', 'failed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_expires_at TIMESTAMPTZ,
  error_code TEXT
);

ALTER TABLE public.ai_jobs ADD COLUMN IF NOT EXISTS request_kind TEXT;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_jobs_admission_active
  ON public.ai_jobs (status, lease_expires_at, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_admission_user_active
  ON public.ai_jobs (user_id, status, lease_expires_at);

-- This function is the shared-state concurrency boundary for serverless routes.
-- It admits immediately or rejects immediately; it never leaves a browser request
-- waiting for a queue slot and therefore cannot create a Gemini call after timeout.
CREATE OR REPLACE FUNCTION public.admit_canonical_ai_request(
  p_user_id UUID,
  p_request_kind TEXT,
  p_global_limit INTEGER,
  p_per_user_limit INTEGER,
  p_lease_seconds INTEGER DEFAULT 75
)
RETURNS TABLE(job_id UUID, admission_status TEXT, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global_active INTEGER;
  v_user_active INTEGER;
  v_job_id UUID;
  v_lease_seconds INTEGER := GREATEST(30, LEAST(p_lease_seconds, 120));
BEGIN
  IF p_user_id IS NULL OR p_request_kind IS NULL OR length(trim(p_request_kind)) = 0 THEN
    RAISE EXCEPTION 'invalid canonical AI admission input';
  END IF;

  -- Serialize admission across Vercel/serverless instances.
  PERFORM pg_advisory_xact_lock(hashtext('smart_plan_canonical_ai_admission_v1'));

  UPDATE public.ai_jobs
  SET status = 'expired',
      error_code = 'E_AI_LEASE_EXPIRED',
      updated_at = NOW()
  WHERE status = 'processing'
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < NOW();

  SELECT COUNT(*) INTO v_user_active
  FROM public.ai_jobs
  WHERE user_id = p_user_id
    AND status = 'processing'
    AND lease_expires_at > NOW();

  IF v_user_active >= GREATEST(1, p_per_user_limit) THEN
    RETURN QUERY SELECT NULL::UUID, 'user_limit_reached'::TEXT, 10;
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_global_active
  FROM public.ai_jobs
  WHERE status = 'processing'
    AND lease_expires_at > NOW();

  IF v_global_active >= GREATEST(1, p_global_limit) THEN
    RETURN QUERY SELECT NULL::UUID, 'global_limit_reached'::TEXT, 5;
    RETURN;
  END IF;

  INSERT INTO public.ai_jobs (
    user_id, request_kind, status, lease_expires_at, created_at, updated_at
  )
  VALUES (
    p_user_id, trim(p_request_kind), 'processing',
    NOW() + make_interval(secs => v_lease_seconds), NOW(), NOW()
  )
  RETURNING public.ai_jobs.job_id INTO v_job_id;

  RETURN QUERY SELECT v_job_id, 'admitted'::TEXT, 0;
END;
$$;

REVOKE ALL ON FUNCTION public.admit_canonical_ai_request(UUID, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admit_canonical_ai_request(UUID, TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION public.admit_canonical_ai_request(UUID, TEXT, INTEGER, INTEGER, INTEGER) IS
  'Phase 1 Wave 2A server-side, database-backed concurrency admission for canonical Gemini requests.';

COMMIT;
