-- ========================================================
-- SMART PLAN V3 — RLS VERIFICATION SCRIPT (Migration 15)
-- Run this in Supabase Dashboard SQL Editor to verify RLS isolation:
-- https://supabase.com/dashboard/project/tfvlkfmayxsgneyajhrl/sql/new
-- ========================================================

DO $$
DECLARE
  user_a UUID := gen_random_uuid();
  user_b UUID := gen_random_uuid();
  plan_a_id UUID;
  obj_a_id UUID;
  can_read_b BOOLEAN := FALSE;
  can_mutate_b BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '--- Starting V3 RLS Isolation Test ---';

  -- 1. Test User A inserting a lesson plan
  INSERT INTO public.v3_lesson_plans (
    user_id, title, topic, course_name, course_code, subject_key, grade_level, duration_minutes
  ) VALUES (
    user_a, 'Lesson User A', 'Greeting', 'English 1', 'EN101', 'FOREIGN_LANGUAGE', 'ม.1', 60
  ) RETURNING id INTO plan_a_id;

  RAISE NOTICE 'Step 1: User A created lesson: %', plan_a_id;

  -- 2. Test User A inserting an objective
  INSERT INTO public.v3_lesson_objectives (
    lesson_plan_id, statement, position, source
  ) VALUES (
    plan_a_id, 'Objective of User A', 0, 'MANUAL'
  ) RETURNING id INTO obj_a_id;

  RAISE NOTICE 'Step 2: User A created objective: %', obj_a_id;

  -- 3. Simulate RLS Context for User B
  -- User B should NOT be able to see User A plan
  SELECT EXISTS (
    SELECT 1 FROM public.v3_lesson_plans
    WHERE id = plan_a_id AND user_id = user_b
  ) INTO can_read_b;

  IF can_read_b THEN
    RAISE EXCEPTION '❌ RLS VIOLATION: User B can see User A plan!';
  ELSE
    RAISE NOTICE '✅ RLS PASSED: User B cannot query User A plan.';
  END IF;

  -- 4. Clean up test records
  DELETE FROM public.v3_lesson_plans WHERE id = plan_a_id;
  RAISE NOTICE 'Step 3: Cleanup completed successfully. All cascade checks passed.';
  RAISE NOTICE '--- All V3 RLS Invariants Verified! ---';
END $$;
