# AI-to-AI Handoff — Quality Platform Phase 1–5

## Urgent Runtime Update — 2026-07-07

The primary runtime fixes after Phase 5 are already in the working tree:

- Core and Activity generation run together; live synthetic elapsed time was ~10s.
- `/api/ai-fix` uses Flash Lite and compact feedback; live synthetic elapsed time was ~7.8s.
- Evaluation uses two bounded section workers in the browser.
- Nested queue + exponential retry was removed from evaluation and patch AI transports.
- Failure/retry writes use migration 09 fields/status only.
- Admin evaluation now relies on authenticated RLS rather than strict plan-owner equality.
- Evaluation results retain `jobId` for retry and downstream improvement.
- Phase 2 A/reflection responses enforce required keys and server-side non-empty fallbacks.
- `EvaluationResultDashboard` normalizes `result.issues.ordered` before array operations.
- `/api/ai-fix`, plan create/update/read and Word export now apply
  `ensureDetailedRubrics()` so AI-generated Rubric 5-level text
  cannot remain merged inside `toolK/toolP/toolA`; it is moved to
  `rubricK/rubricP/rubricA` for table rendering. It also prevents K/P/A Rubric
  tables from rendering score rows without descriptions by preserving the
  original detailed rubric first or filling conservative K/P/A-specific defaults.

Critical regression note: the score aggregator intentionally stores prioritized
issues as `{ ordered, bySeverity, counts }`. Do not change the dashboard back to
`const issues = result.issues ?? []`; that caused the completed-result white screen.

Critical rubric layout note: do not remove the sanitizer/detail guard or prompt
rules that keep Rubric content out of assessment-tool fields. Existing polluted or
heading-only rows are normalized on read/export and will be persisted cleanly only
after a teacher saves/updates them.

Do not reintroduce `failed_rate_limited`, `evaluation_results.error_type` or
`last_retry_at` unless migration 10 has been verified in the target environment.
Do not reintroduce `runAIRequestQueued(retryWithBackoff(...))` around a transport
that already has a section deadline.

## Authority and Safety

Treat the implementation under `lib/lesson-plan/` and `/api/evaluations/*` as the
primary Quality Platform implementation. Do not replace it with the experimental
legacy `ai_evaluation_*` flow. Preserve all legacy Lesson Plan save/export APIs.
Do not drop tables, clear data, or apply AI suggestions to teacher data.

## Phase 0 Architecture Consolidation — 2026-09-15

- `lib/architecture/canonical-flow-registry.ts` is the source of truth for the
  Golden Path. New work must use Core + Activity + completion and
  `/api/evaluations/*` for persisted lesson plans.
- AI patch routes are now preview-first. Both direct patch preview and patch
  jobs must never call `LessonPlans.update()`.
- Patch jobs persist `lesson_plan_patches.applied=false` and expose before/after/
  reason from their status API. They do not create version history, invalidate
  an evaluation cache, or run a recheck until a teacher explicitly accepts.
- Do not reintroduce automatic patch writes. Teacher Apply remains blocked until
  Phase 1 security hardening and production authorization verification pass.

## Phase 1 Wave 1 — Identity & Authorization Foundation — 2026-09-15

- New migration `12_security_identity_authorization_foundation.sql` changes only
  policies/functions/grants. It must be reviewed and run manually in Supabase;
  it does not delete or backfill data.
- Migration 12 makes `profiles.role`, `id`, `email`, and `created_at`
  server-controlled. Teachers retain mutable profile fields only.
- `lib/auth/authorization.ts` is the only approved source for new API identity/
  ownership helpers. Do not trust body/query `userId`.
- Page middleware now guards all non-public pages. API routes remain excluded by
  design and must be hardened individually in Wave 2.
- Wave 2A is complete at source level only. Do not change export, restore, evaluation,
  patch or legacy routes until their dedicated Wave 2 batches begin.

## Phase 1 Wave 2A — Canonical AI Runtime Boundary — 2026-09-15

- `lib/ai/canonical-ai-boundary.ts` protects only the active PlanForm Golden Path:
  Core, Activity, Completion K/P/A and Reflection. Do not bypass it in a new canonical route.
