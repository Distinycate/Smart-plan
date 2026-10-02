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
| V3.5 — Assessment Engine | `076eb21` | ✅ DONE |
| V3.6 — Teaching Package Builder | `448b1d9` | ✅ DONE |
| V3.7R — Quality & PA Compliance Hardening | `c484be7` | ✅ DONE |
| V3.8 — Document Model & A4 Preview | `cfd4177` | ✅ DONE |
| V3.9 — Word & PDF Export Engine | `54d5885` | ✅ DONE |
| V3.10 — Post-Teaching & Student Evidence | `28df306` | ✅ DONE |
| V3.11 — End-to-End Hardening & Production Cutover | `3160062` | ✅ DONE |
| V3.12 — Guided Choice Lesson Authoring | `e73eb8c` | ✅ DONE |

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

### WAVE V3.7R — QUALITY & PA COMPLIANCE HARDENING — COMPLETE

**Removal of Quality Score**:
- `QualityScore` (0–100) completely removed from quality gate decisions, document readiness, REVIEWED workflow status, PA readiness, and UI gauge.
- Replaced by `V3QualitySummary` (`blockingIssues`, `warnings`, `suggestions`, `structuralReady`, `assessmentReady`, `packageReady`, `documentReady`).
- UI displays clean checklist cards (โครงสร้าง, ความสอดคล้อง, กิจกรรม, การประเมิน, ชุดพร้อมสอน) and summary status cards. No aggregate score exists.

**Versioned PA Criteria Registry & Semantics**:
- `lib/smartPlanV3/pa/registry.ts`: Version `PA_TEACHER_V9_2564` based on ว9/2564 (ตำแหน่งครู, 20 พฤษภาคม 2564) and amendment trajectory (ว22/2564, 456/2566, 1122/2567, 1144/2567, 1683/2567, ล1222/2568, OTEPC-SUMMARY-2569).
- Separates official text from system interpretation via `mappingType: "DIRECT" | "INTERPRETED" | "SYSTEM_QUALITY_RULE"`.
- Status contract: `EVIDENCED` (มีหลักฐานในแผน — requires `evidenceRefs.length >= 1`), `PARTIALLY_EVIDENCED` (มีหลักฐานบางส่วน), `NOT_EVIDENCED` (ยังไม่พบหลักฐาน), `NOT_APPLICABLE` (ไม่เกี่ยวข้องกับแผนนี้).
- Planned vs Observed distinction: Pre-teaching stage strictly uses `evidenceStage: "PLANNED"` and cannot claim students already achieved outcomes.
- Detailed documentation: `docs/SMART_PLAN_V3_PA_CRITERIA.md`.

**Deterministic Document Readiness & Workflow Status**:
- `deriveDocumentReadiness(graph, ruleIssues)` gates export on deterministic rules (blocking issues = 0, objectives covered, evidence covered, assessment ready, duration valid, required assets ready and not stale).
- Promotion to `REVIEWED` happens only when `documentReadiness.ready === true`.
- If an already-`REVIEWED` lesson is later modified and deterministic gate fails, status automatically downgrades back to `PACKAGE_READY`.

**Issue-Only AI Qualitative Reviewer & Scoped Apply**:
- 1 AI call per lesson, cached by SHA-256 lesson hash.
- Strict issue-only output schema (`issues: [...]`), zero score/rating fields.
- Anti-hallucination ref validation sanitizes any phantom references.
- Scoped Apply Fix applies changes strictly to the specified entity and field (e.g. `A2.student_actions`) without mutating other entities. Automatically marks previous AI review as stale.

**Test & Build Verification**:
- `tests/test-v3-quality-engine.js`: Tests A–T + FP/FN (22/22 passed).
- `tests/smoke-test-v3-quality-gemini.js`: Real Gemini 2.5 Flash smoke test across English Speaking, Math Problem Solving, and Science Experiment (3/3 passed).
- All regression suites: Profiles, Workflow, Domain Graph, Blueprint Engine, Assessment Engine, Teaching Package, Quality Engine all PASS.
- Build gate: `npx tsc --noEmit` and `npm run build` both PASS cleanly.

