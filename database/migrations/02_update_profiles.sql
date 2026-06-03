-- Migration: Add extra fields to Profiles table
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS subject_group TEXT,
ADD COLUMN IF NOT EXISTS grade_levels JSONB;

-- 2. Update the trigger function to capture these fields on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    gender, 
    age, 
    subject_group, 
    grade_levels
  )
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'user',
    new.raw_user_meta_data->>'gender',
    NULLIF(new.raw_user_meta_data->>'age', '')::INTEGER,
    new.raw_user_meta_data->>'subject_group',
    (new.raw_user_meta_data->>'grade_levels')::JSONB
  );
  RETURN new;
END;
$$;
