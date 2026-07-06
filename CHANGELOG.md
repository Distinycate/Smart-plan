# Changelog

## [2.5.2-phase2-and-result-ui-regression] - 2026-07-07

### Added
- Required-field enforcement and non-empty normalization for A assessment and post-teaching reflection.
- Runtime guards for cached/current evaluation issue and evidence shapes.
- Phase 2 and evaluation UI regression contract test.

### Fixed
- Fixed missing post-teaching `resultA`, `problems` and `solutions`.
- Fixed successful evaluation opening a white Application Error screen because
  prioritized issues were an object while the dashboard called array `.filter()`.
- Fixed missing evidence arrays crashing an expanded section card.

### Migration
- None.

### QA
- Live A + reflection synthetic API test passed in approximately 5s; all ten
  expected fields were non-empty.
- Read-only production-data shape check confirmed completed jobs store
  `issues.ordered[]`, matching the diagnosed client exception.
- Regression contract test and production build passed.

### Known Issues
- Authenticated end-to-end UI click-through requires a deployed/test login session.

### Rollback
- Revert the four runtime files and regression test; no database rollback is required.

## [2.5.1-ai-workflow-reliability] - 2026-07-07

### Added
- Two-worker bounded section processing for evaluation and retry/recheck flows.
- AI workflow latency contract tests.
- Auth/RLS protection for the temporary normalize diagnostic route.

### Changed
- Core and Activity generation now run concurrently and preserve partial success.
- Full-plan improvement uses Flash Lite, compact feedback, disabled thinking and a bounded deadline.
- Evaluation/patch transports no longer stack a global single-flight queue with exponential retries.
- Evaluation create uses the same authenticated RLS access as plan detail, allowing Admin to evaluate visible teacher plans.
- Evaluation failure/retry persistence is compatible with the original migration 09 schema.

### Fixed
- Fixed Admin seeing a teacher plan but receiving “not found” when starting evaluation.
- Fixed evaluation failures silently continuing while writing unsupported `failed_rate_limited`,
  `error_type` and `last_retry_at` fields.
- Fixed completed result cards losing their `jobId`, which prevented reliable retry/patch follow-up.

### Migration
- None required for these fixes.

### QA
- Core + Activity live synthetic run reduced from about 18.1s sequential to about 10s concurrent.
- Full-plan improvement live synthetic run reduced from about 23.9s to about 7.8s.
- Evaluation health returned HTTP 200; required tables, Gemini key, rubrics and modes were available.
- Production build, latency contracts, async API contracts and migration static test passed.

### Known Issues
- Authenticated end-to-end browser evaluation could not be run without a test account/session.
- Vercel production timing and two-user concurrency still require post-deploy verification.

### Rollback
- Revert this entry's runtime/UI files; no database rollback is needed.

## [2.5.0-async-quality-evaluation] - 2026-07-06

### Added
- Authenticated async create, single-section process, status, result and retry APIs.
- Ownership checks, hash-staleness guard, cache-backed completed jobs and per-section failures.
- Evaluator integration that processes one section per request to avoid a single 60-second request.
- AI-to-AI deployment and verification handoff.

### Changed
- System-plan evaluation now uses the Quality Platform pipeline.
- Uploaded DOCX evaluation retains the legacy endpoint until a persisted import flow exists.
- Experimental quality-platform create route is a compatibility alias to the canonical API.

### Migration
- None. Uses migration 09, which the user reports was run successfully.

### QA
- Production build and TypeScript route generation passed.
- Async API static contract test passed.
- Authenticated staging, concurrent worker and production Vercel tests require manual verification.

### Known Issues
- ESLint is not installed.
- Uploaded DOCX does not use the new job pipeline.

### Rollback
- Revert evaluator integration and remove Phase 5 routes/job helpers; do not drop additive tables.

## [2.4.0-unified-evaluation-engine] - 2026-07-06

### Added
- Unified section registry for all three evaluation modes.
- Section-scoped prompt builder and strict JSON output schema.
- Gemini section evaluator with temperature 0, topP 0.1 and anchor validation.
- Deterministic score aggregator, consistency checker and issue prioritizer.
- One repair/retry within a shared 45-second section deadline.

### Changed
- Existing evaluation APIs remain untouched; Phase 4 is an additive engine.

### Migration
- None.

