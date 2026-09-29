-- SMART PLAN V3 — ASSESSMENT ACTIVITY LINKS
-- Migration 17: Additive schema for V3.5 — Assessment Engine
-- Non-destructive: creates junction table linking assessments to lesson activities
-- Preserves all existing tables and legacy features.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- 1. Create junction table: v3_assessment_activity_links
--    Connects an assessment to the specific activity where it takes place.
--    Allows 1 assessment to be linked to 1 or more activities (or vice versa).
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.v3_assessment_activity_links (
  assessment_id UUID NOT NULL
    REFERENCES public.v3_assessments(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL
    REFERENCES public.v3_lesson_activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, activity_id)
);

-- Indexes for efficient bidirectional joins
CREATE INDEX IF NOT EXISTS idx_v3_asm_act_links_assessment
  ON public.v3_assessment_activity_links(assessment_id);

CREATE INDEX IF NOT EXISTS idx_v3_asm_act_links_activity
  ON public.v3_assessment_activity_links(activity_id);

-- ─────────────────────────────────────────────────────────────────
-- 2. RLS for v3_assessment_activity_links
--    Derives ownership from lesson_plan_id via v3_assessments
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.v3_assessment_activity_links ENABLE ROW LEVEL SECURITY;

-- SELECT: owner or admin
DROP POLICY IF EXISTS "v3_asm_act_links_select" ON public.v3_assessment_activity_links;
CREATE POLICY "v3_asm_act_links_select"
  ON public.v3_assessment_activity_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.v3_assessments a
      JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id
      WHERE a.id = assessment_id
        AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())
    )
  );

-- INSERT/UPDATE/DELETE: owner only
DROP POLICY IF EXISTS "v3_asm_act_links_mutation" ON public.v3_assessment_activity_links;
CREATE POLICY "v3_asm_act_links_mutation"
  ON public.v3_assessment_activity_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.v3_assessments a
      JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id
      WHERE a.id = assessment_id
        AND (SELECT auth.uid()) = lp.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.v3_assessments a
      JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id
      WHERE a.id = assessment_id
        AND (SELECT auth.uid()) = lp.user_id
    )
  );

COMMIT;
