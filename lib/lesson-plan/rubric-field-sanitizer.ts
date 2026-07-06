type MutablePlan = Record<string, unknown>;

const DOMAIN_KEYS = ['K', 'P', 'A'] as const;

const RUBRIC_LEVEL_PATTERN =
  /(?:^|\n)\s*(?:ระดับ\s*)?(?:คะแนน\s*)?[1-5]\s*(?:คะแนน|ระดับ)?\s*(?:[:=\-]|คือ|\s)\s+/i;

const RUBRIC_HEADER_PATTERN =
  /(?:เกณฑ์\s*(?:การ)?ประเมิน\s*(?:แบบ\s*)?(?:rubric|รูบริก|รูบิค)|rubric\s*(?:[KPA])?|รูบริก\s*(?:[KPA])?|รูบิค\s*(?:[KPA])?)/i;

const COUNT_LEVEL_PATTERN =
  /(?:^|\n)\s*(?:ระดับ\s*)?(?:คะแนน\s*)?([1-5])\s*(?:คะแนน|ระดับ)?\s*(?:[:=\-]|คือ|\s)\s+/gi;

const toText = (value: unknown) => String(value ?? '').trim();

const normalizeWhitespaceLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

const hasRubricLevelSet = (value: string) => {
  const levels = new Set<string>();
  COUNT_LEVEL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = COUNT_LEVEL_PATTERN.exec(value)) !== null) {
    levels.add(match[1]);
  }
  return levels.size >= 3 && levels.has('5') && levels.has('1');
};

const findRubricStartIndex = (value: string) => {
  const levelMatch = value.match(RUBRIC_LEVEL_PATTERN);
  return levelMatch?.index ?? -1;
};

const stripRubricHeaderNoise = (value: string, domain: typeof DOMAIN_KEYS[number]) =>
  value
    .replace(new RegExp(`^\\s*(?:เกณฑ์\\s*(?:การ)?ประเมิน\\s*(?:แบบ\\s*)?(?:Rubric|รูบริก|รูบิค)\\s*(?:ด้าน\\s*)?${domain}?\\s*[:：\\-]?\\s*)`, 'i'), '')
    .replace(/^\s*(?:Rubric|รูบริก|รูบิค)\s*(?:[KPA])?\s*[:：\-]?\s*/i, '')
    .trim();

function splitToolAndRubric(
  rawTool: unknown,
  rawRubric: unknown,
  domain: typeof DOMAIN_KEYS[number],
) {
  const toolText = toText(rawTool);
  const rubricText = toText(rawRubric);

  if (!toolText || !hasRubricLevelSet(toolText)) {
    return {
      tool: rawTool,
      rubric: rawRubric,
      changed: false,
    };
  }

  const rubricStart = findRubricStartIndex(toolText);
  if (rubricStart < 0) {
    return {
      tool: rawTool,
      rubric: rawRubric,
      changed: false,
    };
  }

  const cleanTool = normalizeWhitespaceLines(toolText.slice(0, rubricStart))
    .replace(/(?:เกณฑ์\s*(?:การ)?ประเมิน\s*(?:แบบ\s*)?(?:Rubric|รูบริก|รูบิค)\s*)$/i, '')
    .trim();
  const extractedRubric = normalizeWhitespaceLines(
    stripRubricHeaderNoise(toolText.slice(rubricStart), domain)
  );

  if (!extractedRubric) {
    return {
      tool: cleanTool || rawTool,
      rubric: rawRubric,
      changed: cleanTool !== toolText,
    };
  }

  return {
    tool: cleanTool,
    rubric: rubricText
      ? normalizeWhitespaceLines(`${rubricText}\n${extractedRubric}`)
      : extractedRubric,
    changed: true,
  };
}

/**
 * Keeps legacy flat LessonPlans compatible with the official layout:
 * `toolK/P/A` contains only the assessment instrument, while the 5-level
 * rubric text lives in `rubricK/P/A` so preview/export can render it as a table.
 *
 * The input object is never mutated.
 */
export function sanitizeRubricsOutOfAssessmentTools<T extends MutablePlan>(plan: T): T {
  const sanitized: MutablePlan = { ...plan };

  for (const domain of DOMAIN_KEYS) {
    const toolKey = `tool${domain}`;
    const rubricKey = `rubric${domain}`;
    const result = splitToolAndRubric(sanitized[toolKey], sanitized[rubricKey], domain);

    if (result.changed) {
      sanitized[toolKey] = result.tool;
      sanitized[rubricKey] = result.rubric;
    }
  }

  return sanitized as T;
}
