/**
 * Read-side contract between the flat production LessonPlans row and the
 * canonical application model. The normalizer owns the transformation; this
 * registry makes the supported source fields explicit for AI, evaluation and
 * future export/apply work.
 *
 * This is deliberately not a database migration or write mapper. A canonical
 * object must never be written to LessonPlans without an explicit, reviewed
 * legacy-field mapping and a teacher-approved apply action.
 */
export const LEGACY_TO_CANONICAL_LESSON_PLAN_MAP = [
  { canonical: 'id', legacy: ['planId'] },
  { canonical: 'metadata.teacherName', legacy: ['teacherName'] },
  { canonical: 'metadata.schoolName', legacy: ['schoolName'] },
  { canonical: 'metadata.subjectGroup', legacy: ['learningArea', 'headerLearningArea'] },
  { canonical: 'metadata.subjectName', legacy: ['subjectName'] },
  { canonical: 'metadata.subjectCode', legacy: ['subjectCode'] },
  { canonical: 'metadata.gradeLevel', legacy: ['gradeLevel', 'headerGradeLevel'] },
  { canonical: 'metadata.unitName', legacy: ['unitName'] },
  { canonical: 'metadata.unitNumber', legacy: ['unitId'] },
  { canonical: 'metadata.lessonTitle', legacy: ['lessonTopic'] },
  { canonical: 'metadata.totalHours', legacy: ['totalHours'] },
  { canonical: 'curriculum.standards', legacy: ['learningStandard'] },
  { canonical: 'curriculum.indicators[during]', legacy: ['indicatorDuring'] },
  { canonical: 'curriculum.indicators[terminal]', legacy: ['indicatorFinal'] },
  { canonical: 'essence.mainConcept', legacy: ['essentialConcept'] },
  { canonical: 'curriculum.coreContent', legacy: ['learningContent'] },
  { canonical: 'objectives.knowledge', legacy: ['objectiveK'] },
  { canonical: 'objectives.process', legacy: ['objectiveP'] },
  { canonical: 'objectives.attitude', legacy: ['objectiveA'] },
  { canonical: 'competencies', legacy: ['competencies', 'skills21'] },
  { canonical: 'desirableCharacteristics', legacy: ['desiredAttributes'] },
  { canonical: 'learningActivities', legacy: ['learningProcess'] },
  { canonical: 'assessment', legacy: [
    'measureK', 'methodK', 'toolK', 'criteriaK',
    'measureP', 'methodP', 'toolP', 'criteriaP',
    'measureA', 'methodA', 'toolA', 'criteriaA',
  ] },
  { canonical: 'rubric[K/P/A]', legacy: ['rubricK', 'rubricP', 'rubricA'] },
  { canonical: 'media', legacy: ['learningMedia', 'learningSources', 'tasks'] },
  { canonical: 'reflection', legacy: ['resultK', 'resultP', 'resultA', 'problems', 'solutions'] },
] as const;

export const CANONICAL_WRITE_POLICY = {
  automaticLegacyWriteAllowed: false,
  requiredBeforeWrite: [
    'teacher_review',
    'selected_section_apply',
    'stale_hash_check',
    'backup_or_version_snapshot',
    'validated_legacy_field_mapper',
  ],
} as const;
