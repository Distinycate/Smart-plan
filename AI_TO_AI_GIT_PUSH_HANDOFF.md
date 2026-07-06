# AI-to-AI Runtime, Commit and Git Push Handoff

Date: 2026-07-06  
Repository: `/Users/distinycate/Desktop/smart plan/ระบบแผนการสอน`

## Current Git State Observed

- branch: `main`
- HEAD observed before this hotfix: `bfd1497`
- current uncommitted work is the urgent AI latency/reliability hotfix
- inspect `git status`, `git diff` and `git log` again because another AI may change HEAD concurrently

Main hotfix files:

- `.env.example`
- `app/plan/PlanForm.tsx`
- `app/api/ai-process-core/route.ts`
- `app/api/ai-process-activity/route.ts`
- `app/api/ai-completion-{k,p,a,reflection}/route.ts`
- `lib/geminiClient.ts`
- `lib/geminiKeyPool.ts`
- `lib/geminiRuntime.ts` (already committed by `bfd1497`)
- `tests/geminiKeyPool.test.ts`
- `tests/geminiClientFallback.test.ts`
- `CHANGELOG.md`, `QA_TEST_CASE.md`, `SETUP_GUIDE.md` and this handoff

Run the two compiled mock tests and `npm run build`, then commit as:

```text
fix: keep Gemini generation within serverless timeout
```

Verification completed locally without printing key values:

- Phase 1 API: Core 7.649s, Activity 12.543s, total 20.193s
- Phase 2 API: K/P/A/Reflection all HTTP 200 in 11.536s after transient first-attempt 503 fallback
- Phase 1 browser flow populated Core and Activity fields in about 32s
- deterministic key pool, 401 key fallback and 503 model fallback tests passed
- `npm run build` passed
- ESLint was not executed because it is not installed

Before push/deploy, inspect Vercel environment for stale `GEMINI_API_KEYS`.
Set `GEMINI_FAST_MODEL=gemini-2.5-flash-lite`, keep route-specific keys configured,
and add more than one distinct active key for concurrent-user resilience.
Redeploy after environment or code changes.
Because plaintext keys existed in ignored local scripts, recommend rotating all Gemini keys
and updating deployment environment values.

Important architecture note: commit `bfd1497` removed the runtime queue routes/client and
uses granular direct Gemini calls. Migration 06 may still exist in the repository, but the
current UI does not enqueue through it. Do not report multi-user queue QA as passed. If strict
global concurrency control is required, restore/reintegrate the queue in a separate reviewed
change instead of mixing it into this timeout hotfix.

## Mission

Review this latency hotfix, rerun the listed checks, commit the intended files, push the
current branch, deploy to Vercel and report exact production QA evidence.

Do not rewrite, reset, force-push, drop tables, backfill LessonPlans or expose secrets.

## Implemented Source

- V2 documentation foundation
- UnitPlan Draft/Ready APIs and UI
- UnitLesson add/edit/archive/atomic reorder
- Granular direct AI generation routes; shared runtime queue is not currently integrated
- Unit Plan Library
- Unit preview, browser PDF and Word export
- Alignment preview for UnitPlan/LessonPlan with AIHistory

## Required Migration Order

Run on staging first and run each file a second time:

1. `database/migrations/05_unit_planning_v2_foundation.sql`
2. `database/migrations/06_ai_jobs_concurrency_queue.sql`
3. `database/migrations/07_unit_lesson_sequence.sql`

Never run `database/schema.sql`.

Before migration, take a staging backup and record the project identifier and timestamp
without copying credentials into Git.

## Environment

Required:

- Supabase URL, anon key and service-role key
- Gemini key
- `GEMINI_FAST_MODEL=gemini-2.5-flash-lite`
- more than one distinct active key in `GEMINI_API_KEYS` for production concurrency

Optional:

- `GEMINI_API_KEY_ALIGNMENT`

Never commit `.env.local`.

## Verification Already Completed

- `npm run build` passed after all source changes.
- TypeScript validation and Next.js route generation passed.
- ESLint did not run because the project does not have the dependency installed.
- No migration or production write was performed by the implementation AI.

## Mandatory Runtime QA

### Existing Lesson Regression

Run every TC-REG case in `QA_TEST_CASE.md`, including Lesson draft/complete,
backup, archive/restore, Word and PDF.

### Multi-user AI

Use two authenticated accounts in separate browser profiles. Confirm both Phase 1 flows
finish successfully and inspect Vercel logs for persistent 401/429/503 after retries.
Runtime queue behavior cannot be claimed because queue integration was removed in `bfd1497`.

### Unit Workflow

Create Draft → add two UnitLessons → reorder → edit → archive → match hours →
Save Ready. Confirm VersionHistory before every update/reorder/archive.

### Export

Verify Draft watermark, Ready export, Thai fonts, A4 print, long text,
lesson sequence and existing Lesson export regression.

### Alignment

Confirm eight dimensions, score range 0–100, database indicator grounding,
AIHistory pending record, no UnitPlan/LessonPlan mutation and no Apply action.

## Git Safety

Inspect first and confirm HEAD has not changed unexpectedly:

```bash
git status --short
git diff --check
git diff
```

Do not blindly use `git add .`. For this final increment, stage only:

```text
.env.example
AI_TO_AI_GIT_PUSH_HANDOFF.md
CHANGELOG.md
QA_TEST_CASE.md
SETUP_GUIDE.md
app/api/ai-completion-a/route.ts
app/api/ai-completion-k/route.ts
app/api/ai-completion-p/route.ts
app/api/ai-completion-reflection/route.ts
app/api/ai-process-activity/route.ts
app/api/ai-process-core/route.ts
app/plan/PlanForm.tsx
lib/geminiClient.ts
lib/geminiKeyPool.ts
tests/geminiClientFallback.test.ts
tests/geminiKeyPool.test.ts
```

Continue to exclude:

- `.env.local`
- `.next/`
- `.eslintrc.json` unless ESLint is intentionally installed and verified
- `check_indicators.js`
- `debug_indicators.js`
- `restore_missing_indicators.js`
- `test_all_keys.js`
- `test_all_models.js`
- `test_empty2.js`
- `test_list_models.js`
- `test_model.js`
- `test_x_goog_ya29.js`

Do not amend or rewrite commit `bfd1497`.

## Suggested Commit Scope

After QA, stage only the latency hotfix files listed above. Verify with:

```bash
git diff --cached --stat
git diff --cached --check
npm run build
```

Suggested commit:

```text
fix: keep Gemini generation within serverless timeout
```

Then push normally to the current branch. Do not force-push:

```bash
git branch --show-current
git push origin HEAD
```

If push fails due to network or permissions, report the exact error and leave the
verified commit locally. Do not retry with destructive Git commands.

## Required Final Report

- migration first/second run evidence
- tests Passed/Failed/Not executed
- Word/PDF screenshots or visual observations
- concurrency observations for two users
- commit hash and pushed branch
- remaining risks and rollback readiness
