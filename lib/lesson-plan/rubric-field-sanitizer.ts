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

const extractRubricLevelDescriptions = (value: string) => {
  const descriptions: Record<string, string> = {};
  const normalized = normalizeWhitespaceLines(value);
  const levelPattern =
    /(?:^|\n)\s*(?:ระดับ\s*)?(?:คะแนน\s*)?([1-5])\s*(?:คะแนน|ระดับ)?\s*(?:[:=\-]|คือ|\s)\s*([\s\S]*?)(?=(?:\n\s*(?:ระดับ\s*)?(?:คะแนน\s*)?[1-5]\s*(?:คะแนน|ระดับ)?\s*(?:[:=\-]|คือ|\s))|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = levelPattern.exec(normalized)) !== null) {
    const score = match[1];
    const description = match[2]
      .replace(/^(?:ดีเยี่ยม|ดีมาก|ดี|พอใช้|ปรับปรุง|ปานกลาง)\s*[:：\-]?\s*/i, '')
      .trim();
    descriptions[score] = description;
  }

  return descriptions;
};

export const hasDetailedRubric = (value: unknown) => {
  const text = toText(value);
  if (!text || !hasRubricLevelSet(text)) return false;

  const descriptions = extractRubricLevelDescriptions(text);
  const detailedLevels = ['5', '4', '3', '2', '1'].filter(score => {
    const description = descriptions[score] || '';
    return description.length >= 12 && !/^(?:คะแนน|ระดับ|ดีเยี่ยม|ดีมาก|ดี|พอใช้|ปรับปรุง|ปานกลาง)$/i.test(description);
  });

  return detailedLevels.length >= 4;
};

const fallbackRubricText = (
  domain: typeof DOMAIN_KEYS[number],
  source: MutablePlan,
) => {
  const domainLabel = domain === 'K'
    ? 'ด้านความรู้'
    : domain === 'P'
      ? 'ด้านทักษะกระบวนการ'
      : 'ด้านคุณลักษณะ';
  const objective = toText(source[`objective${domain}`]);
  const measure = toText(source[`measure${domain}`]);
  const focus = objective || measure || `ผลการเรียนรู้${domainLabel}`;

  if (domain === 'K') {
    return [
      `5 = อธิบาย${focus}ได้ถูกต้อง ครบถ้วน เชื่อมโยงเหตุผลและยกตัวอย่างประกอบได้ชัดเจน`,
      `4 = อธิบาย${focus}ได้ถูกต้องเป็นส่วนใหญ่ มีรายละเอียดสำคัญครบและสื่อความหมายได้ดี`,
      `3 = อธิบาย${focus}ได้ถูกต้องในประเด็นหลัก แต่ยังขาดรายละเอียดหรือความเชื่อมโยงบางส่วน`,
      `2 = อธิบาย${focus}ได้บางส่วน ต้องได้รับคำแนะนำเพิ่มเติมเพื่อให้เข้าใจประเด็นสำคัญ`,
      `1 = ยังอธิบาย${focus}ไม่ได้ชัดเจนหรือคลาดเคลื่อนมาก จำเป็นต้องได้รับการช่วยเหลืออย่างใกล้ชิด`,
    ].join('\n');
  }

  if (domain === 'P') {
    return [
      `5 = ปฏิบัติงานหรือกระบวนการเกี่ยวกับ${focus}ได้ถูกต้อง คล่องแคล่ว เป็นระบบ และช่วยแนะนำผู้อื่นได้`,
      `4 = ปฏิบัติงานหรือกระบวนการเกี่ยวกับ${focus}ได้ถูกต้องเป็นส่วนใหญ่ มีความต่อเนื่องและใช้เครื่องมือเหมาะสม`,
      `3 = ปฏิบัติงานหรือกระบวนการเกี่ยวกับ${focus}ได้ตามขั้นตอนหลัก แต่ยังต้องปรับความละเอียดหรือความคล่องแคล่ว`,
      `2 = ปฏิบัติงานหรือกระบวนการเกี่ยวกับ${focus}ได้บางขั้นตอน ต้องได้รับคำแนะนำระหว่างทำกิจกรรม`,
      `1 = ยังปฏิบัติงานหรือกระบวนการเกี่ยวกับ${focus}ไม่ได้ตามขั้นตอน ต้องได้รับการช่วยเหลืออย่างใกล้ชิด`,
    ].join('\n');
  }

  return [
    `5 = แสดงพฤติกรรม${focus}อย่างสม่ำเสมอ เหมาะสมกับสถานการณ์ และเป็นแบบอย่างที่ดีแก่เพื่อน`,
    `4 = แสดงพฤติกรรม${focus}อย่างสม่ำเสมอ มีความรับผิดชอบและร่วมกิจกรรมได้ดี`,
    `3 = แสดงพฤติกรรม${focus}เป็นส่วนใหญ่ แต่ยังต้องได้รับการกระตุ้นหรือเตือนเป็นบางครั้ง`,
    `2 = แสดงพฤติกรรม${focus}เป็นบางครั้ง ต้องได้รับคำแนะนำหรือการติดตามจากครู`,
    `1 = ยังไม่แสดงพฤติกรรม${focus}ตามที่คาดหวัง ต้องได้รับการช่วยเหลือและติดตามอย่างใกล้ชิด`,
  ].join('\n');
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

/**
 * Ensures rubric fields render meaningful table content. If AI returns only
 * level labels/scores without descriptions, preserve the original detailed
 * rubric first; otherwise use a conservative domain-specific fallback.
 */
export function ensureDetailedRubrics<T extends MutablePlan>(
  plan: T,
  fallbackPlan?: MutablePlan,
): T {
  const sanitized: MutablePlan = sanitizeRubricsOutOfAssessmentTools(plan);
  const fallback = fallbackPlan ? sanitizeRubricsOutOfAssessmentTools(fallbackPlan) : {};

  for (const domain of DOMAIN_KEYS) {
    const rubricKey = `rubric${domain}`;
    if (hasDetailedRubric(sanitized[rubricKey])) continue;

    if (hasDetailedRubric(fallback[rubricKey])) {
      sanitized[rubricKey] = fallback[rubricKey];
      continue;
    }

    sanitized[rubricKey] = fallbackRubricText(domain, {
      ...fallback,
      ...sanitized,
    });
  }

  return sanitized as T;
}
