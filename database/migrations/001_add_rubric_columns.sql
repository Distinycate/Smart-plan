-- Migration: 001_add_rubric_columns.sql
-- Description: Adds rubric K, P, A columns safely.

ALTER TABLE "LessonPlans"
ADD COLUMN IF NOT EXISTS "rubricK" TEXT,
ADD COLUMN IF NOT EXISTS "rubricP" TEXT,
ADD COLUMN IF NOT EXISTS "rubricA" TEXT;
