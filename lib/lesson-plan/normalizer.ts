import {
  LESSON_PLAN_SCHEMA_VERSION,
  type AssessmentToolType,
  type IndicatorType,
  type LessonPlan,
} from './schema';

export type LegacyLessonPlanRecord = Readonly<Record<string, unknown>>;

export const safeText = (value: unknown): string => String(value ?? '').trim();

export const parseMaybeJson = (value: string): unknown => {
  if (!value || (!value.startsWith('[') && !value.startsWith('{'))) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const splitIndicators = (value: string): string[] => {
  return value
    .split(/\r?\n/)
    .map(item => item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
};

export const textToList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(textToList).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap(textToList)
      .filter(Boolean);
  }

  const raw = safeText(value);
  const parsed = parseMaybeJson(raw);
  if (parsed !== raw) return textToList(parsed);

  return splitIndicators(raw);
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const normalized = safeText(value);
    if (normalized) return normalized;
  }
  return '';
};

const positiveNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const standardCodePattern = /(?:มาตรฐาน\s*)?([ก-๙A-Za-z]+\s*\d+(?:\.\d+)*)/;
const indicatorCodePattern =
  /([ก-๙A-Za-z]+\s*\d+(?:\.\d+)?\s*(?:ป|ม)\.?\s*\d+(?:-\d+)?\/\d+)/;

const parseCodeAndDescription = (
  value: string,
  pattern: RegExp
): { code: string; description: string } => {
  const match = value.match(pattern);
  const code = match?.[1]?.replace(/\s+/g, ' ').trim() || '';
  const description = code
    ? value.replace(match?.[0] || code, '').replace(/^[:\s-]+/, '').trim()
    : value;
  return { code, description };
};

const normalizeStandards = (value: unknown): LessonPlan['curriculum']['standards'] =>
  textToList(value).map(item => parseCodeAndDescription(item, standardCodePattern));

const normalizeIndicators = (
  value: unknown,
  type: IndicatorType
): LessonPlan['curriculum']['indicators'] =>
  textToList(value).map(item => ({
    ...parseCodeAndDescription(item, indicatorCodePattern),
    type,
  }));