### QA
- Section/rubric registry, prompt isolation, JSON repair, anchor rejection,
  consistency retry, aggregation and issue priority tests passed.
- Production build and TypeScript validation passed.
- Live synthetic Gemini section evaluation passed in 9.887s with valid anchor/evidence output.

### Known Issues
- Phase 5 async job APIs are not implemented in this phase.
- Production authenticated job integration remains for Phase 5.

### Rollback
- Remove new evaluation engine modules/exports without changing legacy evaluator behavior.

## [2.3.0-quality-platform-validator] - 2026-07-06

### Added
- Rule-based pre, alignment, GPAS and assessment validators.
- Authenticated `POST /api/lesson-plans/validate`.
- Canonical/legacy plan detection before validation.
- Critical readiness status `lesson_plan_not_ready`.

### Changed
- No existing evaluator API or UI flow was replaced in Phase 3.

### Migration
- No new migration. User reported Phase 2 SQL completed successfully.

### QA
- Complete, critical-missing, mode-specific rubric, GPAS and assessment-gap tests passed.
- Production build and TypeScript validation passed.
- Unauthenticated API request returned 401 `E_PERMISSION_DENIED`.
- Authenticated database-owner/RLS test was not executed in this environment.

### Known Issues
- Phase 4 must connect the readiness gate to evaluation job creation.
- Rule-based lexical alignment is conservative and may require manual review for indirect links.

### Rollback
- Remove the new validation route/modules; existing evaluation remains unchanged.

## [2.2.1-quality-platform-database] - 2026-07-06

### Added
- Non-destructive migration for evaluation jobs/results, issues, versions, patches and cache.
- Ownership-based read RLS and service-role-only writes.
- Constraints for modes, statuses, severities, score ranges, JSON shapes and SHA-256 hashes.
- Required lookup, processing, history and cache indexes.

### Changed
- No existing table, record, API or legacy `ai_evaluation_*` workflow was modified.
- `lesson_plan_id` uses `VARCHAR(255)` to match existing `LessonPlans.planId`.

### Migration
- Run `database/migrations/09_lesson_plan_quality_platform.sql` twice on staging.

### QA
- Migration static safety/contract tests passed.
- No destructive SQL was found.
- Live Supabase migration was not executed in this environment.

### Known Issues
- Phase 3+ APIs must use server-side service role for writes.
- Staging idempotency, RLS and query-plan verification remain required.

### Rollback
- Disable new Quality Platform consumers and retain additive data; do not drop populated tables.

## [2.2.0-quality-platform-foundation] - 2026-07-06

### Added
- Canonical type-safe Lesson Plan interface and runtime JSON Schema.
- Pure normalizer from existing flat `LessonPlans` records to the canonical schema.
- Stable SHA-256 `lesson_plan_hash` helper.
- Evaluation Mode Registry for `lesson_plan_basic`, `wpa_w9` and `committee_4d`.
- Locked-anchor Master Rubrics totaling 100 points for all three modes.

### Changed
- No existing evaluator, API, database, UI or export behavior was changed.

### Migration
- None in Phase 1.

### QA
- Foundation contract tests passed.
- Stable hash, legacy field mapping, mode/rubric alignment and score totals were verified.
- `npm run build` passed; ESLint was not executed because it is not installed.

### Known Issues
- Runtime JSON Schema validation will be connected in a later phase.
- Validators, database migration, async integration and cache persistence are not part of Phase 1.

### Rollback
- Remove `lib/lesson-plan/`, its test and Phase 1 documentation only.

## [1.0.4-phase1-learning-resources] - 2026-07-06

### Fixed
- Phase 1 now owns and validates Learning Content, Media, Learning Sources and Tasks.
- AI Activity responses with empty required fields are rejected instead of returning false success.
- Existing teacher-entered content/resource fields are preserved.
- Phase 2 wording now matches its actual K/P/A, rubric and reflection scope.

### QA
- Activity result normalization tests passed.
- Live Phase 1 completed in 32.338s: Core 18.744s and Activity 13.594s.
- Live result contained Learning Content plus two Media, two Learning Sources and two Tasks.
- `npm run build` passed; ESLint was not executed because it is not installed.

### Known Issues
- Production Vercel deployment was not executed in this environment.
- Full browser/save/export regression requires manual verification after deploy.

### Rollback
- Revert the Phase 1 activity validator/helper and PlanForm copy/mapping changes; no database rollback is required.

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
