# Changelog

## [1.0.3-ai-latency-hotfix] - 2026-07-06

### Changed
- Split Phase 1 now runs Core then Activity sequentially so each route has its own Vercel execution window.
- Successful Core output is applied before Activity starts and is preserved if Activity fails.
- Split generation routes use `gemini-2.5-flash-lite`, bounded prompts/outputs and disabled thinking.
- Gemini retries use a 46-second internal deadline and fall back from Flash Lite to Flash after a transient failure.

### Fixed
- Reduced Phase 1 failures caused by two heavy Gemini requests competing concurrently.
- Added a third bounded retry for transient 503/timeout responses.

### QA
- Live API Phase 1 completed in 20.193 seconds (Core 7.649s, Activity 12.543s).
- Live API Phase 2 completed all four parallel routes in 11.536 seconds.
- Phase 2 received transient 503 responses on first attempts and recovered through model fallback.
- Browser Phase 1 completed and populated both Core and Activity fields in about 32 seconds.
- Key-pool and 401/model-fallback mock tests passed.
- `npm run build` passed; ESLint remains unavailable because the dependency is not installed.

### Known Issues
- Vercel environment and production latency are not verified in this local environment.
- Only one distinct Gemini key is currently present locally; configure multiple active keys in Vercel for higher concurrent-user resilience.
- Full lesson save/export regression was not executed in this hotfix.

### Rollback
- Revert the split-route fast runtime, Gemini retry changes and sequential Phase 1 UI call only; no database rollback is required.

## [1.0.2-gemini-key-fallback] - 2026-07-06

### Fixed
- Route-specific Gemini key now has priority over the shared fallback pool.
- A 401/403 from one key rotates to the next configured key instead of failing immediately.
- Placeholder/duplicate keys are removed from the runtime pool.
- Default AI concurrency is one unless explicitly configured, so expired keys do not inflate capacity.

### QA
- Gemini key-pool tests passed.
- Mock fallback test passed: first key returned 401 and the second key returned 200.
- Live local-environment probe passed: four distinct configured key slots returned HTTP 200.
- `npm run build` passed.

### Known Issues
- Deployment environment still requires verification and redeploy after push.

### Rollback
- Revert `geminiKeyPool.ts` and the related Gemini client/queue changes only.

## [2.1.0-unit-export-alignment] - 2026-07-06

### Added
- Unit Plan Library with search and status filters.
- Unit Plan A4 preview, browser PDF flow and Word `.doc` export.
- Database-grounded Alignment Check for UnitPlan and LessonPlan scopes.
- Structured alignment validation and preview-only Unit Planner result UI.
- AIHistory and System_Logs records for alignment checks.

### Changed
- Main Unit navigation now opens the Unit Plan Library.
- Draft Unit exports show a visible draft watermark.

### Migration
- No new table migration beyond 05–07; Alignment uses `AIHistory` from migration 05.

### QA
- `npm run build` completed successfully with library, export and alignment routes.
- Visual Word/PDF, AI response and staging database tests remain pending.

### Known Issues
- Alignment suggestions cannot be applied automatically by design.
- Native `.docx` generation is not implemented; Word export follows the existing HTML `.doc` strategy.

### Rollback
- Disable Unit export/alignment routes and UI. Existing UnitPlan and AIHistory data remains intact.

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
