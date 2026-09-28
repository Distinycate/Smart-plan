-- Phase 1 / Wave 1: Identity & Authorization Foundation
-- Additive security hardening. This migration does not delete or rewrite profile,
-- lesson-plan, evaluation, or unit-plan data.
--
-- Run only after taking a Supabase backup and reviewing existing policies/grants.

BEGIN;

-- Keep role lookup server-controlled and avoid recursive RLS checks on profiles.
-- SECURITY DEFINER is intentional: this function only returns a boolean for the
-- authenticated caller and is safe to use inside policies on public.profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Replace the previous public-read and unrestricted self-update policies. Policy
-- changes are intentional: profile email and role must not be publicly readable,
-- and ordinary users must not update privileged/system columns.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own mutable profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own mutable profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS controls rows, not columns. Remove broad UPDATE grants and grant only the
-- teacher-editable profile fields. id, email, role, and created_at stay
-- server-controlled; service_role continues to bypass these application grants.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, gender, age, subject_group, grade_levels)
  ON TABLE public.profiles TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS
  'Phase 1 security helper. Returns whether auth.uid() has server-controlled admin role.';
COMMENT ON COLUMN public.profiles.role IS
  'Server-controlled authorization attribute. Never accept this value from a client request.';

COMMIT;
