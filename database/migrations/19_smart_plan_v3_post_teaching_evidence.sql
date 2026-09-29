-- ==============================================================================
-- SMART PLAN V3: MIGRATION 19 — POST-TEACHING & OBSERVED STUDENT EVIDENCE
--
-- Goals:
-- 1. Extend v3_post_teaching_records with rich session context & reflection fields
-- 2. Create v3_observed_student_evidence entity separating observed from planned evidence
-- 3. Enhance prevent_final_lesson_mutation() to keep pre-teaching entities locked in TAUGHT & REFLECTED
-- 4. Atomic RPCs for state transitions:
--    - record_v3_teaching: FINAL -> TAUGHT
--    - record_v3_reflection: TAUGHT -> REFLECTED
-- 5. Storage bucket setup for private student evidence attachments
-- ==============================================================================

-- 1. Extend v3_post_teaching_records with session details
ALTER TABLE public.v3_post_teaching_records
  ADD COLUMN IF NOT EXISTS taught_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS students_present INTEGER,
  ADD COLUMN IF NOT EXISTS students_absent INTEGER,
  ADD COLUMN IF NOT EXISTS students_assessed INTEGER,
  ADD COLUMN IF NOT EXISTS what_worked TEXT,
  ADD COLUMN IF NOT EXISTS next_lesson_adjustment TEXT,
  ADD COLUMN IF NOT EXISTS session_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Entity: v3_observed_student_evidence
CREATE TABLE IF NOT EXISTS public.v3_observed_student_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  post_teaching_record_id UUID NOT NULL REFERENCES public.v3_post_teaching_records(id) ON DELETE CASCADE,
  planned_evidence_id UUID REFERENCES public.v3_learning_evidence(id) ON DELETE SET NULL,
  objective_id UUID REFERENCES public.v3_lesson_objectives(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES public.v3_assessments(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  summary_data JSONB DEFAULT '{}'::jsonb,
  storage_path TEXT,
  mime_type TEXT,
  file_size INTEGER,
  sample_label TEXT,
  outcome_status TEXT NOT NULL DEFAULT 'OBSERVED'
    CHECK (outcome_status IN ('OBSERVED', 'PARTIALLY_OBSERVED', 'NOT_OBSERVED', 'NOT_ASSESSED')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for observed evidence
CREATE INDEX IF NOT EXISTS idx_v3_observed_evidence_lesson
  ON public.v3_observed_student_evidence(lesson_plan_id);

CREATE INDEX IF NOT EXISTS idx_v3_observed_evidence_record
  ON public.v3_observed_student_evidence(post_teaching_record_id);

CREATE INDEX IF NOT EXISTS idx_v3_observed_evidence_planned
  ON public.v3_observed_student_evidence(planned_evidence_id);

-- Updated_at Trigger for v3_observed_student_evidence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_observed_student_evidence_updated_at'
      AND tgrelid = 'public.v3_observed_student_evidence'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_observed_student_evidence_updated_at
      BEFORE UPDATE ON public.v3_observed_student_evidence
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 3. Row Level Security for v3_observed_student_evidence
ALTER TABLE public.v3_observed_student_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v3_observed_evidence_owner_all" ON public.v3_observed_student_evidence;
CREATE POLICY "v3_observed_evidence_owner_all"
ON public.v3_observed_student_evidence
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.v3_lesson_plans lp
    WHERE lp.id = v3_observed_student_evidence.lesson_plan_id
      AND (lp.user_id = (SELECT auth.uid()) OR public.is_admin())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.v3_lesson_plans lp
    WHERE lp.id = v3_observed_student_evidence.lesson_plan_id
      AND lp.user_id = (SELECT auth.uid())
  )
);

-- 4. Critical Lock Hardening: Pre-teaching child entities must stay locked in FINAL, TAUGHT, and REFLECTED
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

    IF v_plan_status IN ('FINAL', 'TAUGHT', 'REFLECTED') THEN
      RAISE EXCEPTION 'Modifications to pre-teaching lesson components are prohibited when plan is locked (plan_id: %, status: %)', v_plan_id, v_plan_status
        USING ERRCODE = '23505';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. Central Atomic Transaction RPC: record_v3_teaching (FINAL -> TAUGHT)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Central Atomic Transaction RPC: record_v3_reflection (TAUGHT -> REFLECTED)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Setup Private Storage Bucket for Student Evidence
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('v3_student_evidence', 'v3_student_evidence', false)
    ON CONFLICT (id) DO UPDATE SET public = false;

    -- Policy for authenticated teachers to upload their own evidence
    -- Storage path convention: {user_id}/{lesson_id}/{filename}
    DROP POLICY IF EXISTS "v3_student_evidence_insert_owner" ON storage.objects;
    CREATE POLICY "v3_student_evidence_insert_owner" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'v3_student_evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

    DROP POLICY IF EXISTS "v3_student_evidence_select_owner_or_admin" ON storage.objects;
    CREATE POLICY "v3_student_evidence_select_owner_or_admin" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'v3_student_evidence' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));

    DROP POLICY IF EXISTS "v3_student_evidence_delete_owner" ON storage.objects;
    CREATE POLICY "v3_student_evidence_delete_owner" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'v3_student_evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
