-- PROPOSAL ONLY — DO NOT APPLY UNTIL THE CATALOG AUDIT IS REVIEWED.
--
-- Phase 1 / Wave 2B.1. Canonical LessonPlans invariant:
--   Teacher: own rows only for SELECT / INSERT / UPDATE / DELETE
--   Admin:   SELECT is permitted; no mutation privilege is added
--   Anonymous: denied by the absence of a policy for anon
--
-- This is deliberately fail-closed: an unknown existing policy causes the
-- transaction to abort so a permissive policy cannot silently survive.

BEGIN;

ALTER TABLE public."LessonPlans" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  unexpected_policies TEXT[];
BEGIN
  SELECT ARRAY_AGG(policyname ORDER BY policyname)
  INTO unexpected_policies
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'LessonPlans'
    AND policyname NOT IN (
      -- Migration 01 legacy policy names
      'Users can view own lesson plans',
      'Users can insert own lesson plans',
      'Users can update own lesson plans',
      'Users can delete own lesson plans',
      -- Migration 14 canonical policy names, for idempotent re-application
      'lessonplans_select_owner_or_admin',
      'lessonplans_insert_owner',
      'lessonplans_update_owner',
      'lessonplans_delete_owner'
    );

  IF unexpected_policies IS NOT NULL THEN
    RAISE EXCEPTION
      'Unexpected LessonPlans RLS policies found: %. Review database/verification/14_lessonplans_rls_catalog_audit.sql before applying this migration.',
      unexpected_policies;
  END IF;
END
$$;

-- Remove legacy policies together with prior canonical names. DROP POLICY only
-- changes policy metadata; it does not delete or modify LessonPlans rows.
DROP POLICY IF EXISTS "Users can view own lesson plans" ON public."LessonPlans";
DROP POLICY IF EXISTS "Users can insert own lesson plans" ON public."LessonPlans";
DROP POLICY IF EXISTS "Users can update own lesson plans" ON public."LessonPlans";
DROP POLICY IF EXISTS "Users can delete own lesson plans" ON public."LessonPlans";
DROP POLICY IF EXISTS "lessonplans_select_owner_or_admin" ON public."LessonPlans";
DROP POLICY IF EXISTS "lessonplans_insert_owner" ON public."LessonPlans";
DROP POLICY IF EXISTS "lessonplans_update_owner" ON public."LessonPlans";
DROP POLICY IF EXISTS "lessonplans_delete_owner" ON public."LessonPlans";

-- Explicit role scope makes anonymous denial visible in the policy contract.
CREATE POLICY "lessonplans_select_owner_or_admin"
  ON public."LessonPlans"
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

CREATE POLICY "lessonplans_insert_owner"
  ON public."LessonPlans"
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Admin mutation is intentionally absent. App routes also enforce this rule,
-- giving the system two independent authorization boundaries.
CREATE POLICY "lessonplans_update_owner"
  ON public."LessonPlans"
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "lessonplans_delete_owner"
  ON public."LessonPlans"
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE public."LessonPlans" IS
  'Phase 1 Wave 2B.1 invariant: teachers access only their own plans; admins may read but never mutate another teacher''s plan through RLS.';

COMMIT;
