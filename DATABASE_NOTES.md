# Database Architecture & Migration Notes

## 1. Supabase Connection
This project connects to a Supabase PostgreSQL database. 
- Schema: `LessonPlan AutoFill System`
- The `database/schema.sql` contains the complete schema definition.

## 2. Safe Migrations
**WARNING:** Never run `schema.sql` against the production database as it contains `DROP TABLE` statements that will delete all existing user data.
- All future database modifications must be handled via safe, non-destructive migration scripts in `database/migrations/`.
- Use `ADD COLUMN IF NOT EXISTS`.
- Never `DROP COLUMN` unless explicitly approved by the Database Agent and Project Manager.

## 3. Data Relationships
- `Subjects` -> `Units` -> `LessonTopics`
- `LessonPlans` references `Subjects`, `Units`, and `LessonTopics` but also stores denormalized text (e.g. `subjectName`, `unitName`) for snapshot purposes. This is intentional so that modifying a subject name later does not alter historical lesson plans.

## 4. Backup & Archiving
- When a user "Archives" a plan, it is NOT deleted. `planStatus` is set to `archived`, and a full JSON snapshot of the plan is saved to `LessonPlan_Backup`.
- The new `Restore` feature changes `planStatus` back to `draft` and creates another backup record indicating the restore action.

## 5. V2 Unit Planning Foundation

- Migration: `database/migrations/05_unit_planning_v2_foundation.sql`
- Adds seven new tables without changing or backfilling `LessonPlans`.
- UnitPlan updates require a successful `VersionHistory` insert first.
- Migration execution is intentionally deferred to a staging/manual runner.
- Rollback means disabling Unit Planner routes and leaving additive tables intact; do not drop tables as an application rollback.

## 6. Shared AI Queue

- Migration: `database/migrations/06_ai_jobs_concurrency_queue.sql`
- `ai_jobs` is shared across Vercel instances; it must not be replaced with process memory.
- `claim_ai_job()` uses a transaction advisory lock so queue promotion is atomic.
- Queue records are server-only through the service-role client and are ownership-checked against the authenticated user.
- Processing leases prevent abandoned jobs from blocking later users.

## 7. Lesson Plan Quality Platform Phase 2

- Migration: `database/migrations/09_lesson_plan_quality_platform.sql`
- Adds six lowercase Quality Platform tables without modifying legacy evaluation tables.
- Uses existing `LessonPlans.planId VARCHAR(255)` instead of incompatible UUID conversion.
- Enables RLS; authenticated users receive read-only ownership policies.
- All mutations and shared cache access are reserved for authenticated server-side APIs
  using the service role.
- Migration execution is deferred to a staging/manual runner and must be tested twice.