- Each protected route requires `supabase.auth.getUser()` through `requireUser()` before
  it reads a payload or uses Gemini. The body is capped at 48 KiB.
- Migration `13_canonical_ai_request_admission.sql` is required before deployment. It
  provides serverless-safe, database-backed global/per-user concurrency admission.
  Missing RPC must remain a safe `503`; do not add an in-memory fallback.
- This is not per-minute rate limiting. Keep the provider interface and choose managed
  rate-limit infrastructure only after production architecture verification.
- Legacy callers still exist in `app/evaluator/page.tsx`; do not disable `/api/ai*` or
  `/api/evaluation-jobs/*` until caller migration and regression evidence exist.
- Next approved scope: Wave 2B Plan Ownership Boundary. Do not add teacher Apply.

## Phase 1 Wave 2B — Plan & Unit Ownership Boundary — 2026-09-15

- `requirePlanReader()` is the sole helper for LessonPlan read access. It permits
  the owner and administrator. `requirePlanOwner()` is required for plan mutation,
  restore and document export; it deliberately denies an admin acting on another
  teacher's plan.
- UnitPlan and all UnitLesson operations are owner-only. `requireUnitLessonOwner()`
  verifies the actual stored child FK matches the URL parent and current owner.
- No Wave 2B migration was created. Keep existing RLS; API checks are defense-in-depth.
- Next approved scope: Wave 2C Evaluation + Patch Boundary. Do not add teacher Apply,
  reviewer roles, rubric redesign or legacy-route disablement.

## Current State

- Phase 1: canonical schema, normalizer, stable hash, modes and rubrics complete.
- Phase 2: migration 09 complete; user reports the SQL ran successfully.
- Phase 3: pre/alignment/GPAS/assessment validators and validate API complete.
- Phase 4: section-scoped Gemini engine, consistency checks and deterministic
  aggregation complete.
- Phase 5: async create/process/status/result/retry APIs and evaluator integration
  implemented.

The legacy `/api/evaluation-jobs/*` routes remain for backward compatibility.
`/api/quality-platform/evaluation-jobs` is only an alias to the new create API.

## Required Environment

