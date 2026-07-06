# Lesson Plan Quality Platform — Phase 3 Validator

Phase 3 adds deterministic rule-based validation before any AI evaluation.

## Modules

- `pre-validator.ts`: readiness gate and issue severity
- `alignment-validator.ts`: indicator → objective → activity → assessment → rubric matrix
- `gpas-validator.ts`: five-stage GPAS evidence
- `assessment-validator.ts`: methods, tools, rubric, evidence and objective coverage
- `POST /api/lesson-plans/validate`: authenticated validation endpoint

## API Input

Validate an existing plan through Supabase RLS:

```json
{
  "lessonPlanId": "PLAN-001",
  "evaluationMode": "lesson_plan_basic"
}
```

Or validate canonical/legacy JSON without saving:

```json
{
  "lessonPlan": {
    "subjectName": "วิทยาศาสตร์",
    "gradeLevel": "ม.1"
  },
  "evaluationMode": "wpa_w9"
}
```

Supported modes:

- `lesson_plan_basic`
- `wpa_w9`
- `committee_4d`

## Ready Response

```json
{
  "ok": true,
  "ready": true,
  "status": "ready",
  "evaluationMode": "lesson_plan_basic",
  "lessonPlanHash": "64-character sha256",
  "issues": [],
  "missingRequiredSections": [],
  "alignment": {
    "aligned": true,
    "score": 20,
    "maxScore": 20,
    "matrix": []
  },
  "gpas": {
    "complete": true,
    "score": 5,
    "maxScore": 5
  },
  "assessment": {
    "valid": true
  }
}
```

## Not Ready Response

Critical issues are validation results, not transport errors, so the API still returns
HTTP 200 with:

```json
{
  "ok": true,
  "ready": false,
  "status": "lesson_plan_not_ready",
  "issues": [
    {
      "code": "INDICATORS_MISSING",
      "section": "curriculum.indicators",
      "severity": "critical",
      "message": "ไม่พบตัวชี้วัด",
      "suggestion": "เพิ่มตัวชี้วัดระหว่างทางหรือปลายทางตามแผนจริง"
    }
  ],
  "missingRequiredSections": ["curriculum.indicators"]
}
```

## Critical Readiness Rules

- missing standards
- missing indicators
- missing all objectives
- missing learning activities
- missing assessment methods
- missing assessment tools
- missing rubric in `wpa_w9` or `committee_4d`

High/medium/low findings remain visible but do not set `ready = false`.

## Phase 4 Integration

The evaluation-job create API must:

1. load and normalize the LessonPlan
2. call `preValidateLessonPlan`
3. if `ready === false`, create/return status `lesson_plan_not_ready`
4. persist validation issues
5. never call AI for a not-ready plan
6. if ready, use `lessonPlanHash` for cache lookup before creating work
