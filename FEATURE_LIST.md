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
- Fast teacher-reviewed full-plan improvement preview

## Pending Runtime Gate

- Run migrations 05–07 on staging
- Verify authenticated Phase 5 APIs against staging Supabase
- Multi-user concurrency test
- Vercel timeout/cache/retry test
- Word/PDF visual QA
- Full lesson regression
- Production release approval

## Future

- Native DOCX/PDF server generation
- Teacher-reviewed apply flow for selected AI suggestions
- Unit assessment and rubric editors
- Teaching material generation after alignment maturity
