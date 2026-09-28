-- SMART PLAN V3 — DOMAIN MODEL & DATABASE FOUNDATION
-- Migration 15: Additive schema for V3 Lesson Plan Architecture
-- Non-destructive: Isolates all V3 entities under the 'v3_' namespace prefix.
-- Preserves legacy LessonPlans, UnitPlans, and evaluation platforms intact.

BEGIN;

-- Helper Trigger Function for V3 updated_at
CREATE OR REPLACE FUNCTION public.set_v3_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 1. Root Entity: v3_lesson_plans
CREATE TABLE IF NOT EXISTS public.v3_lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  curriculum_version TEXT NOT NULL DEFAULT 'OBEC-2551-REV60',
  unit_reference TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN (
      'DRAFT',
      'BLUEPRINT_READY',
      'PACKAGE_READY',
      'REVIEWED',
      'FINAL',
      'TAUGHT',
      'REFLECTED'
    )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for v3_lesson_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_lesson_plans_updated_at'
      AND tgrelid = 'public.v3_lesson_plans'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_lesson_plans_updated_at
      BEFORE UPDATE ON public.v3_lesson_plans
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 2. Entity: v3_lesson_objectives
CREATE TABLE IF NOT EXISTS public.v3_lesson_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  statement TEXT NOT NULL,
  objective_type TEXT,
  observable_behavior TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_lesson_objectives_updated_at'
      AND tgrelid = 'public.v3_lesson_objectives'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_lesson_objectives_updated_at
      BEFORE UPDATE ON public.v3_lesson_objectives
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 3. Entity: v3_learning_evidence
CREATE TABLE IF NOT EXISTS public.v3_learning_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  evidence_type TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_learning_evidence_updated_at'
      AND tgrelid = 'public.v3_learning_evidence'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_learning_evidence_updated_at
      BEFORE UPDATE ON public.v3_learning_evidence
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 4. Junction: v3_objective_evidence_links (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.v3_objective_evidence_links (
  objective_id UUID NOT NULL REFERENCES public.v3_lesson_objectives(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.v3_learning_evidence(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (objective_id, evidence_id)
);

-- 5. Entity: v3_lesson_activities
CREATE TABLE IF NOT EXISTS public.v3_lesson_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  phase TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  title TEXT,
  teacher_actions TEXT NOT NULL DEFAULT '',
  student_actions TEXT NOT NULL DEFAULT '',
  assessment_moment TEXT,
  feedback_moment TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_lesson_activities_updated_at'
      AND tgrelid = 'public.v3_lesson_activities'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_lesson_activities_updated_at
      BEFORE UPDATE ON public.v3_lesson_activities
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 6. Junction: v3_activity_objective_links
CREATE TABLE IF NOT EXISTS public.v3_activity_objective_links (
  activity_id UUID NOT NULL REFERENCES public.v3_lesson_activities(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.v3_lesson_objectives(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, objective_id)
);

-- 7. Junction: v3_activity_evidence_links
CREATE TABLE IF NOT EXISTS public.v3_activity_evidence_links (
  activity_id UUID NOT NULL REFERENCES public.v3_lesson_activities(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.v3_learning_evidence(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (activity_id, evidence_id)
);

-- 8. Entity: v3_assessments
CREATE TABLE IF NOT EXISTS public.v3_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  name TEXT NOT NULL,
  assessment_type TEXT NOT NULL,
  method TEXT NOT NULL,
  criteria_type TEXT NOT NULL,
  criteria_value NUMERIC(7,2),
  criteria_text TEXT,
  formative BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_assessments_updated_at'
      AND tgrelid = 'public.v3_assessments'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_assessments_updated_at
      BEFORE UPDATE ON public.v3_assessments
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 9. Junction: v3_assessment_evidence_links
CREATE TABLE IF NOT EXISTS public.v3_assessment_evidence_links (
  assessment_id UUID NOT NULL REFERENCES public.v3_assessments(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.v3_learning_evidence(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (assessment_id, evidence_id)
);

-- 10. Entity: v3_assessment_tools
CREATE TABLE IF NOT EXISTS public.v3_assessment_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.v3_assessments(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_assessment_tools_updated_at'
      AND tgrelid = 'public.v3_assessment_tools'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_assessment_tools_updated_at
      BEFORE UPDATE ON public.v3_assessment_tools
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 11. Entity: v3_teaching_assets
CREATE TABLE IF NOT EXISTS public.v3_teaching_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  asset_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  audience TEXT NOT NULL DEFAULT 'STUDENT' CHECK (audience IN ('TEACHER', 'STUDENT', 'BOTH')),
  generation_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (generation_status IN ('DRAFT', 'READY', 'FAILED')),
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'AI')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_teaching_assets_updated_at'
      AND tgrelid = 'public.v3_teaching_assets'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_teaching_assets_updated_at
      BEFORE UPDATE ON public.v3_teaching_assets
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- 12. Asset Junction Tables
CREATE TABLE IF NOT EXISTS public.v3_asset_objective_links (
  asset_id UUID NOT NULL REFERENCES public.v3_teaching_assets(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.v3_lesson_objectives(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, objective_id)
);

CREATE TABLE IF NOT EXISTS public.v3_asset_activity_links (
  asset_id UUID NOT NULL REFERENCES public.v3_teaching_assets(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.v3_lesson_activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, activity_id)
);

CREATE TABLE IF NOT EXISTS public.v3_asset_evidence_links (
  asset_id UUID NOT NULL REFERENCES public.v3_teaching_assets(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.v3_learning_evidence(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, evidence_id)
);

-- 13. Entity: v3_plan_reviews
CREATE TABLE IF NOT EXISTS public.v3_plan_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('RULE', 'AI', 'PA_READINESS')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PASSED', 'WARNING', 'FAILED')),
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Entity: v3_plan_versions
CREATE TABLE IF NOT EXISTS public.v3_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  label TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v3_plan_versions_unique_number UNIQUE (lesson_plan_id, version_number)
);

-- 15. Entity: v3_post_teaching_records
CREATE TABLE IF NOT EXISTS public.v3_post_teaching_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID NOT NULL UNIQUE REFERENCES public.v3_lesson_plans(id) ON DELETE CASCADE,
  students_total INTEGER,
  students_passed INTEGER,
  students_need_support INTEGER,
  actual_teaching_notes TEXT,
  problems TEXT,
  adjustments_made TEXT,
  feedback_given TEXT,
  remediation_plan TEXT,
  reflection TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_v3_post_teaching_records_updated_at'
      AND tgrelid = 'public.v3_post_teaching_records'::regclass
  ) THEN
    CREATE TRIGGER trg_v3_post_teaching_records_updated_at
      BEFORE UPDATE ON public.v3_post_teaching_records
      FOR EACH ROW
      EXECUTE FUNCTION public.set_v3_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------
-- INDEXES
-- ----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_v3_lesson_plans_user ON public.v3_lesson_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_v3_lesson_plans_status ON public.v3_lesson_plans(status);
CREATE INDEX IF NOT EXISTS idx_v3_objectives_plan ON public.v3_lesson_objectives(lesson_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_v3_evidence_plan ON public.v3_learning_evidence(lesson_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_v3_activities_plan ON public.v3_lesson_activities(lesson_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_v3_assessments_plan ON public.v3_assessments(lesson_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_v3_tools_assessment ON public.v3_assessment_tools(assessment_id);
CREATE INDEX IF NOT EXISTS idx_v3_assets_plan ON public.v3_teaching_assets(lesson_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_v3_reviews_plan ON public.v3_plan_reviews(lesson_plan_id);
CREATE INDEX IF NOT EXISTS idx_v3_versions_plan ON public.v3_plan_versions(lesson_plan_id, version_number);

-- ----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------

-- Enable RLS on all V3 tables
ALTER TABLE public.v3_lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_lesson_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_learning_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_objective_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_lesson_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_activity_objective_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_activity_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_assessment_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_assessment_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_teaching_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_asset_objective_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_asset_activity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_asset_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_plan_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_post_teaching_records ENABLE ROW LEVEL SECURITY;

-- 1. v3_lesson_plans policies
CREATE POLICY "v3_lesson_plans_select"
  ON public.v3_lesson_plans
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

CREATE POLICY "v3_lesson_plans_insert"
  ON public.v3_lesson_plans
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "v3_lesson_plans_update"
  ON public.v3_lesson_plans
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "v3_lesson_plans_delete"
  ON public.v3_lesson_plans
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- 2. Child tables with direct lesson_plan_id
-- (objectives, evidence, activities, assessments, assets, reviews, versions, post_teaching)

-- Macro helper via individual explicit policies
-- Objectives
CREATE POLICY "v3_objectives_select" ON public.v3_lesson_objectives FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_objectives_mutation" ON public.v3_lesson_objectives FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id));

-- Evidence
CREATE POLICY "v3_evidence_select" ON public.v3_learning_evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_evidence_mutation" ON public.v3_learning_evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id));

-- Activities
CREATE POLICY "v3_activities_select" ON public.v3_lesson_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_activities_mutation" ON public.v3_lesson_activities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id));

-- Assessments
CREATE POLICY "v3_assessments_select" ON public.v3_assessments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_assessments_mutation" ON public.v3_assessments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id));

-- Assessment Tools
CREATE POLICY "v3_assessment_tools_select" ON public.v3_assessment_tools FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_assessments a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = assessment_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_assessment_tools_mutation" ON public.v3_assessment_tools FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_assessments a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = assessment_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_assessments a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = assessment_id AND (SELECT auth.uid()) = lp.user_id));

-- Teaching Assets
CREATE POLICY "v3_teaching_assets_select" ON public.v3_teaching_assets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_teaching_assets_mutation" ON public.v3_teaching_assets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND (SELECT auth.uid()) = lp.user_id));

-- Junction Links: Objective ↔ Evidence
CREATE POLICY "v3_obj_evd_links_select" ON public.v3_objective_evidence_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_objectives o JOIN public.v3_lesson_plans lp ON lp.id = o.lesson_plan_id WHERE o.id = objective_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_obj_evd_links_mutation" ON public.v3_objective_evidence_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_objectives o JOIN public.v3_lesson_plans lp ON lp.id = o.lesson_plan_id WHERE o.id = objective_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_objectives o JOIN public.v3_lesson_plans lp ON lp.id = o.lesson_plan_id WHERE o.id = objective_id AND (SELECT auth.uid()) = lp.user_id));

-- Junction Links: Activity ↔ Objective
CREATE POLICY "v3_act_obj_links_select" ON public.v3_activity_objective_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_activities a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = activity_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_act_obj_links_mutation" ON public.v3_activity_objective_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_activities a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = activity_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_activities a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = activity_id AND (SELECT auth.uid()) = lp.user_id));

-- Junction Links: Activity ↔ Evidence
CREATE POLICY "v3_act_evd_links_select" ON public.v3_activity_evidence_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_activities a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = activity_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_act_evd_links_mutation" ON public.v3_activity_evidence_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_activities a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = activity_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_lesson_activities a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = activity_id AND (SELECT auth.uid()) = lp.user_id));

-- Junction Links: Assessment ↔ Evidence
CREATE POLICY "v3_asm_evd_links_select" ON public.v3_assessment_evidence_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_assessments a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = assessment_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_asm_evd_links_mutation" ON public.v3_assessment_evidence_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_assessments a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = assessment_id AND (SELECT auth.uid()) = lp.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.v3_assessments a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = assessment_id AND (SELECT auth.uid()) = lp.user_id));

-- Asset Links
CREATE POLICY "v3_asset_obj_links_all" ON public.v3_asset_objective_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_teaching_assets a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = asset_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_asset_act_links_all" ON public.v3_asset_activity_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_teaching_assets a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = asset_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));
CREATE POLICY "v3_asset_evd_links_all" ON public.v3_asset_evidence_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_teaching_assets a JOIN public.v3_lesson_plans lp ON lp.id = a.lesson_plan_id WHERE a.id = asset_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));

-- Reviews, Versions, Post Teaching
CREATE POLICY "v3_reviews_all" ON public.v3_plan_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));

CREATE POLICY "v3_versions_all" ON public.v3_plan_versions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));

CREATE POLICY "v3_post_teaching_all" ON public.v3_post_teaching_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.v3_lesson_plans lp WHERE lp.id = lesson_plan_id AND ((SELECT auth.uid()) = lp.user_id OR public.is_admin())));

COMMIT;
