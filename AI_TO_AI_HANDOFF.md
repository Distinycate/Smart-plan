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
