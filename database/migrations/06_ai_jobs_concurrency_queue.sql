-- Shared AI concurrency queue for serverless deployments.
-- Additive and idempotent. Existing lesson data is not touched.

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

ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting';
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;
ALTER TABLE public.ai_jobs
  ADD COLUMN IF NOT EXISTS error_code TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_jobs_active_queue
  ON public.ai_jobs (status, created_at, job_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user
  ON public.ai_jobs (user_id, created_at DESC);

ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

-- Queue rows are intentionally accessed only by server routes with the
-- service-role client. No browser/anon policies are created.

CREATE OR REPLACE FUNCTION public.claim_ai_job(
  p_job_id UUID,
  p_concurrency_limit INTEGER,
  p_lease_seconds INTEGER DEFAULT 90
)
RETURNS TABLE(job_status TEXT, queue_position INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.ai_jobs%ROWTYPE;
  v_active INTEGER;
  v_waiting_ahead INTEGER;
  v_available INTEGER;
BEGIN
  -- Serialize claim decisions across Vercel/serverless instances.
  PERFORM pg_advisory_xact_lock(hashtext('smart_plan_ai_queue_v1'));

  UPDATE public.ai_jobs
  SET status = 'failed',
      error_code = 'E_LEASE_EXPIRED',
      updated_at = NOW()
  WHERE status = 'processing'
    AND lease_expires_at IS NOT NULL
    AND lease_expires_at < NOW();

  UPDATE public.ai_jobs
  SET status = 'expired',
      error_code = 'E_QUEUE_HEARTBEAT_EXPIRED',
      updated_at = NOW()
  WHERE status = 'waiting'
    AND updated_at < NOW() - INTERVAL '5 minutes';

  SELECT * INTO v_job
  FROM public.ai_jobs
  WHERE job_id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, 0;
    RETURN;
  END IF;

  IF v_job.status = 'processing' THEN
    UPDATE public.ai_jobs
    SET lease_expires_at = NOW() + make_interval(secs => GREATEST(30, p_lease_seconds)),
        updated_at = NOW()
    WHERE job_id = p_job_id;
    RETURN QUERY SELECT 'processing'::TEXT, 0;
    RETURN;
  END IF;

  IF v_job.status <> 'waiting' THEN
    RETURN QUERY SELECT v_job.status, 0;
    RETURN;
  END IF;

  UPDATE public.ai_jobs SET updated_at = NOW() WHERE job_id = p_job_id;

  SELECT COUNT(*) INTO v_active
  FROM public.ai_jobs
  WHERE status = 'processing'
    AND lease_expires_at > NOW();

  SELECT COUNT(*) INTO v_waiting_ahead
  FROM public.ai_jobs
  WHERE status = 'waiting'
    AND (
      created_at < v_job.created_at OR
      (created_at = v_job.created_at AND job_id::TEXT < v_job.job_id::TEXT)
    );

  v_available := GREATEST(0, GREATEST(1, p_concurrency_limit) - v_active);

  IF v_available > 0 AND v_waiting_ahead < v_available THEN
    UPDATE public.ai_jobs
    SET status = 'processing',
        updated_at = NOW(),
        lease_expires_at = NOW() + make_interval(secs => GREATEST(30, p_lease_seconds))
    WHERE job_id = p_job_id;
    RETURN QUERY SELECT 'processing'::TEXT, 0;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'waiting'::TEXT, GREATEST(1, v_waiting_ahead - v_available + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_ai_job(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ai_job(UUID, INTEGER, INTEGER) TO service_role;
