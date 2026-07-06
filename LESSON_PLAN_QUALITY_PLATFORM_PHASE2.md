# Lesson Plan Quality Platform — Phase 2 Database Migration

Migration:

`database/migrations/09_lesson_plan_quality_platform.sql`

## Tables

- `evaluation_jobs`: job status, mode, canonical plan hash and progress
- `evaluation_results`: section-level score, evidence, findings and retry state
- `lesson_plan_issues`: prioritized critical/high/medium/low issues
- `lesson_plan_versions`: immutable canonical plan snapshots and parent version
- `lesson_plan_patches`: patch audit trail without rewriting the whole plan
- `evaluation_cache`: shared result cache keyed by hash and evaluation mode

## Compatibility

The master specification uses UUID for `lesson_plan_id`, but the production system uses
`LessonPlans.planId VARCHAR(255)` with values such as `PLAN-XXXX`. The migration therefore
uses `VARCHAR(255)` and a foreign key to the existing column. No existing ID is converted
or backfilled.

Legacy `ai_evaluation_jobs` and `ai_evaluation_results` from migration 08 are preserved.
The new `evaluation_*` tables are a separate Quality Platform boundary.

## Run on Staging

1. Back up the Supabase project.
2. Confirm `public."LessonPlans"` exists and contains `planId` plus `user_id`.
3. Confirm migration 01 authentication/ownership changes are already applied.
4. Open Supabase SQL Editor for staging.
5. Run `09_lesson_plan_quality_platform.sql`.
6. Run the same file a second time to verify idempotency.
7. Check all six tables, constraints, indexes, trigger, RLS and `SchemaVersions`.
8. Run Phase 2 QA before applying the same migration to production.

Do not run `database/schema.sql`.

## RLS

Authenticated users can read only records connected to their own job or LessonPlan.
Direct client insert/update policies are intentionally absent. Future APIs must perform
writes server-side with the service role after authenticating and checking ownership.
`evaluation_cache` is service-role only because cached output can be shared by content hash.

## Rollback

Application rollback should disable new Quality Platform code while preserving the additive
tables. Do not drop the tables after they contain jobs, versions, issues, patches or cache.

## Not Executed Here

The migration was not run against staging or production in this environment. Static
non-destructive and contract checks passed; live Supabase verification remains required.

Deployment update: the user reported that the Phase 2 SQL was run successfully on
2026-07-06. This is recorded as user-reported evidence and was not independently queried
or rerun by this implementation environment.