### WAVE V3.8 — DOCUMENT MODEL & A4 PREVIEW — COMPLETE

**Canonical Document Model Architecture**:
- Created `lib/smartPlanV3/document/` module:
  - `types.ts`: Pure JSON-serializable canonical document model `V3LessonDocument`, `DocumentMetadata`, `DocumentOptions`, `DocumentSection` (discriminated union for 10 section types), `DocumentAppendix`, `AppendixItem`.
  - `labels.ts`: Centralized Thai labels for sections, appendix categories, asset types, tool types, and assessment methods.
  - `formatters.ts`: Deterministic formatting for durations, dates, Thai appendix letters (`ก`, `ข`, `ค`, ...), and objective references.
  - `pagination.ts`: A4 constraints (210mm x 297mm, margins 20/15/20/20mm), break classes (`page-break-before`, etc.), and `DOCUMENT_A4_CSS`.
  - `sections.ts`: Section builders for sections 1–10 and `buildDocumentAppendices` with dynamic lettering.
  - `builder.ts`: `buildLessonDocument(graph, params)` DB-aware builder function with readiness gating and hash computation (`documentSourceHash`).
  - `validators.ts`: `validateLessonDocumentModel` verifying uniqueness, sequential lettering, zero technical enum leakage, zero UUID leakage, and serializability.
  - `index.ts`: Unified export module.
- Single source of truth: `V3 Lesson Graph` $\rightarrow$ `Document Builder` $\rightarrow$ `Canonical Model` $\rightarrow$ `Renderers`.

**Audit & Content Map**:
- `docs/SMART_PLAN_V3_DOCUMENT_CONTENT_MAP.md`: Full audit mapping canonical sections 1–10 + appendices to V3 structured entities and fallbacks without fabricating missing fields.

**Security & API**:
- `GET /api/plan/v3/[id]/document`: Read-only server endpoint verifying ownership and readiness (`deriveDocumentReadiness`). Returns 409 if lesson is not in `REVIEWED` status or has blockers. Zero DB access in renderers.

**Modular HTML / A4 Renderer**:
- `components/smartPlanV3/document/`:
  - `LessonDocumentHtmlRenderer.tsx`: Master A4 document renderer using CSS Paged Media.
  - `DocumentSectionRenderer.tsx`: Discriminated union section renderer.
  - `TeachingAssetRenderer.tsx`: Dedicated renderers for worksheets, problem sets, speaking cards, experiment sheets, data tables, task cards, exit tickets, teacher guides, answer keys.
  - `AssessmentToolRenderer.tsx`: Dedicated renderers for rubrics, checklists, scoring guides, observation forms.
- Page break protection, table header repeat, Thai typography line-height, and mobile scale-down support.

**A4 Preview Page & Workflow Stepper**:
- `app/plan/v3/[id]/preview/page.tsx`: Interactive preview with toolbar, return button, options drawer (toggle Student Assets, Assessment Tools, Answer Keys, Teacher Guide, PA Readiness), zoom controls, browser print (`window.print()`), readiness lock screen, and dev debug modal.
- `app/plan/v3/[id]/page.tsx`: Updated StepNav to unlock Step 7 when `status === 'REVIEWED'`, added Step 7 view linking to `/plan/v3/${planId}/preview`.
- `app/plan/v3/[id]/Step6QualityReview.tsx`: Action button to proceed directly to Step 7 upon achieving `REVIEWED`.

**Strict Invariants Verified**:
- Zero AI calls in document engine (`AI CALLS: 0`).
- No technical enums or database UUIDs leaked into user-visible document.
- Pre-teaching safety: Pre-teaching stage cannot invent or claim student outcomes.
- Immutability: Document building does not mutate the original lesson graph or persist options to lesson core.

