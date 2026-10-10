export const FAST_GEMINI_MODEL =
  process.env.GEMINI_FAST_MODEL?.trim() || 'gemini-flash-lite-latest';

export const fastGeminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${FAST_GEMINI_MODEL}:generateContent`;

export const fastJsonGenerationConfig = (maxOutputTokens: number) => ({
  responseMimeType: 'application/json',
  maxOutputTokens,
  temperature: 0.2,
  thinkingConfig: { thinkingBudget: 0 },
});

export const clipForAi = (value: unknown, maxCharacters: number) => {
  const text = String(value || '');
  if (text.length <= maxCharacters) return text;
  return `${text.slice(0, maxCharacters)}\n[ตัดข้อความส่วนเกินเพื่อให้ประมวลผลทันเวลา]`;
};

