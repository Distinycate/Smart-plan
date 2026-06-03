-- Migration: 002_future_safe_template.sql
-- Description: Template for safe, non-destructive future updates.

-- 1. Example: Adding a safe column with a default value.
-- ALTER TABLE "LessonPlans"
-- ADD COLUMN IF NOT EXISTS "newFeatureEnabled" BOOLEAN DEFAULT false;

-- 2. Example: Creating a new safe index to speed up lookups.
-- CREATE INDEX IF NOT EXISTS idx_lessonplans_planstatus ON "LessonPlans"("planStatus");

-- WARNING: NEVER use DROP TABLE, DROP COLUMN, or TRUNCATE in these files!
