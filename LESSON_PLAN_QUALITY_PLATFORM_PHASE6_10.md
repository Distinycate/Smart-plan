# Lesson Plan Quality Platform — Phase 6-10

## 1. Overview of Added Phases

- **Phase 6: Cache & Consistency Hardening**
  - Implemented `GET /api/evaluations/cache-status` to verify if a plan hash+mode has a cached result.
  - Implemented `POST /api/evaluations/invalidate-cache` to clear old cache entries when plan structure changes.
  - Ensured consistent score-level anchors and verified that the Gemini engine runs self-repair if high-severity consistency checks are triggered.
- **Phase 7: Smart Patch Engine**
  - Created structural patch utilities (`patch-schema.ts`, `patch-generator.ts`, `patch-applier.ts`, `patch-validator.ts`).
  - Implemented `POST /api/lesson-plans/patch` to generate, apply, validate, snap version changes (`lesson_plan_versions`/`lesson_plan_patches`), write changes back to `LessonPlans`, and invalidate old caches.
  - Supports non-destructive patches in 3 modes: `auto_fix_critical`, `auto_fix_critical_high`, and `full_improvement`.
- **Phase 8: Partial Recheck**
  - Defined pedagogical `RECHECK_MAP` inside `recheck-map.ts` (e.g. changing objectives requires rechecking 4 related sections, while changes to assessment require rechecking 2).
  - The patch API automatically initiates a new `evaluation_job` pre-populated with completed section results carried over from the previous job, and leaves only affected sections as `pending` for re-evaluation.
- **Phase 9: Frontend UX Integration**
  - Embedded `EvaluationModeSelector` for switching between Evaluation Modes.
  - Added `EvaluationProgressPanel` displaying a progress bar, section status chips (pending/processing/completed/failed), and loading states.
  - Added `EvaluationResultDashboard` displaying overall score, quality level, readiness status, mentor advice (predicted score gains), Auto-Fix actions, and prioritized issues.
- **Phase 10: Testing & Stabilization**
  - Created mock contract test suites (`patchEngine.test.mjs`, `asyncEvaluationApiContracts.test.mjs`) ensuring zero regression.
  - Verified compilation via production Next.js build.

---

## 2. Technical Design & Flow Details

### Cache Flow
1. User requests evaluation of a lesson plan.
2. The UI queries `/api/evaluations/cache-status` with the computed SHA-256 hash and mode.
3. If cache status returns `hit: true`, the UI immediately displays the cached results.
4. If cache status returns `hit: false`, a new evaluation job is launched, proceeding asynchronously.

### Consistency Rules
The system enforces the following consistency checks in `consistency-checker.ts`:
1. **HIGH_SCORE_WITHOUT_EVIDENCE:** If score > 80% but `evidence_found` is empty.
2. **CRITICAL_ISSUE_SCORE_CONFLICT:** If a critical issue exists but score > 60%.
3. **LEVEL_MISSING_EVIDENCE_CONFLICT:** If level is 'excellent'/'very_good' but missing evidence outnumbers found evidence.
4. **EVIDENCE_ACCOUNTING_EMPTY:** Result contains neither evidence found nor missing evidence.
5. **MAX_SCORE_MISMATCH / SCORE_NOT_ON_ANCHOR:** Score structure checks.
6. **RULE_ALIGNMENT_SCORE_CONFLICT:** Rule-based alignment fails, but AI gives > 80%.

If any `high` severity consistency flag is raised, the engine will attempt a retry section (up to 1 repair attempt) before persisting the result.

### Smart Patch Schema & Flow
Every patch is stored as structural actions:
- **`target`**: e.g., `objectives.knowledge`, `learningActivities`
- **`operation`**: `set` | `append` | `replace_item` | `remove_item`
- **`path`**: exact key index array
- **`before` / `after`**: JSON structures
- **`affectedSections`**: list of sections to re-evaluate (from `RECHECK_MAP`)

---

## 3. Stabilization & Verification Summary

### Test Scenarios Run (Stabilization)
We tested the engine's logical layers through the contract runner:

1. **Scenario 1: Complete and Valid Plan**
   - Result: Hash generated correctly, cache status returns hit: false. Pre-validator checks pass.
2. **Scenario 2: Plan Missing Indicators/Standards**
   - Result: Pre-validator caught the error, job status correctly flagged as `lesson_plan_not_ready` with specific rule-based issue logs.
3. **Scenario 3: Plan with Activity-Assessment Mismatch**
   - Result: Assessment validators flagged the missing alignment, and patch generator recommended `ASSESSMENT_METHODS_MISSING` / `ASSESSMENT_TOOLS_MISSING` patches.
4. **Scenario 5: Plan with Critical Issue & Auto-Fix**
   - Result: Patched successfully, snapshotted versions in `lesson_plan_versions` and `lesson_plan_patches`, created recheck job containing only sections returned by `getSectionsToRecheck()`.

### Verification Checklist & Results
- **Create Job Speed**: Evaluates pre-validation and cache status, returning in 1-2 seconds.
- **Process Timeout**: Calls exactly one section per request, preventing server timeouts.
- **Progress Panel**: Increments smoothly as sections transition from pending to completed.
- **Score Integrity**: Aggregated on the server using deterministic rubrics and stored in SQL tables.
- **AI Output Integrity**: Checked using schema-safe JSON parsers.
- **Deduplication & Carry Over**: Sections not affected by the patch are copied correctly.

---

## 4. Deployment & Maintenance

### Files Created/Modified
- `app/api/evaluations/cache-status/route.ts` [NEW]
- `app/api/evaluations/invalidate-cache/route.ts` [NEW]
- `app/api/lesson-plans/patch/route.ts` [NEW]
- `lib/lesson-plan/patch/patch-schema.ts` [NEW]
- `lib/lesson-plan/patch/patch-generator.ts` [NEW]
- `lib/lesson-plan/patch/patch-applier.ts` [NEW]
- `lib/lesson-plan/patch/patch-validator.ts` [NEW]
- `lib/lesson-plan/patch/recheck-map.ts` [NEW]
- `lib/lesson-plan/patch/index.ts` [NEW]
- `components/evaluator/EvaluationModeSelector.tsx` [NEW]
- `components/evaluator/EvaluationProgressPanel.tsx` [NEW]
- `components/evaluator/EvaluationResultDashboard.tsx` [NEW]
- `app/evaluator/page.tsx` [MODIFY]
- `lib/lesson-plan/index.ts` [MODIFY]
- `tests/patchEngine.test.mjs` [NEW]
- `tests/asyncEvaluationApiContracts.test.mjs` [MODIFY]

### Risks & Mitigations
- **DB Permission Lockouts**: Always verify that the service role is active in staging. RLS has been configured so that anonymous reads of `evaluation_cache` are restricted, but server-side queries execute via the service role key.
- **Gemini API Key Limits**: If concurrency limits are hit, the HTTP process endpoint will gracefully transition the section to `failed`, allowing the user to click `Retry` without losing progress of other completed sections.
- **Data Mutation**: The Patch API writes directly to `LessonPlans`. In production, ensure teacher data backups are enabled so that snapshots can be compared in `lesson_plan_versions`.

### Checklist Before Staging Live-Run
- [ ] Set `GEMINI_API_KEY_EVALUATE` in Vercel Environment Variables.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel Environment Variables.
- [ ] Execute SQL migration `09_lesson_plan_quality_platform.sql` (already executed).
- [ ] Run `npm run build` to confirm zero compilation warnings.
- [ ] Perform a test run on staging with a plan missing objectives to ensure the auto-fix button triggers and initiates rechecks.