**Test & Build Verification**:
- `tests/test-v3-document-model.js`: Tests A–X (All 24 test cases pass 100%).
- All 8 test suites pass: Subject Profiles, Workflow, Domain Graph, Blueprint Engine, Assessment Engine, Teaching Package, Quality Engine, Document Model.
- Build gate: `npx tsc --noEmit` and `npm run build` both PASS cleanly.

### READY FOR V3.9 — WORD & PDF EXPORT ENGINE — COMPLETE
- Migration 18 LIVE: `FINAL` transition via atomic PostgreSQL RPC `finalize_v3_lesson`.
- `v3_plan_versions` with `version_type = 'FINAL'` is immutable (PostgreSQL trigger prevents UPDATE/DELETE).
- Server-side DOCX and PDF export engines implemented and verified on Vercel Chromium runtime.

### WAVE V3.10 — POST TEACHING & STUDENT EVIDENCE — COMPLETE

**Post-Teaching Lifecycle & Architecture**:
- Lifecycle extended: `REVIEWED` $\rightarrow$ `FINAL` $\rightarrow$ `TAUGHT` $\rightarrow$ `REFLECTED`.
- Migration 19: `database/migrations/19_smart_plan_v3_post_teaching_evidence.sql`
  - Extends `v3_post_teaching_records` with attendance, duration, session metadata, what worked, next lesson adjustment.
  - Creates `v3_observed_student_evidence` (separate from `v3_learning_evidence`).
  - Pre-teaching child entities locked across `FINAL`, `TAUGHT`, `REFLECTED`.
  - Atomic RPCs: `record_v3_teaching` and `record_v3_reflection`.
- Document Overlay Engine: `buildPostTeachingDocument` overlays post-teaching record and observed evidence on the immutable `FINAL` snapshot in `v3_plan_versions`.
- Remediation Gate: `students_need_support > 0` strictly requires `remediation_plan`.
- Student Privacy: Aggregate metrics and anonymous samples only, zero student PII, private Supabase Storage bucket with signed access.
- Tests: `tests/test-v3-post-teaching.js` passes all 23 scenarios (A–W).
- Regression: All 10 V3 test suites pass 100%. TypeScript: 0 errors. Build: PASS.

### WAVE V3.11 — END-TO-END HARDENING & PRODUCTION CUTOVER — COMPLETE

**Integration, Security & Production Closure**:
- **Lifecycle & Lock Hardening**:
  - `isLessonLocked(status)` helper strictly guards pre-teaching mutations across `FINAL`, `TAUGHT`, and `REFLECTED`.
  - Disallowed arbitrary client PATCH on lifecycle state (`status`). Lifecycle transitions are 100% server-authoritative (`/finalize`, `/teach`, `/reflect`).
  - Child entity endpoints (`objectives`, `activities`, `assessments`, `tools`, `assets`, `curriculum-links`, `evidence-links`) strictly enforce plan ID verification to eliminate IDOR vulnerabilities across plans and users.
- **Student Evidence Upload Security**:
  - Endpoint `POST /api/plan/v3/[id]/post-teaching/evidence/upload`: Validates magic bytes (JPEG, PNG, WebP, GIF, PDF), caps file size at 15MB, enforces path scoping `{userId}/{planId}/{uuid}.{ext}` in private bucket `v3_student_evidence`, and serves files via short-lived authenticated signed URLs (1 hour expiry).
- **Service Role Audit**:
  - Confirmed 0 occurrences of `SUPABASE_SERVICE_ROLE_KEY` in client components, browser bundles, public routes, or git-tracked environment files.
- **Production Cutover & Legacy Coexistence**:
  - `app/dashboard/page.tsx`: Sets Smart Plan V3 as primary default creation target (`/plan/v3/new`) when `isV3Enabled()`.
  - Legacy routes (`/plan/new`, `/plan/[id]`, `/plan/[id]/preview`) and legacy folder views remain 100% functional with zero data sync conflicts.
  - Zero-risk rollback switch via `NEXT_PUBLIC_ENABLE_SMART_PLAN_V3=false`.
