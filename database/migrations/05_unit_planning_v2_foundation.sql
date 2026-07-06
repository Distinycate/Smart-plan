-- V2 Unit Planning Foundation
-- Additive and idempotent. Do not backfill or modify existing LessonPlans.

CREATE TABLE IF NOT EXISTS public."UnitPlans" (
  "unitPlanId" VARCHAR(255) PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "unitPlanStatus" VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK ("unitPlanStatus" IN ('draft', 'ready', 'archived')),
  "academicYear" VARCHAR(50) NOT NULL,
  "semester" VARCHAR(50) NOT NULL,
  "gradeLevel" VARCHAR(255) NOT NULL,
  "subjectId" VARCHAR(255),
  "subjectName" VARCHAR(255),
  "unitId" VARCHAR(255),
  "unitName" VARCHAR(255) NOT NULL,
  "unitNumber" INTEGER,
  "teacherName" VARCHAR(255),
  "schoolName" VARCHAR(255),
  "totalUnitHours" NUMERIC(8,2) DEFAULT 0,
  "indicatorIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "unitLearningOutcomes" TEXT,
  "unitAssessmentOverview" TEXT,
  "learningMedia" TEXT,
  "learningSources" TEXT,
  "tasks" TEXT,
  "reflection" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."UnitLessons" (
  "unitLessonId" VARCHAR(255) PRIMARY KEY,
  "unitPlanId" VARCHAR(255) REFERENCES public."UnitPlans"("unitPlanId") ON DELETE CASCADE NOT NULL,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "lessonPlanId" VARCHAR(255),
  "lessonOrder" INTEGER NOT NULL,
  "lessonTitle" VARCHAR(255) NOT NULL,
  "lessonTopic" VARCHAR(255),
  "estimatedHours" NUMERIC(8,2) NOT NULL DEFAULT 1,
  "learningFocus" TEXT,
  "lessonStatus" VARCHAR(50) NOT NULL DEFAULT 'draft',
  "teacherEdited" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."UnitAssessments" (
  "unitAssessmentId" VARCHAR(255) PRIMARY KEY,
  "unitPlanId" VARCHAR(255) REFERENCES public."UnitPlans"("unitPlanId") ON DELETE CASCADE NOT NULL,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "assessmentType" VARCHAR(100),
  "assessmentName" VARCHAR(255) NOT NULL,
  "method" TEXT,
  "tool" TEXT,
  "criteria" TEXT,
  "indicatorIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."Rubrics" (
  "rubricId" VARCHAR(255) PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "ownerScope" VARCHAR(50) NOT NULL,
  "ownerId" VARCHAR(255),
  "rubricName" VARCHAR(255) NOT NULL,
  "criteriaJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "teacherEdited" BOOLEAN NOT NULL DEFAULT FALSE,
  "isArchived" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."AIHistory" (
  "aiHistoryId" VARCHAR(255) PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "scope" VARCHAR(50) NOT NULL,
  "scopeId" VARCHAR(255),
  "actionType" VARCHAR(100) NOT NULL,
  "promptVersion" VARCHAR(100),
  "modelName" VARCHAR(255),
  "inputSummaryJson" JSONB,
  "outputJson" JSONB,
  "warningsJson" JSONB,
  "reviewStatus" VARCHAR(50) NOT NULL DEFAULT 'pending',
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."VersionHistory" (
  "versionHistoryId" VARCHAR(255) PRIMARY KEY,
  "user_id" UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  "entityType" VARCHAR(100) NOT NULL,
  "entityId" VARCHAR(255) NOT NULL,
  "actionType" VARCHAR(100) NOT NULL,
  "changeReason" TEXT,
  "snapshotJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."SchemaVersions" (
  "schemaVersionId" VARCHAR(255) PRIMARY KEY,
  "version" VARCHAR(100) UNIQUE NOT NULL,
  "description" TEXT,
  "checksum" VARCHAR(255),
  "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "appliedBy" VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_unit_plans_user_updated
  ON public."UnitPlans" ("user_id", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_unit_lessons_plan_order
  ON public."UnitLessons" ("unitPlanId", "lessonOrder");
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_lessons_active_order_unique
  ON public."UnitLessons" ("unitPlanId", "lessonOrder")
  WHERE "lessonStatus" <> 'archived';
CREATE INDEX IF NOT EXISTS idx_unit_assessments_plan
  ON public."UnitAssessments" ("unitPlanId");
CREATE INDEX IF NOT EXISTS idx_version_history_entity
  ON public."VersionHistory" ("entityType", "entityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_ai_history_scope
  ON public."AIHistory" ("scope", "scopeId", "createdAt" DESC);

ALTER TABLE public."UnitPlans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UnitLessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UnitAssessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Rubrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AIHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VersionHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SchemaVersions" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'UnitPlans', 'UnitLessons', 'UnitAssessments', 'Rubrics', 'AIHistory', 'VersionHistory'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = 'Users read own records'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Users read own records" ON public.%I FOR SELECT USING (auth.uid() = user_id)',
        table_name
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = 'Users create own records'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Users create own records" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)',
        table_name
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND policyname = 'Users update own records'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "Users update own records" ON public.%I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        table_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'SchemaVersions'
      AND policyname = 'Authenticated users can read schema versions'
  ) THEN
    CREATE POLICY "Authenticated users can read schema versions"
      ON public."SchemaVersions" FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO public."SchemaVersions"
  ("schemaVersionId", "version", "description", "checksum", "appliedBy")
VALUES
  ('SCHEMA-V2-FOUNDATION-001', '2.0.0-foundation',
   'Add UnitPlans, UnitLessons, UnitAssessments, Rubrics, AIHistory, VersionHistory and SchemaVersions',
   '05_unit_planning_v2_foundation.sql', 'manual-migration')
ON CONFLICT ("version") DO NOTHING;
