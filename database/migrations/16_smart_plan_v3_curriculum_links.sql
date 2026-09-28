-- SMART PLAN V3 — CURRICULUM LINKS & LESSON ENRICHMENT
-- Migration 16: Additive schema for V3.3 — Lesson Creation Workflow
-- Non-destructive: adds curriculum link table and enriches v3_lesson_plans
-- Preserves all existing rows; new columns are nullable or have defaults.

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- 1. Enrich v3_lesson_plans with Step 1 fields needed by V3.3
-- ─────────────────────────────────────────────────────────────────

-- learning_focus: key from SubjectProfile (e.g. 'SPEAKING', 'CALCULATION')
ALTER TABLE public.v3_lesson_plans
  ADD COLUMN IF NOT EXISTS learning_focus TEXT;

-- teaching_date: optional date the lesson is planned to be taught
ALTER TABLE public.v3_lesson_plans
  ADD COLUMN IF NOT EXISTS teaching_date DATE;

-- student_context: optional free-text description of the learner group
ALTER TABLE public.v3_lesson_plans
  ADD COLUMN IF NOT EXISTS student_context TEXT;

-- notes: optional teacher-side notes (not exported to final document)
ALTER TABLE public.v3_lesson_plans
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─────────────────────────────────────────────────────────────────
-- 2. New table: v3_lesson_curriculum_links
--    Stores the many-to-many relationship between a lesson plan and
--    the specific curriculum indicators selected during Step 1/2.
--    Keeps snapshot labels so plans remain readable if Master Data changes.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.v3_lesson_curriculum_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL
    REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  curriculum_version TEXT NOT NULL DEFAULT 'OBEC-2551-REV60',
  subject_key TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  standard_code TEXT NOT NULL,
  indicator_code TEXT NOT NULL,
  -- Snapshot labels: frozen at time of selection for offline readability
  standard_label_snapshot TEXT NOT NULL DEFAULT '',
  indicator_label_snapshot TEXT NOT NULL DEFAULT '',
  -- Display order within the lesson (primary indicator first)
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent the same indicator being linked twice to the same lesson
  CONSTRAINT v3_curriculum_links_unique
    UNIQUE (lesson_plan_id, curriculum_version, standard_code, indicator_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_v3_curriculum_links_lesson
  ON public.v3_lesson_curriculum_links(lesson_plan_id, position);

CREATE INDEX IF NOT EXISTS idx_v3_curriculum_links_standard
  ON public.v3_lesson_curriculum_links(lesson_plan_id, standard_code);

-- ─────────────────────────────────────────────────────────────────
-- 3. RLS for v3_lesson_curriculum_links
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.v3_lesson_curriculum_links ENABLE ROW LEVEL SECURITY;

-- SELECT: owner or admin
CREATE POLICY "v3_curriculum_links_select"
  ON public.v3_lesson_curriculum_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.v3_lesson_plans lp
      WHERE lp.id = lesson_plan_id
        AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())
    )
  );

-- INSERT/UPDATE/DELETE: owner only
CREATE POLICY "v3_curriculum_links_mutation"
  ON public.v3_lesson_curriculum_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.v3_lesson_plans lp
      WHERE lp.id = lesson_plan_id
        AND (SELECT auth.uid()) = lp.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.v3_lesson_plans lp
      WHERE lp.id = lesson_plan_id
        AND (SELECT auth.uid()) = lp.user_id
    )
  );

COMMIT;
