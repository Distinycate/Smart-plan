-- ==============================================================================
-- SMART PLAN V3: MIGRATION 18 — FINALIZATION HARDENING, TRANSACTION & IMMUTABILITY
--
-- Goals:
-- 1. Partial Unique Index: Exactly one active FINAL snapshot per finalized lesson
-- 2. DB Trigger / Immutability: Deny UPDATE or DELETE on version rows with label = 'FINAL'
-- 3. PostgreSQL RPC Function: finalize_v3_lesson(...) executed as a single atomic transaction
-- 4. DB Trigger / Edit Lock: Deny INSERT/UPDATE/DELETE on child entities if parent plan is FINAL
-- ==============================================================================

-- 1. Unique Partial Index on v3_plan_versions for FINAL label
CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_plan_versions_final_unique
ON public.v3_plan_versions (lesson_plan_id)
WHERE (label = 'FINAL');

-- 2. Immutability Trigger on v3_plan_versions
CREATE OR REPLACE FUNCTION public.prevent_final_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.label = 'FINAL') THEN
    IF (TG_OP = 'UPDATE') THEN
      RAISE EXCEPTION 'Cannot update an immutable FINAL version snapshot (version_id: %)', OLD.id
        USING ERRCODE = '23505';
    ELSIF (TG_OP = 'DELETE') THEN
      RAISE EXCEPTION 'Cannot delete an immutable FINAL version snapshot (version_id: %)', OLD.id
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_final_version_mutation ON public.v3_plan_versions;
CREATE TRIGGER trg_prevent_final_version_mutation
BEFORE UPDATE OR DELETE ON public.v3_plan_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_final_version_mutation();

-- 3. Central Atomic Transaction RPC: finalize_v3_lesson
CREATE OR REPLACE FUNCTION public.finalize_v3_lesson(
  p_lesson_id UUID,
  p_user_id UUID,
  p_snapshot JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_existing_final RECORD;
  v_max_version INT;
  v_next_version INT;
  v_new_version_id UUID;
  v_timestamp TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Lock the lesson plan row to serialize concurrent finalization calls
  SELECT status INTO v_current_status
  FROM public.v3_lesson_plans
  WHERE id = p_lesson_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson plan not found or access denied (id: %)', p_lesson_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Idempotency check: If already FINAL, return existing final snapshot record without creating duplicates
  IF v_current_status = 'FINAL' THEN
    SELECT id, version_number, snapshot, created_at INTO v_existing_final
    FROM public.v3_plan_versions
    WHERE lesson_plan_id = p_lesson_id AND label = 'FINAL'
    ORDER BY version_number DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'status', 'FINAL',
        'version', v_existing_final.version_number,
        'version_id', v_existing_final.id,
        'documentSourceHash', v_existing_final.snapshot->>'documentSourceHash',
        'finalizedAt', v_existing_final.created_at,
        'isDuplicate', true,
        'message', 'Lesson plan is already finalized (returning existing snapshot)'
      );
    END IF;
  END IF;

  -- 3. Verify that the lesson status is REVIEWED
  IF v_current_status <> 'REVIEWED' THEN
    RAISE EXCEPTION 'Cannot finalize lesson plan with status % (must be REVIEWED)', v_current_status
      USING ERRCODE = '22000';
  END IF;

  -- 4. Calculate next version number
  SELECT COALESCE(MAX(version_number), 0) INTO v_max_version
  FROM public.v3_plan_versions
  WHERE lesson_plan_id = p_lesson_id;

  v_next_version := v_max_version + 1;

  -- 5. Insert immutable snapshot into v3_plan_versions
  INSERT INTO public.v3_plan_versions (
    lesson_plan_id,
    version_number,
    label,
    snapshot,
    created_by,
    created_at
  ) VALUES (
    p_lesson_id,
    v_next_version,
    'FINAL',
    p_snapshot,
    p_user_id,
    v_timestamp
  )
  RETURNING id INTO v_new_version_id;

  -- 6. Update lesson status to FINAL
  UPDATE public.v3_lesson_plans
  SET status = 'FINAL',
      updated_at = v_timestamp
  WHERE id = p_lesson_id AND user_id = p_user_id;

  -- 7. Return atomic success payload
  RETURN jsonb_build_object(
    'success', true,
    'status', 'FINAL',
    'version', v_next_version,
    'version_id', v_new_version_id,
    'documentSourceHash', p_snapshot->>'documentSourceHash',
    'finalizedAt', v_timestamp,
    'isDuplicate', false,
    'message', 'Lesson plan successfully finalized with atomic snapshot'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Child Entity Edit Lock Trigger for FINAL Lessons
CREATE OR REPLACE FUNCTION public.prevent_final_lesson_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_plan_status TEXT;
BEGIN
  v_plan_id := COALESCE(NEW.lesson_plan_id, OLD.lesson_plan_id);
  IF v_plan_id IS NOT NULL THEN
    SELECT status INTO v_plan_status
    FROM public.v3_lesson_plans
    WHERE id = v_plan_id;

    IF v_plan_status = 'FINAL' THEN
      RAISE EXCEPTION 'Modifications to lesson components are prohibited when plan is locked in FINAL status (plan_id: %)', v_plan_id
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Objectives Lock
DROP TRIGGER IF EXISTS trg_v3_objectives_final_lock ON public.v3_objectives;
CREATE TRIGGER trg_v3_objectives_final_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.v3_objectives
FOR EACH ROW EXECUTE FUNCTION public.prevent_final_lesson_mutation();

-- Evidence Lock
DROP TRIGGER IF EXISTS trg_v3_evidence_final_lock ON public.v3_evidence;
CREATE TRIGGER trg_v3_evidence_final_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.v3_evidence
FOR EACH ROW EXECUTE FUNCTION public.prevent_final_lesson_mutation();

-- Activities Lock
DROP TRIGGER IF EXISTS trg_v3_activities_final_lock ON public.v3_activities;
CREATE TRIGGER trg_v3_activities_final_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.v3_activities
FOR EACH ROW EXECUTE FUNCTION public.prevent_final_lesson_mutation();

-- Assessments Lock
DROP TRIGGER IF EXISTS trg_v3_assessments_final_lock ON public.v3_assessments;
CREATE TRIGGER trg_v3_assessments_final_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.v3_assessments
FOR EACH ROW EXECUTE FUNCTION public.prevent_final_lesson_mutation();

-- Teaching Assets Lock
DROP TRIGGER IF EXISTS trg_v3_teaching_assets_final_lock ON public.v3_teaching_assets;
CREATE TRIGGER trg_v3_teaching_assets_final_lock
BEFORE INSERT OR UPDATE OR DELETE ON public.v3_teaching_assets
FOR EACH ROW EXECUTE FUNCTION public.prevent_final_lesson_mutation();