const uniqueIndicators = (
  indicators: LessonPlan['curriculum']['indicators']
) => {
  const seen = new Set<string>();
  return indicators.filter(indicator => {
    const key = `${indicator.code}|${indicator.description}|${indicator.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sentencesContaining = (value: string, pattern: RegExp) =>
  value
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map(item => item.trim())
    .filter(item => item && pattern.test(item))
    .join('\n');

const activeLearningTechniques = (process: string) => {
  const candidates: Array<[RegExp, string]> = [
    [/อภิปราย|สนทนา/, 'discussion'],
    [/กลุ่ม|ร่วมมือ/, 'collaborative_learning'],
    [/ทดลอง|ปฏิบัติ/, 'hands_on_learning'],
    [/ปัญหา|แก้ปัญหา/, 'problem_based_learning'],
    [/โครงงาน/, 'project_based_learning'],
    [/สะท้อน|reflection/i, 'reflection'],
    [/นำเสนอ|สื่อสาร/, 'presentation'],
  ];

  return candidates
    .filter(([pattern]) => pattern.test(process))
    .map(([, technique]) => technique);
};

const extractGpas = (process: string): LessonPlan['gpas'] => {
  const lines = textToList(process);
  const find = (patterns: RegExp[]) =>
    lines.find(line => patterns.some(pattern => pattern.test(line)));

  return {
    gathering: find([/gathering/i, /รวบรวมข้อมูล/, /ขั้นนำ/]),
    processing: find([/processing/i, /จัดกระทำข้อมูล/, /คิดวิเคราะห์/, /ขั้นสอน/]),
    applying: find([/applying/i, /ประยุกต์/, /ลงมือปฏิบัติ/, /ขั้นฝึก/]),
    selfRegulating: find([/self.?regulat/i, /กำกับตนเอง/, /สะท้อน/]),
    communication: find([/communication/i, /สื่อสาร/, /นำเสนอ/, /ขั้นสรุป/]),
  };
};

const normalizeActivities = (
  process: string,
  objectives: LessonPlan['objectives'],
  indicatorCodes: string[],
  evidence: string[]
): LessonPlan['learningActivities'] => {
  if (!process) return [];

  return [{
    step: 'กระบวนการจัดการเรียนรู้',
    stepType: 'other',
    teacherRole: sentencesContaining(process, /ครู/),
    studentRole: sentencesContaining(process, /นักเรียน|ผู้เรียน/),
    activeLearningTechniques: activeLearningTechniques(process),
    expectedEvidence: evidence,
    relatedObjectives: [
      ...objectives.knowledge,
      ...objectives.process,
      ...objectives.attitude,
    ],
    relatedIndicators: indicatorCodes,
  }];
};

const inferToolType = (value: string): AssessmentToolType => {
  if (/rubric|รูบริก|เกณฑ์การประเมิน/i.test(value)) return 'rubric';
  if (/checklist|ตรวจสอบรายการ/i.test(value)) return 'checklist';
  if (/สังเกต|observation/i.test(value)) return 'observation';
  if (/ใบงาน|worksheet/i.test(value)) return 'worksheet';
  if (/แบบทดสอบ|quiz|ข้อสอบ/i.test(value)) return 'quiz';
  if (/แฟ้ม|portfolio/i.test(value)) return 'portfolio';
  if (/ชิ้นงาน|ภาระงาน|performance/i.test(value)) return 'performance_task';
  return 'other';
};

const normalizeAssessment = (
  source: LegacyLessonPlanRecord,
  objectives: LessonPlan['objectives'],
  indicatorCodes: string[],
  taskEvidence: string[]
): LessonPlan['assessment'] => {
  const domains = [
    { key: 'K', objectives: objectives.knowledge },
    { key: 'P', objectives: objectives.process },
    { key: 'A', objectives: objectives.attitude },
  ] as const;

  const methods = domains.flatMap(domain =>
    textToList(source[`method${domain.key}`]).map(name => ({
      name,
      type: 'unspecified' as const,
      targetObjectives: domain.objectives,
      targetIndicators: indicatorCodes,
    }))
  );

  const tools = domains.flatMap(domain =>
    textToList(source[`tool${domain.key}`]).map(name => ({
      name,
      type: inferToolType(name),
      targetObjectives: domain.objectives,
      criteria: textToList(source[`criteria${domain.key}`]),
    }))
  );

  return {
    methods,
    tools,
    evidence: [
      ...taskEvidence,
      ...domains.flatMap(domain => textToList(source[`measure${domain.key}`])),
    ],
  };
};

const normalizeRubric = (
  source: LegacyLessonPlanRecord
): LessonPlan['rubric'] =>
  (['K', 'P', 'A'] as const).flatMap(domain => {
    const criteria = textToList(source[`rubric${domain}`]);
    if (criteria.length === 0) return [];
    return [{
      title: `เกณฑ์การประเมินด้าน ${domain}`,
      criteria: criteria.map(name => ({ name, levels: [] })),
    }];
  });

/**
 * Converts the existing flat LessonPlans record into the canonical schema.
 * The source object is never mutated and missing evidence stays empty rather
 * than being invented by the normalizer.
 */
export function normalizeLegacyLessonPlan(input: unknown): LessonPlan {
  const source: LegacyLessonPlanRecord =
    input && typeof input === 'object'
      ? input as LegacyLessonPlanRecord
      : {};

  const objectives: LessonPlan['objectives'] = {
    knowledge: textToList(source.objectiveK),
    process: textToList(source.objectiveP),
    attitude: textToList(source.objectiveA),
    competencyObjectives: textToList(source.skills21),
  };
  const indicators = uniqueIndicators([
    ...normalizeIndicators(source.indicatorDuring, 'during'),
    ...normalizeIndicators(source.indicatorFinal, 'terminal'),
  ]);
  const indicatorCodes = indicators.map(indicator => indicator.code).filter(Boolean);
  const tasks = textToList(source.tasks);
  const process = safeText(source.learningProcess);
  const media = textToList(source.learningMedia).map(name => ({
    name,
    type: 'learning_media',
  }));
  const learningSources = textToList(source.learningSources).map(name => ({
    name,
    type: 'learning_source',
  }));
  const reflectionResults = [
    ...textToList(source.resultK),
    ...textToList(source.resultP),
    ...textToList(source.resultA),
  ];

  return {
    id: firstText(source.planId, source.id) || undefined,
    metadata: {
      subjectGroup: firstText(
        source.learningArea,
        source.headerLearningArea,
        source.subjectGroup
      ),
      subjectName: safeText(source.subjectName),
      subjectCode: safeText(source.subjectCode) || undefined,
      gradeLevel: firstText(source.gradeLevel, source.headerGradeLevel),
      unitName: safeText(source.unitName),
      unitNumber: safeText(source.unitNumber) || undefined,
      planNumber: firstText(source.planNumber, source.planId) || undefined,
      lessonTitle: firstText(source.lessonTopic, source.lessonTitle),
      totalHours: positiveNumber(source.totalHours),
      teacherName: safeText(source.teacherName) || undefined,
      schoolName: safeText(source.schoolName) || undefined,
    },
    curriculum: {
      standards: normalizeStandards(source.learningStandard),
      indicators,
      coreContent: textToList(source.learningContent),
      localContent: textToList(source.localContent),
    },
    essence: {
      mainConcept: firstText(source.essentialConcept, source.essence),
      keyConcepts: textToList(source.keyConcepts),
    },
    objectives,
    competencies: textToList(source.competencies).map(name => ({ name })),
    desirableCharacteristics: textToList(source.desiredAttributes)
      .map(name => ({ name })),
    learningActivities: normalizeActivities(
      process,
      objectives,
      indicatorCodes,
      tasks
    ),
    activeLearning: {
      model: safeText(source.activeLearningModel) || undefined,
      techniques: activeLearningTechniques(process),
      evidence: tasks,
      studentCenteredEvidence: sentencesContaining(
        process,
        /นักเรียน|ผู้เรียน/
      )
        ? textToList(sentencesContaining(process, /นักเรียน|ผู้เรียน/))
        : [],
    },
    gpas: extractGpas(process),
    media: [...media, ...learningSources],
    assessment: normalizeAssessment(source, objectives, indicatorCodes, tasks),
    rubric: normalizeRubric(source),
    reflection: {
      studentReflection: reflectionResults,
      teacherReflection: textToList(source.problems),
      improvementPlan: textToList(source.solutions),
    },
    homework: textToList(source.homework),
    aiMetadata: {
      generatedBy: safeText(source.generatedBy) || undefined,
      generatedAt: safeText(source.generatedAt) || undefined,
      sourceKnowledgeBaseVersion:
        safeText(source.sourceKnowledgeBaseVersion) || undefined,
      schemaVersion: LESSON_PLAN_SCHEMA_VERSION,
    },
  };
}

export const normalizeLessonPlan = normalizeLegacyLessonPlan;
