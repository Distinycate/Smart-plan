-- Atomic UnitLesson sequence reordering.
-- Additive and idempotent. No existing lesson records are modified on install.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public."UnitLessons"'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%"unitPlanId"%, "lessonOrder"%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public."UnitLessons" DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_lessons_active_order_unique
  ON public."UnitLessons" ("unitPlanId", "lessonOrder")
  WHERE "lessonStatus" <> 'archived';

CREATE OR REPLACE FUNCTION public.reorder_unit_lessons(
  p_unit_plan_id VARCHAR,
  p_user_id UUID,
  p_ordered_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected INTEGER;
  v_matched INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."UnitPlans"
    WHERE "unitPlanId" = p_unit_plan_id
      AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Unit plan not found or unauthorized';
  END IF;

  SELECT COUNT(*) INTO v_expected
  FROM public."UnitLessons"
  WHERE "unitPlanId" = p_unit_plan_id
    AND user_id = p_user_id
    AND "lessonStatus" <> 'archived';

  SELECT COUNT(*) INTO v_matched
  FROM public."UnitLessons"
  WHERE "unitPlanId" = p_unit_plan_id
    AND user_id = p_user_id
    AND "lessonStatus" <> 'archived'
    AND "unitLessonId" = ANY(p_ordered_ids);

  IF COALESCE(array_length(p_ordered_ids, 1), 0) <> v_expected OR v_matched <> v_expected THEN
    RAISE EXCEPTION 'Ordered lesson IDs do not match active unit lessons';
  END IF;

  -- Temporary negative values avoid unique(unitPlanId, lessonOrder) collisions.
  UPDATE public."UnitLessons" lesson
  SET "lessonOrder" = -ordered.ordinality,
      "updatedAt" = NOW()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ordered(lesson_id, ordinality)
  WHERE lesson."unitLessonId" = ordered.lesson_id
    AND lesson."unitPlanId" = p_unit_plan_id
    AND lesson.user_id = p_user_id;

  UPDATE public."UnitLessons"
  SET "lessonOrder" = ABS("lessonOrder"),
      "updatedAt" = NOW()
  WHERE "unitPlanId" = p_unit_plan_id
    AND user_id = p_user_id
    AND "lessonOrder" < 0;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_unit_lessons(VARCHAR, UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_unit_lessons(VARCHAR, UUID, TEXT[]) TO service_role;
