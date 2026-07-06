export type ActivityGenerationData = {
  learningProcess?: string;
  learningContent: string;
  learningMedia: string[];
  learningSources: string[];
  tasks: string[];
};

const normalizeText = (value: unknown) => String(value || '').trim();

const normalizeList = (value: unknown) => {
  const rawItems = Array.isArray(value)
    ? value
    : normalizeText(value)
      .split(/\r?\n/)
      .map(item => item.replace(/^[-*•]\s*/, ''));

  return rawItems
    .map(normalizeText)
    .filter(Boolean);
};

export function normalizeActivityGeneration(
  value: unknown,
  requireLearningProcess: boolean
): {
  ok: boolean;
  data: ActivityGenerationData;
  missing: string[];
} {
  const input = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};

  const data: ActivityGenerationData = {
    learningProcess: normalizeText(input.learningProcess),
    learningContent: normalizeText(input.learningContent),
    learningMedia: normalizeList(input.learningMedia),
    learningSources: normalizeList(input.learningSources),
    tasks: normalizeList(input.tasks),
  };

  const missing: string[] = [];
  if (requireLearningProcess && !data.learningProcess) missing.push('learningProcess');
  if (!data.learningContent) missing.push('learningContent');
  if (data.learningMedia.length === 0) missing.push('learningMedia');
  if (data.learningSources.length === 0) missing.push('learningSources');
  if (data.tasks.length === 0) missing.push('tasks');

  return {
    ok: missing.length === 0,
    data,
    missing,
  };
}
