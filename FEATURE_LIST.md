# Feature List

## Existing Lesson Workflow

- Standalone LessonPlan create/edit
- Draft/Complete validation
- Backup, archive and restore
- Word and browser-PDF export
- AI generation and evaluation

## V2 Unit Planning Source

- Unit Plan Library
- UnitPlan Draft/Ready
- UnitLesson add/edit/archive/reorder
- Completion and hours checklist
- VersionHistory and System_Logs
- Unit A4 preview and browser PDF
- Unit Word `.doc` export
- Alignment Preview with eight score dimensions
- Database-grounded indicators and AIHistory

## Lesson Plan Quality Platform

- Canonical Lesson Plan type and runtime JSON Schema
- Legacy flat-plan normalizer and stable SHA-256 hash
- Evaluation Mode Registry and locked rubrics for three modes
- Additive evaluation/version/patch/cache database foundation
- Rule-based readiness, alignment, GPAS and assessment validators
- Authenticated `POST /api/lesson-plans/validate`
- Unified section-based evaluation engine with locked anchors and JSON output
- Deterministic score aggregation, consistency flags and issue prioritization
- Async create/process/status/result/retry APIs with one AI section per request
- Hash/mode evaluation cache and stale-plan protection
- System-plan evaluator integration with legacy DOCX fallback
- Bounded two-worker evaluation and concurrent Core/Activity generation
- Preview-first AI improvement: proposed patches with before/after/reason; no automatic LessonPlans write

## Phase 1 Security Foundation

- Additive profile policy/grant hardening migration (manual Supabase execution required)
- Server-side user/admin/owner authorization primitives for new API work
- Protected-page login redirect while preserving API-level authorization responsibility
- Static security contract test for role immutability, ownership primitives and page guard
- Canonical AI request boundary: authenticated user, 48 KiB payload cap, typed validation,
  database-backed global/per-user concurrency admission, fail-closed configuration behavior
- Lesson/Unit ownership boundary: explicit owner-only mutations and exports, admin read-only
  cross-teacher LessonPlan access, and UnitLesson parent/child relationship validation

## Pending Runtime Gate

- Verify actual migration ledger/schema on staging (documents and source have historic status differences)
- Verify authenticated Phase 5 APIs against staging Supabase
- Run migration 12 and verify profile RLS/grants with teacher/admin test accounts
- Negative security tests: role escalation, cross-user plan/export/evaluation/patch access
- Run migration 13 and verify anonymous canonical AI returns 401, busy limits return 429,
  and missing admission schema returns safe 503 without a Gemini request
- Execute User A/User B IDOR verification for LessonPlan, restore, Word/PDF, UnitPlan,
  UnitLesson and Unit export
- Multi-user concurrency test
- Vercel timeout/cache/retry test
- Word/PDF visual QA
- Full lesson regression
- Production release approval

## Future

- Native DOCX/PDF server generation
- Explicit per-section teacher apply flow for selected AI suggestions
- Unit assessment and rubric editors
- Teaching material generation after alignment maturity
