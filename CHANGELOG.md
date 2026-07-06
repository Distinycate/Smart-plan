# Changelog

## [2.0.1-unit-sequence] - 2026-07-06

### Added
- UnitLesson create, read, update, archive and atomic reorder APIs.
- Unit Lesson Sequence UI with hours summary and ordering controls.
- Save Ready support when all unit requirements and lesson hours pass validation.
- VersionHistory before UnitLesson update, archive and sequence reorder.

### Changed
- UnitPlan ready validation now ignores archived lessons and verifies lesson-hour totals.
- Active lesson order uniqueness uses a partial index so archived lessons do not block reuse.

### Migration
- Run `database/migrations/07_unit_lesson_sequence.sql` after migration 05.

### QA
- `npm run build` completed successfully with all UnitLesson routes.
- Database and browser tests remain pending.

### Known Issues
- Unit export and Unit AI alignment are not implemented.

### Rollback
- Disable UnitLesson UI/APIs. Keep archived and active records; do not delete data.

## [1.0.1-concurrency-fix] - 2026-07-06

### Added
- Shared PostgreSQL AI queue with atomic claims, fair ordering and processing leases.
- Authenticated queue ownership checks and queue coverage for Evaluator/AI Fix.
- Optional `AI_CONCURRENCY_LIMIT` configuration.

### Changed
- Queue uses the server-side service client and Gemini retries stay inside Vercel's execution budget.
- Polling stops after repeated errors or a five-minute wait.

### Fixed
- Fixed the queue wrapper sending fetch options instead of the actual AI payload.
- Fixed missing `ai_jobs` migration, non-atomic promotion and jobs not releasing after failures.

### Migration
- Run `database/migrations/06_ai_jobs_concurrency_queue.sql` before deploying.

### QA
- `npm run build` completed successfully.
- Multi-user staging verification is still required.

### Known Issues
- ESLint was not executed because the dependency is not installed.

### Rollback
- Revert queue/client code and leave additive queue tables intact.

## [2.0.0-foundation] - 2026-07-06

### Added
- Additive V2 migration for UnitPlans, UnitLessons, UnitAssessments, Rubrics, AIHistory, VersionHistory and SchemaVersions.
- Unit Planner master-data and UnitPlan APIs with structured responses.
- Unit draft UI and completion checklist.
- V2 architecture, validation, security, QA, setup and user documentation.

### Changed
- Added “แผนเป็นหน่วย” navigation without changing the lesson editor.

### Fixed
- None in the existing lesson workflow.

### Migration
- Migration file created but not executed against any database in this environment.

### QA
- `npm run build` completed successfully, including TypeScript validation and route generation.
- ESLint was not executed because the dependency is not installed.
- Database and manual regression remain pending for the runner AI.

### Known Issues
- UnitLessons UI, Ready status, Unit export and Unit AI are not enabled.
- Production database and manual regression still require verification.

### Rollback
- Remove/disable new routes and navigation. Do not drop additive V2 tables.

## [2024-xx-xx] - 7-Agent System Upgrades
### Added
- **Restore Archived Plan**: Added frontend tab and `PATCH /api/plans/[id]/restore` to recover archived plans.
- **QA Checklist**: Added `QA_CHECKLIST.md` covering 11 testing scenarios.
- **Safe Database Migrations**: Added `database/migrations` structure to prevent destructive changes in production.
- **Security Enhancements**: Added `escapeHtml` to Word Export API (`app/api/plans/[id]/export/word/route.ts`) to prevent XSS vulnerabilities from AI/User input.

### Fixed
- Fixed potential XSS vulnerabilities in the Word document export flow.
- Improved database schema documentation and safety warnings.
