# Lesson Plan Quality Platform — Phase 5

## Development Impact Analysis

- Task: add asynchronous evaluation job APIs on the Phase 2 tables and Phase 4 engine.
- Existing behavior: legacy `/api/evaluation-jobs/*` and AI endpoints remain available.
- Database: uses `evaluation_jobs`, `evaluation_results`, `lesson_plan_issues`
  and `evaluation_cache`; no schema changes.
- Data risk: no `LessonPlans` write occurs. Derived issues for the same job/section
  are replaced only after a successful re-evaluation.
- Timeout control: create does not call AI; process evaluates exactly one section
  per request with the engine's 45-second shared deadline.
- Concurrency control: a worker claims a result only while its status is `pending`.
- Rollback: remove `/api/evaluations/*`, `lib/lesson-plan/jobs/*` and revert the
  evaluator integration. Keep additive database records.

## APIs

1. `POST /api/evaluations/create`
2. `POST /api/evaluations/process`
3. `GET /api/evaluations/status/[jobId]`
4. `GET /api/evaluations/result/[jobId]`
5. `POST /api/evaluations/retry/[jobId]`

All APIs require an authenticated Supabase session. Writes use the service role
only after ownership is verified.

## Processing Contract

Create normalizes the stored plan, computes its hash, performs the rule readiness
gate, checks cache, creates a job and returns immediately. Process claims and
evaluates one pending section. The browser calls process again while
`data.processNext` is true. A failed section is retained with its error and may be
reset through retry.

Completed section JSON is the only input to the deterministic score aggregator.
The final result is stored in job metadata and in the hash/mode cache.

## QA

- Production build and TypeScript route generation: executed and passed.
- Static async API contract test: see `tests/asyncEvaluationApiContracts.test.mjs`.
- Phase 1/3/4 TypeScript test rerun was attempted but not executed because the
  current project dependencies do not include the `tsx` runner.
- Authenticated Supabase, Vercel timeout, cache, retry and simultaneous-worker
  tests: not executed in this environment. Manual verification required.