Confirm these server variables before deployment:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY_EVALUATE
GEMINI_EVALUATION_MODEL=gemini-2.5-flash-lite
GEMINI_FAST_MODEL=gemini-2.5-flash-lite
GEMINI_FIX_MODEL=gemini-2.5-flash-lite
```

`GEMINI_API_KEY` is a fallback. Remove dead keys from deployment configuration
instead of retaining an invalid key ahead of a working key.

## Verification Commands

Run from the project directory:

```bash
node tests/asyncEvaluationApiContracts.test.mjs
node tests/aiWorkflowLatencyContracts.test.mjs
node tests/phase2AndEvaluationUiRegression.test.mjs
node tests/rubricFieldSanitizerContracts.test.mjs
npm run build
git diff --check -- . ':(exclude)tsconfig.tsbuildinfo'
git status --short
```

Also rerun the Phase 1–4 test files using the same TypeScript runner available in
the environment. The current `node_modules` does not contain `tsx`; either install
the project's approved test runner first or rely on `npm run build` only for
TypeScript compilation. Do not report tests passed unless actually executed.

## Required Manual/Staging Test

1. Log in as a normal teacher and choose a persisted system lesson plan.
2. Create a basic evaluation and confirm create returns quickly with a `jobId`.
3. Call process repeatedly; confirm each request evaluates only one section.
4. Poll status between calls and verify progress is monotonic.
5. Confirm result returns the aggregate and all evidence arrays.
6. Force one AI failure, verify the section/job becomes failed, then retry it.
7. Run two process requests simultaneously and confirm one section is not
   evaluated twice.
8. Re-evaluate an unchanged plan and confirm cache hit still creates an owned,
   completed job.
9. Modify the plan after create and confirm process rejects the stale hash.
10. Verify legacy save draft/complete and PDF/Word export still work.
11. Test once as Admin against another teacher's visible plan.
12. Record Core+Activity, evaluation total, and improvement elapsed time from Vercel logs.

Uploaded DOCX evaluation intentionally stays on the legacy endpoint because an
upload has no persisted `lessonPlanId`. Do not route it into Phase 5 without an
explicit import/preview design.

## Git Push Instructions

Before committing, inspect `git diff` carefully because this workspace may contain
changes from another AI. Commit only the intended Phase 1–5 files and documentation.
Do not discard unknown user changes. Push only after the automated checks and the
manual authenticated staging checks above have been recorded truthfully.

Suggested commit title:

```text
feat: add async lesson plan quality evaluation pipeline
```

## Known Verification Gap

The local production build passes. Authenticated live Supabase/Vercel, concurrent
worker, cache and retry behavior still require staging execution. Do not claim the
system is production-ready until those checks pass.

---

## SMART PLAN V3 — Wave Status (2026-09-28)

### COMPLETED WAVES

| Wave | Commit | Status |
| :--- | :--- | :--- |
| V3.0 — System Audit & Foundation | `b2c4b21` | ✅ DONE |
| V3.1 — Domain Model & Database Foundation | `9f8dfc4` | ✅ DONE |
| V3.2 — Curriculum & Subject Profile Engine | `ae4922d` | ✅ DONE |
| V3.3 — New Lesson Creation Workflow (Steps 1 & 2) | `9268fe3` / `7ac155e` | ✅ DONE |
| V3.4 — 60-Minute Lesson Blueprint & Activity Engine | `959390e` | ✅ DONE |
| V3.5 — Assessment Engine | 076eb21 | ✅ DONE |
| V3.6 — Teaching Package Builder | (Current) | ✅ DONE |

### V3.6 Deliverables — Teaching Package Builder

**Core Principles & Architecture**:
- Transforms the Lesson Graph (`Indicators → Objectives → Evidence → Activities → Assessment → Assessment Tools`) into curated, bespoke teaching assets (`v3_teaching_assets`).
- Zero AI for requirement categorization; 100% deterministic rules engine based on Subject Profiles and Activity/Evidence/Assessment Graph.
- 1 Asset = 1 Scoped AI request (Never generate the entire package in a single prompt).
- Strict Preview-first flow: `Generate → Schema Validation → Preview Modal → Teacher Edit → Apply to DB`.
- Answer Key Guard: strictly blocked until parent worksheet/problem set is created and saved.
- Assessment Tool Reuse: reuses Step 4 rubrics and checklists without duplicating them as teaching assets.

**Deterministic Asset Requirement Engine** (`lib/smartPlanV3/rules/teachingAssetRules.ts`):
- `deriveTeachingAssetRequirements`: Categorizes assets into `required`, `recommended`, `optional`, and `notNeeded`.
  - English Speaking: `SPEAKING_CARD` (Required, Student) + Reuse `ASSESSMENT_FORM` (Required, Teacher); `FLASHCARD` & `EXIT_TICKET` (Recommended); `WORKSHEET` (Optional, NOT required).
  - Math Calculation: `PROBLEM_SET` / `WORKSHEET` (Required, Student) + `ANSWER_KEY` (Required, Teacher).
  - Math Problem Solving: `PROBLEM_SET` (Required, Student, situation + reasoning workspace) + `ANSWER_KEY` (Required, Teacher).
  - Science Experiment: `EXPERIMENT_SHEET` (Required, Student) + `DATA_TABLE` (Required, Student) + Reuse `ASSESSMENT_FORM` (Checklist).
  - Physical Education: `TASK_CARD` (Required, Student) + Reuse `ASSESSMENT_FORM`; `WORKSHEET` marked as `notNeeded`.
  - Art: `ACTIVITY_SHEET` (Planning Sheet / Product Brief); `QUIZ` marked as `notNeeded`.
  - Deduplication: Merges multiple activity hints into 1 requirement item with combined activity targets.
- `deriveAssetReviewState`: Stale detection comparing entity timestamps; flags `needs_review = true` if linked objective, activity, or evidence was updated.
- `deriveTeachingPackageReadiness`: Verifies Blueprint readiness, Assessment readiness, all required assets ready (`generation_status === 'READY'`), and no required asset `needs_review`.
- `deriveLessonWorkflowStatus`: Promotes status to `PACKAGE_READY` when package readiness is satisfied; downgrades from `PACKAGE_READY` to `BLUEPRINT_READY` if required assets are missing or deleted.

**Pure TypeScript Schemas & Validation** (`lib/smartPlanV3/teachingAssets/schemas.ts`):
- Pure TypeScript models and validators (Zero `zod` dependency):
  - `WorksheetContent` & `ProblemSetContent` (sections, items, answerSpace, points)
  - `SpeakingCardContent` (Student A & B cards, situations, cues, vocabulary, expected utterances)
  - `ExperimentSheetContent` & `DataTableDef` (materials, safety, observation table, CER prompt)
  - `TaskCardContent` (stations, goals, steps, key techniques, safety notes)
  - `TeacherGuideContent` (timeline aligned with activity metadata, prompts, expected responses, tips)
  - `ExitTicketAssetContent` (1-5 min prompt models)
  - `AnswerKeyAssetContent` (exact answers, accepted answers, scoring criteria for reasoning)
- `validateAssetDuration`: Flags warning when `estimatedMinutes > activityMinutes`.

**Scoped AI Services** (`lib/smartPlanV3/ai/`):
- `teachingAssetPrompt.ts`: System instruction enforcing active learning and observable behaviors; family-specific prompt builders.
- `teachingAssetService.ts`: Server-side context builder stripping all user/email/student identifiers; scoped Gemini generation with auto-retry; Answer Key guard enforcement.

**Repository Extensions** (`lib/smartPlanV3/repository.ts`):
- `getTeachingAssets(planId)` with linked objective, activity, and evidence IDs.
- `getTeachingAssetById(id)`.
- `createTeachingAsset`, `updateTeachingAsset`, `deleteTeachingAsset` (cascades junction links safely without touching objectives, activities, evidence, or assessments).
- Junction link helpers: `linkAssetObjective`, `unlinkAssetObjective`, `linkAssetActivity`, `unlinkAssetActivity`, `linkAssetEvidence`, `unlinkAssetEvidence`.
- Updated `getLessonGraph` to load `assetObjectiveLinks`, `assetActivityLinks`, `assetEvidenceLinks`.

**API Endpoints**:
- `GET / POST /api/plan/v3/[id]/assets`: List with requirements & readiness; create asset or link.
- `GET / PATCH / DELETE /api/plan/v3/[id]/assets/[assetId]`: Single asset CRUD & workflow status sync.
- `POST /api/plan/v3/[id]/assets/recommend`: Return required/recommended/optional asset breakdown.
- `POST /api/plan/v3/[id]/assets/generate`: Scoped AI generator returning preview only.

**UI (Step 5)**:
- `Step5TeachingPackage.tsx`:
  - Stepper Step 5 unlocked (`isAvailable = step <= 5`).
  - Precondition banner: blocks package builder with link to Step 4 if activities = 0 or assessment is not ready.
  - Audience filter: ทั้งหมด (All) / นักเรียน (Student) / ครู (Teacher).
  - Categorized asset lists: Required, Recommended, Optional.
  - AI Generation Modal with Preview before Apply, duration warning, and Existing vs. Alternative comparison for regeneration.
  - Manual asset creation modal ("+ เพิ่มสื่อเอง").
  - Stale asset notification banner with "ตรวจทานแล้ว" acknowledgment.
  - Package readiness summary header (`PACKAGE_READY` badge).

**Automated & Smoke Tests**:
- `tests/test-v3-teaching-package.js`: Tests A–O (All 15 test cases, 17/17 passed, AI CALLS: 0).
- `tests/smoke-test-v3-teaching-package-gemini.js`: Live Gemini 2.5 Flash smoke tests (English Speaking Card, Math Problem Set, Science Experiment Sheet, Teacher Guide Timeline all PASS).

### READY FOR V3.7 — QUALITY & PA READINESS ENGINE

**Next Scope (Wave V3.7)**:
- Quality Review Engine (PA-8 indicators alignment & rubric criteria evaluation)
- PA Readiness Report
- Rubric scoring & compliance check

### NON-DESTRUCTIVE INVARIANTS (MUST STAY)
- Legacy tables (`LessonPlans`, `UnitPlans`, etc.) — unchanged
- Legacy routes (`/plan`, `/plan/new`, `/dashboard`) — unchanged
- Feature Flag: `SMART_PLAN_V3` in `lib/featureFlags.ts` controls visibility
