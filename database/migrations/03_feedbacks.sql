-- Migration: Create Feedbacks Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policies for feedbacks
-- Users can only see their own feedbacks, OR admins can see all
CREATE POLICY "Users can view own feedbacks"
ON public.feedbacks FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Users can insert own feedbacks"
ON public.feedbacks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update feedbacks"
ON public.feedbacks FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Admins can delete feedbacks"
ON public.feedbacks FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
