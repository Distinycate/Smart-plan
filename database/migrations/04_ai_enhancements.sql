-- Migration: AI Enhancements and Hybrid Scoring
-- Run this in your Supabase SQL Editor

-- 1. AI Error Logs Table
CREATE TABLE IF NOT EXISTS public.ai_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(255),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  resolution_hint TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert ai error logs"
ON public.ai_error_logs FOR INSERT
WITH CHECK (true); -- Allow all authenticated users (or system) to log errors

CREATE POLICY "Users can view own ai error logs"
ON public.ai_error_logs FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 2. AI Feedback Table
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(255) REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER,
  strengths TEXT,
  improvements TEXT,
  errors_found TEXT,
  suggestions TEXT,
  raw_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own ai feedback"
ON public.ai_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ai feedback"
ON public.ai_feedback FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 3. AI Best Practices Table
CREATE TABLE IF NOT EXISTS public.ai_best_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  solution_pattern TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_best_practices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view ai best practices"
ON public.ai_best_practices FOR SELECT
USING (true);

CREATE POLICY "Admins can manage ai best practices"
ON public.ai_best_practices FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 4. AI Training Examples Table
CREATE TABLE IF NOT EXISTS public.ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject_code VARCHAR(255),
  grade_level VARCHAR(255),
  example_content JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_training_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active ai training examples"
ON public.ai_training_examples FOR SELECT
USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can manage ai training examples"
ON public.ai_training_examples FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 5. Lesson Quality Scores Table
CREATE TABLE IF NOT EXISTS public.lesson_quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(255) REFERENCES public."LessonPlans"("planId") ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  structure_score INTEGER DEFAULT 0,
  indicators_score INTEGER DEFAULT 0,
  objectives_score INTEGER DEFAULT 0,
  activities_score INTEGER DEFAULT 0,
  assessment_score INTEGER DEFAULT 0,
  rubric_score INTEGER DEFAULT 0,
  alignment_score INTEGER DEFAULT 0,
  language_score INTEGER DEFAULT 0,
  ai_review_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.lesson_quality_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own lesson quality scores"
ON public.lesson_quality_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own lesson quality scores"
ON public.lesson_quality_scores FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
