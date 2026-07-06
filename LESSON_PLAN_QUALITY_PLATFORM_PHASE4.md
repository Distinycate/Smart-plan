# Lesson Plan Quality Platform — Phase 4 Unified Evaluation Engine

Phase 4 provides a standalone section-based engine. It does not create jobs or write to
the database; Phase 5 APIs will orchestrate and persist it.

Live synthetic verification completed one `structure` section in 9.887 seconds with a
valid rubric anchor, populated evidence arrays and no consistency flags.

## Evaluation Flow

1. Select an evaluation mode and section.
2. Resolve the locked rubric criterion from the Master Rubric.
3. Resolve the section definition from `SECTION_REGISTRY`.
4. Extract only plan data and rule findings relevant to that section.
5. Build a compact prompt containing one criterion and its allowed anchors.
6. Call Gemini with JSON response schema, temperature `0`, topP `0.1`.
7. Parse and validate every required field and reject scores outside anchors.
8. Run the consistency checker.
9. Repair/retry once within a shared 45-second section deadline.
10. Return the section result and consistency flags.
11. Aggregate completed section results in application code, never in AI.
12. Prioritize issues deterministically by severity and issue type.

## Main Usage

```ts
import {
  evaluateSection,
  aggregateScore,
  prioritizeIssues,
} from '@/lib/lesson-plan';

const outcome = await evaluateSection({
  plan,
  mode: 'lesson_plan_basic',
  section: 'curriculum_alignment',
  ruleBasedFindings,
});

const summary = aggregateScore([outcome.result]);
const issues = prioritizeIssues([outcome.result]);
```

## Section JSON Output

```json
{
  "section": "curriculum_alignment",
  "score": 13,
  "max_score": 15,
  "level": "very_good",
  "evidence_found": ["มาตรฐาน ว 2.2", "ตัวชี้วัด ว 2.2 ม.1/1"],
  "missing_evidence": [],
  "strengths": ["หลักสูตรและกิจกรรมเชื่อมโยงกัน"],
  "weaknesses": [],
  "suggestions": [],
  "issues": [
    {
      "severity": "medium",
      "issue_type": "alignment_detail",
      "title": "ควรระบุหลักฐานเพิ่ม",
      "description": "หลักฐานบางกิจกรรมยังไม่ชัด",
      "suggestion": "เพิ่ม expectedEvidence",
      "auto_fixable": false
    }
  ],
  "reason": "เลือกคะแนนจาก anchor 13"
}
```

`evidence_found` and `missing_evidence` are always required arrays. `score` must exactly
match an anchor in the criterion and `max_score` must match the locked rubric.

## Adding a Section

1. Add the section key to the target mode in `evaluation/modes.ts`.
2. Add a criterion with the same key to that mode's rubric.
3. Add a `SECTION_REGISTRY` entry with a minimal `extractPlanData` function.
4. Select only relevant rule findings with `extractRuleBasedFindings`.
5. Add isolation, anchor and consistency tests.

The engine rejects sections that are missing from either the selected mode or rubric.

## Phase 4 Boundary

Not implemented here:

- evaluation create/process/status/result/retry APIs
- database writes and cache lookup
- frontend polling
- patch application
