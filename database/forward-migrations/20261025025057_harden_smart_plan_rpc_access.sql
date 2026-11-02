-- REVIEWED LOCAL CANDIDATE ONLY: stage and verify before any production apply.
-- Generated with Supabase CLI migration new; retained outside its automatic push directory.
-- Existing host functions only; no learner/teacher rows or EMH content are changed.
-- Business bodies are preserved from migrations18/19 with an actor guard and fixed search_path.
BEGIN;


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
  -- Bind the caller to the requested owner before any privileged table access.
  -- service_role is a server credential; a client cannot choose this database role.
  IF COALESCE(current_setting('role', true), '') <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'RPC_ACTOR_MISMATCH' USING ERRCODE = '42501';
  END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp;


CREATE OR REPLACE FUNCTION public.record_v3_teaching(
  p_lesson_id UUID,
  p_user_id UUID,
  p_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_total INT;
  v_passed INT;
  v_support INT;
  v_present INT;
  v_absent INT;
  v_assessed INT;
  v_duration INT;
  v_notes TEXT;
  v_taught_at TIMESTAMPTZ;
  v_timestamp TIMESTAMPTZ := NOW();
  v_record_id UUID;
BEGIN
  -- Bind the caller to the requested owner before any privileged table access.
  -- service_role is a server credential; a client cannot choose this database role.
  IF COALESCE(current_setting('role', true), '') <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'RPC_ACTOR_MISMATCH' USING ERRCODE = '42501';
  END IF;
  -- 1. Lock the lesson plan row
  SELECT status INTO v_current_status
  FROM public.v3_lesson_plans
  WHERE id = p_lesson_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson plan not found or access denied (id: %)', p_lesson_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. State Guard: Must be in FINAL status (or already TAUGHT for editing)
  IF v_current_status NOT IN ('FINAL', 'TAUGHT') THEN
    RAISE EXCEPTION 'Cannot record teaching for lesson with status % (must be FINAL)', v_current_status
      USING ERRCODE = '22000';
  END IF;

  -- 3. Extract and Validate Student Counts
  v_total := (p_data->>'students_total')::INT;
  v_passed := (p_data->>'students_passed')::INT;
  v_support := (p_data->>'students_need_support')::INT;
  v_present := (p_data->>'students_present')::INT;
  v_absent := (p_data->>'students_absent')::INT;
  v_assessed := (p_data->>'students_assessed')::INT;
  v_duration := (p_data->>'actual_duration_minutes')::INT;
  v_notes := COALESCE(p_data->>'actual_teaching_notes', '');

  IF p_data->>'taught_at' IS NOT NULL THEN
    v_taught_at := (p_data->>'taught_at')::TIMESTAMPTZ;
  ELSE
    v_taught_at := v_timestamp;
  END IF;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'Total students must be greater than 0' USING ERRCODE = '22000';
  END IF;

  IF v_passed IS NULL OR v_passed < 0 THEN
    RAISE EXCEPTION 'Passed students must be non-negative' USING ERRCODE = '22000';
  END IF;

  IF v_support IS NULL OR v_support < 0 THEN
    RAISE EXCEPTION 'Students needing support must be non-negative' USING ERRCODE = '22000';
  END IF;

  IF (v_passed + v_support) > v_total THEN
    RAISE EXCEPTION 'Sum of passed and needing support (% + %) exceeds total (%)', v_passed, v_support, v_total
      USING ERRCODE = '22000';
  END IF;

  IF v_present IS NOT NULL AND v_absent IS NOT NULL THEN
    IF (v_present + v_absent) <> v_total THEN
      RAISE EXCEPTION 'Sum of present and absent (% + %) does not match total (%)', v_present, v_absent, v_total
        USING ERRCODE = '22000';
    END IF;
  END IF;

  -- 4. Upsert into v3_post_teaching_records
  INSERT INTO public.v3_post_teaching_records (
    lesson_plan_id,
    taught_at,
    actual_duration_minutes,
    students_total,
    students_present,
    students_absent,
    students_assessed,
    students_passed,
    students_need_support,
    actual_teaching_notes,
    session_metadata,
    created_at,
    updated_at
  ) VALUES (
    p_lesson_id,
    v_taught_at,
    v_duration,
    v_total,
    v_present,
    v_absent,
    v_assessed,
    v_passed,
    v_support,
    v_notes,
    COALESCE(p_data->'session_metadata', '{}'::jsonb),
    v_timestamp,
    v_timestamp
  )
  ON CONFLICT (lesson_plan_id) DO UPDATE SET
    taught_at = EXCLUDED.taught_at,
    actual_duration_minutes = EXCLUDED.actual_duration_minutes,
    students_total = EXCLUDED.students_total,
    students_present = EXCLUDED.students_present,
    students_absent = EXCLUDED.students_absent,
    students_assessed = EXCLUDED.students_assessed,
    students_passed = EXCLUDED.students_passed,
    students_need_support = EXCLUDED.students_need_support,
    actual_teaching_notes = EXCLUDED.actual_teaching_notes,
    session_metadata = EXCLUDED.session_metadata,
    updated_at = v_timestamp
  RETURNING id INTO v_record_id;

  -- 5. Transition lesson plan status to TAUGHT
  UPDATE public.v3_lesson_plans
  SET status = 'TAUGHT',
      updated_at = v_timestamp
  WHERE id = p_lesson_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'TAUGHT',
    'record_id', v_record_id,
    'lesson_id', p_lesson_id,
    'taught_at', v_taught_at,
    'updated_at', v_timestamp,
    'message', 'Teaching session recorded successfully and plan moved to TAUGHT'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp;


CREATE OR REPLACE FUNCTION public.record_v3_reflection(
  p_lesson_id UUID,
  p_user_id UUID,
  p_data JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
  v_support INT;
  v_reflection TEXT;
  v_remediation TEXT;
  v_problems TEXT;
  v_adjustments TEXT;
  v_feedback TEXT;
  v_what_worked TEXT;
  v_next_adj TEXT;
  v_timestamp TIMESTAMPTZ := NOW();
  v_record RECORD;
BEGIN
  -- Bind the caller to the requested owner before any privileged table access.
  -- service_role is a server credential; a client cannot choose this database role.
  IF COALESCE(current_setting('role', true), '') <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'RPC_ACTOR_MISMATCH' USING ERRCODE = '42501';
  END IF;
  -- 1. Lock the lesson plan row
  SELECT status INTO v_current_status
  FROM public.v3_lesson_plans
  WHERE id = p_lesson_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lesson plan not found or access denied (id: %)', p_lesson_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. State Guard: Must be in TAUGHT status (or already REFLECTED for update)
  IF v_current_status NOT IN ('TAUGHT', 'REFLECTED') THEN
    RAISE EXCEPTION 'Cannot record reflection for lesson with status % (must be TAUGHT)', v_current_status
      USING ERRCODE = '22000';
  END IF;

  -- 3. Check that post-teaching session record exists
  SELECT id, students_need_support INTO v_record
  FROM public.v3_post_teaching_records
  WHERE lesson_plan_id = p_lesson_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teaching session must be recorded before completing reflection'
      USING ERRCODE = '22000';
  END IF;

  v_support := COALESCE(v_record.students_need_support, 0);

  -- 4. Extract reflection fields
  v_reflection := TRIM(COALESCE(p_data->>'reflection', ''));
  v_remediation := TRIM(COALESCE(p_data->>'remediation_plan', ''));
  v_problems := COALESCE(p_data->>'problems', '');
  v_adjustments := COALESCE(p_data->>'adjustments_made', '');
  v_feedback := COALESCE(p_data->>'feedback_given', '');
  v_what_worked := COALESCE(p_data->>'what_worked', '');
  v_next_adj := COALESCE(p_data->>'next_lesson_adjustment', '');

  -- Validation: reflection is required
  IF v_reflection = '' THEN
    RAISE EXCEPTION 'Teacher reflection text is required before transitioning to REFLECTED'
      USING ERRCODE = '22000';
  END IF;

  -- Critical Remediation Gate: If students_need_support > 0, remediation_plan must not be empty!
  IF v_support > 0 AND v_remediation = '' THEN
    RAISE EXCEPTION 'Remediation plan is strictly required when students need support (% students)', v_support
      USING ERRCODE = '22000';
  END IF;

  -- 5. Update post-teaching record
  UPDATE public.v3_post_teaching_records
  SET reflection = v_reflection,
      remediation_plan = v_remediation,
      problems = v_problems,
      adjustments_made = v_adjustments,
      feedback_given = v_feedback,
      what_worked = v_what_worked,
      next_lesson_adjustment = v_next_adj,
      updated_at = v_timestamp
  WHERE id = v_record.id;

  -- 6. Transition lesson plan status to REFLECTED
  UPDATE public.v3_lesson_plans
  SET status = 'REFLECTED',
      updated_at = v_timestamp
  WHERE id = p_lesson_id AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'REFLECTED',
    'record_id', v_record.id,
    'lesson_id', p_lesson_id,
    'updated_at', v_timestamp,
    'message', 'Reflection recorded successfully and plan moved to REFLECTED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp;


REVOKE EXECUTE ON FUNCTION public.admit_canonical_ai_request(uuid,text,integer,integer,integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admit_canonical_ai_request(uuid,text,integer,integer,integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_ai_job(uuid,integer,integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_ai_job(uuid,integer,integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reorder_unit_lessons(varchar,uuid,text[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reorder_unit_lessons(varchar,uuid,text[]) TO service_role;

REVOKE EXECUTE ON FUNCTION public.finalize_v3_lesson(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.finalize_v3_lesson(uuid,uuid,jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_v3_teaching(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_v3_teaching(uuid,uuid,jsonb) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_v3_reflection(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_v3_reflection(uuid,uuid,jsonb) TO authenticated, service_role;

ALTER FUNCTION public.prevent_final_version_mutation() SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.prevent_final_lesson_mutation() SET search_path = pg_catalog, public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- is_admin is an intentional current-user lookup required by host RLS; keep its authenticated grant.

COMMIT;
