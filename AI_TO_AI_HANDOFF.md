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
| V3.4 — 60-Minute Lesson Blueprint & Activity Engine | (Current) | ✅ DONE |

### V3.4 Deliverables

**AI & Blueprint Engine** (`lib/smartPlanV3/ai/`):
- `contextBuilder.ts`: Precondition validator, privacy data minimization, temporary token mapping (`O1`..`On`, `E1`..`Em`).
- `blueprintPrompt.ts`: System instruction, subject profile guidance, avoid patterns, output contract.
- `blueprintSchema.ts`: Structured JSON validator, student action non-empty enforcement, ref validity check.
- `blueprintService.ts`: 1 primary Gemini API call with auto-retry and correction prompt on invalid refs. Returns Preview without writing to DB.
- `activityRegenService.ts`: Scoped partial regeneration for 1 activity node.

**Rule Engine & Time Normalizer** (`lib/smartPlanV3/rules/activityRules.ts`):
- `calculateActivityMinutes`: Deterministic duration checking against 60 min.
- `suggestTimeNormalization`: Suggests minute adjustment for practice/apply activities without calling AI.
- `validateActivityRules`: Checks duration, objective coverage, evidence coverage, student actions, formative checks, feedback.
- `deriveLessonWorkflowStatus`: Promotes to `BLUEPRINT_READY` or downgrades to `DRAFT`.

**Repository Extensions** (`lib/smartPlanV3/repository.ts`):
- `getActivities`, `getActivityById`, `updateActivity`, `deleteActivity`, `reorderActivities`, `applyBlueprint`, `getObjectives`, `getEvidence`.

**API Endpoints**:
- `POST /api/plan/v3/[id]/blueprint/generate`: Generate Preview
- `POST /api/plan/v3/[id]/blueprint/apply`: Apply Preview to DB
- `GET / POST /api/plan/v3/[id]/activities`: Activity list & manual create
- `PATCH / DELETE /api/plan/v3/[id]/activities/[actId]`: Single activity CRUD
- `PUT /api/plan/v3/[id]/activities/reorder`: Reorder activities
- `POST /api/plan/v3/[id]/activities/[actId]/regenerate`: Partial activity alternative

**UI (Step 3)**:
- `Step3Activities.tsx`: Stepper Step 3 unlocked, Rule summary panel, AI generate button, Preview before apply modal, Activity card stack, Manual activity form, Time normalizer button, Partial regenerate modal.

**Tests**:
- `tests/test-v3-blueprint-engine.js`: Tests A–L (12/12 passed, AI CALLS: 0)
- `tests/smoke-test-v3-gemini.js`: Live Gemini 2.5 Flash smoke tests (English, Math, Science all PASS)

### READY FOR V3.5 — ASSESSMENT ENGINE

**Next Scope (Wave V3.5)**:
- Full assessment entity generator (`v3_assessments`, `v3_assessment_tools`, `v3_assessment_evidence_links`)
- Rubric Generator (analytic & holistic rubrics tied to evidence)
- Formative Assessment Checklist / Answer Key Generator
- Connection between Activity Formative Moments & Assessment Tools

### NON-DESTRUCTIVE INVARIANTS (MUST STAY)
- Legacy tables (`LessonPlans`, `UnitPlans`, etc.) — unchanged
- Legacy routes (`/plan`, `/plan/new`, `/dashboard`) — unchanged
- Feature Flag: `SMART_PLAN_V3` in `lib/featureFlags.ts` controls visibility
