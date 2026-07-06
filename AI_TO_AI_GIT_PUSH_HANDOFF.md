# AI-to-AI Runtime, Commit and Git Push Handoff

Date: 2026-07-06  
Repository: `/Users/distinycate/Desktop/smart plan/ระบบแผนการสอน`

## Current Git State Observed

At handoff creation:

- branch: `main`
- HEAD: `db9d056`
- `origin/main`: `db9d056`
- prior V2 foundation, queue and UnitLesson work is already committed/pushed
- only Unit Library, Unit Export, Alignment Preview and their documentation remain uncommitted

Update: Unit Library/Export/Alignment was later committed and pushed as `e1744c9`.
The current uncommitted hotfix is Gemini key fallback:

- `app/api/queue/route.ts`
- `lib/geminiClient.ts`
- `lib/geminiKeyPool.ts`
- `tests/geminiKeyPool.test.ts`
- `tests/geminiClientFallback.test.ts`
- this changelog/QA/handoff update

Run the two compiled mock tests and `npm run build`, then commit as:

```text
fix: rotate invalid Gemini keys before failing
```

Live verification completed locally without printing key values:

- four distinct configured key slots returned Gemini HTTP 200
- deterministic key pool test passed
- mock first-key-401 then fallback-200 test passed
- `npm run build` passed

Before push/deploy, inspect Vercel environment for stale `GEMINI_API_KEYS`.
Route-specific keys should remain configured. Redeploy after environment or code changes.
Because plaintext keys existed in ignored local scripts, recommend rotating all Gemini keys
and updating deployment environment values.

## Mission

Validate the accumulated V2 Unit Planning and multi-user queue changes on staging,
fix only evidence-backed defects, commit the intended files, push the current branch,
and report exact QA evidence.

Do not rewrite, reset, force-push, drop tables, backfill LessonPlans or expose secrets.

## Implemented Source

- V2 documentation foundation
- UnitPlan Draft/Ready APIs and UI
- UnitLesson add/edit/archive/atomic reorder
- Shared multi-user AI queue and queue admission
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
- `AI_CONCURRENCY_LIMIT=1` for the first concurrency test

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

### Multi-user Queue

Use two authenticated accounts in separate browser profiles.
With concurrency limit 1, confirm one processing job and one waiting job,
ownership isolation, failure cleanup and lease release.

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
ARCHITECTURE_DECISIONS.md
CHANGELOG.md
ERROR_HANDLING.md
FEATURE_LIST.md
QA_TEST_CASE.md
SECURITY.md
SETUP_GUIDE.md
USER_GUIDE.md
app/layout.tsx
app/unit-plans/UnitPlannerForm.tsx
app/unit-plans/AlignmentPreview.tsx
app/unit-plans/page.tsx
app/unit-plans/[id]/preview/
app/api/alignment-check/
app/api/unit-plans/[id]/export/
lib/alignmentResultValidation.ts
lib/unitPlanExportData.ts
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

Do not amend or rewrite commit `db9d056`.

## Suggested Commit Scope

After QA, stage the intended documentation, migrations, Unit routes/pages,
queue/alignment routes and helpers explicitly. Verify with:

```bash
git diff --cached --stat
git diff --cached --check
npm run build
```

Suggested commit:

```text
feat: add unit library export and alignment preview
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
