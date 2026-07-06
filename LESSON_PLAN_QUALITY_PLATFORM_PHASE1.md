# Lesson Plan Quality Platform — Phase 1 Core Foundation

Phase 1 is additive. It does not replace the existing `LessonPlans` table, evaluator APIs,
frontend or export workflow.

## Canonical Schema

```ts
import {
  LESSON_PLAN_JSON_SCHEMA,
  LESSON_PLAN_SCHEMA_VERSION,
  type LessonPlan,
} from '@/lib/lesson-plan';
```

`LessonPlan` is the compile-time contract. `LESSON_PLAN_JSON_SCHEMA` is the equivalent
runtime JSON Schema for API/worker validation in later phases.

## Normalize Existing LessonPlans

```ts
import { normalizeLegacyLessonPlan } from '@/lib/lesson-plan';

const canonicalPlan = normalizeLegacyLessonPlan(existingLessonPlanRow);
```

The normalizer accepts `unknown`, does not mutate the source and maps legacy flat fields
such as `objectiveK`, `learningProcess`, `methodK` and `rubricK` into the canonical schema.
Missing evidence remains empty; the normalizer does not invent educational content.

## Stable Lesson Plan Hash

```ts
import { createLessonPlanHash } from '@/lib/lesson-plan';

const lessonPlanHash = createLessonPlanHash(canonicalPlan);
```

The hash uses stable key ordering and SHA-256. Array order remains significant because it
can represent activity and rubric sequence.

## Evaluation Modes and Rubrics

```ts
import {
  EVALUATION_MODES,
  getEvaluationMode,
  getEvaluationRubric,
  getRubricCriterion,
} from '@/lib/lesson-plan';

const mode = getEvaluationMode('wpa_w9');
const rubric = getEvaluationRubric('wpa_w9');
const criterion = getRubricCriterion('wpa_w9', mode.sections[0]);
```

Supported modes:

- `lesson_plan_basic`
- `wpa_w9`
- `committee_4d`

Each rubric totals 100 points and provides locked anchors plus required evidence.

## Phase 1 Boundary

Not implemented in this phase:

- database migration
- pre/alignment/GPAS/assessment validators
- evaluation APIs or AI calls
- async job integration
- cache persistence
- patch engine or frontend changes
