-- READ-ONLY PRODUCTION FORENSIC AUDIT — DO NOT CHANGE DATA OR POLICIES
--
-- Run this in the Supabase SQL editor before reviewing or applying Migration 14.
-- It inspects the live catalog only. It must return the exact policy list and
-- table flags needed to identify a permissive cross-owner read path.

BEGIN TRANSACTION READ ONLY;

-- 1. Table-level RLS state. relforcerowsecurity matters for the table owner;
-- service_role still bypasses RLS and is not a substitute for route checks.
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_row_level_security,
  pg_get_userbyid(c.relowner) AS table_owner
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'LessonPlans'
  AND c.relkind IN ('r', 'p');

-- 2. Exact policy definitions, roles and permissive/restrictive semantics.
-- Multiple PERMISSIVE policies for the same command are OR-ed by PostgreSQL.
SELECT
  p.polname AS policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command,
  CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_mode,
  COALESCE(
    ARRAY(
      SELECT r.rolname
      FROM unnest(p.polroles) AS role_oid
      JOIN pg_catalog.pg_roles AS r ON r.oid = role_oid
      ORDER BY r.rolname
    ),
    ARRAY[]::name[]
  ) AS roles,
  pg_get_expr(p.polqual, p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_catalog.pg_policy AS p
JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'LessonPlans'
ORDER BY command, p.polname;

-- 3. Convenience view for reviewing policy definitions. This is supporting
-- evidence, not a replacement for pg_policy because it omits some catalog data.
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'LessonPlans'
ORDER BY cmd, policyname;

-- 4. Table and column grants. Report separately: a GRANT only permits access
-- to reach RLS; it does not itself bypass an enabled RLS policy.
SELECT grantee, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'LessonPlans'
ORDER BY grantee, privilege_type;

SELECT grantee, column_name, privilege_type, is_grantable
FROM information_schema.role_column_grants
WHERE table_schema = 'public'
  AND table_name = 'LessonPlans'
ORDER BY grantee, column_name, privilege_type;

-- 5. Blast-radius catalog snapshot. This does not change policies; compare
-- output against the owner-only source policy pattern in Migration 05.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_row_level_security,
  p.polname AS policy_name,
  CASE p.polcmd
    WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL'
  END AS command,
  CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS policy_mode,
  pg_get_expr(p.polqual, p.polrelid) AS using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_policy AS p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relname IN (
    'LessonPlans', 'UnitPlans', 'UnitLessons', 'UnitAssessments',
    'Rubrics', 'AIHistory', 'VersionHistory', 'lesson_plan_versions',
    'lesson_plan_patches', 'evaluation_jobs', 'patch_jobs'
  )
ORDER BY c.relname, command NULLS FIRST, p.polname;

COMMIT;