- **Automated Integration Tests**:
  - `tests/test-v3-e2e-hardening.js`: 15/15 Integration Test Cases (A–O) PASS cleanly under plain Node.js.
- **Full Regression & Quality Gate**:
  - All 11 V3 Test Suites PASS (Subject Profiles, Workflow, Domain Graph, Blueprint, Assessment, Teaching Package, Quality, Document Model [24/24], Export Engine [47/47], Post-Teaching [23/23], E2E Hardening [15/15]).
  - TypeScript: `npx tsc --noEmit` exits with 0 errors.
  - Production Build: `npm run build` exits with code 0.
- **Documentation**:
  - `docs/SMART_PLAN_V3_PRODUCTION_RUNBOOK.md`: Comprehensive operational runbook covering environment, migrations 15–19, Chromium runtime, security, cutover, rollback, and troubleshooting checklist.

### WAVE V3.12 — GUIDED CHOICE LESSON AUTHORING & PRODUCTION CLOSURE — COMPLETE

**Guided Choice Principles & Architecture**:
- Shifts authoring experience from blank-slate typing to high-agency guided choices across all steps (Steps 1–9).
- **Step 1 (Quick Start & Metadata Chips)**: One-click profile auto-fill for Topic, Grade, Focus, Duration, and Student Context chips without blocking manual customization.
- **Step 2 (Tiered Objective Suggestions & Curated Evidence)**: 3 pedagogical tiers (Foundational, Core Target, Extension) with rationale, candidate regeneration safety (`🔄 เสนอใหม่` never wipes saved objectives), and curated evidence selection (Pair Speaking, Role-play, Lab Sheet, etc.).
- **Step 3 (Pedagogical Flow Architectures)**: Subject-specific flows (English: 2W3P, Task-Based, Fluency; Math: Polya 4-Step; Science: 5E Inquiry) auto-normalized to exact target duration (50/60/100 min) with role allocations.
- **Step 4 (Evidence-Aligned Assessment Tools)**: Performance rubrics (4-level: Beginning, Developing, Proficient, Advanced), observation checklists, peer reviews; strictly rejects MCQ as sole assessment for active skills.
- **Step 5 (Guided Teaching Package Checklist)**: Multi-item generation checklists for student/teacher assets with resilient scoped background jobs.
- **Step 6 (Scoped Quality Fix Suggestions)**: Anti-hallucination scoped patches targeting specific entities without destructive full-plan rewrites.
- **Step 8 & 9 (Post-Teaching Quick Chips & Reflection Assist)**: Classroom reality chips (participation, pacing, remediation) and AI reflection synthesis strictly grounded on observed facts without hallucinating statistics.
- **Resilience & Safety**: Deterministic fallback rules active on AI latency or network failure; refresh persistence verified; zero mandatory typing fields in standard flow.

**Production UX Verification (`SMART PLAN V3.12P`)**:
- Commit deployed: `e73eb8c` (Deployment `dpl_3aZ6KDoMfTvH417GV2AmZgEKhtYP` on `https://smart-plan-ten.vercel.app`, Status: READY).
- Production live verification across English (Speaking M.1 60m), Math (Problem Solving 50m), and Science (Experiment 100m) all PASS.
- Mobile viewport 375×812 (iPhone SE standard) verified with zero horizontal overflow (`scrollWidth === innerWidth === 375px`).
- Automated tests: `tests/test-v312-guided-choice.js` (13/13 PASS).
- Blockers: P0: 0, P1: 0.

### NON-DESTRUCTIVE INVARIANTS (MUST STAY)
- Legacy tables (`LessonPlans`, `UnitPlans`, etc.) — unchanged
- Legacy routes (`/plan`, `/plan/new`, `/dashboard`) — unchanged
- Feature Flag: `SMART_PLAN_V3` in `lib/featureFlags.ts` controls visibility
- No bidirectional sync between legacy and V3 schemas
