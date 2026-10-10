type GeminiEnvironment = {
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
  GEMINI_PAID_API_KEY?: string;
  GEMINI_FREE_API_KEY?: string;
  GEMINI_API_KEY_PROCESS?: string;
  GEMINI_API_KEY_COMPLETION?: string;
  GEMINI_API_KEY_EVALUATE?: string;
  GEMINI_API_KEY_FIX?: string;
  GEMINI_API_KEY_ALIGNMENT?: string;
};

const isUsableKey = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) &&
    normalized !== 'undefined' &&
    normalized !== 'null' &&
    !normalized.startsWith('your-') &&
    !normalized.includes('replace_me') &&
    !normalized.includes('changeme');
};

export function buildGeminiKeyPool(
  customApiKey?: string,
  environment: GeminiEnvironment = process.env as GeminiEnvironment
) {
  // Priority order:
  // 1. Primary/Paid keys (customApiKey, GEMINI_PAID_API_KEY, route keys, GEMINI_API_KEY)
  // 2. Fallback/Free keys (GEMINI_FREE_API_KEY)
  const values = [
    customApiKey,
    environment.GEMINI_PAID_API_KEY,
    environment.GEMINI_API_KEYS,
    environment.GEMINI_API_KEY_PROCESS,
    environment.GEMINI_API_KEY_COMPLETION,
    environment.GEMINI_API_KEY_EVALUATE,
    environment.GEMINI_API_KEY_FIX,
    environment.GEMINI_API_KEY_ALIGNMENT,
    environment.GEMINI_API_KEY,
    environment.GEMINI_FREE_API_KEY,
  ];

  return Array.from(new Set(
    values
      .filter(Boolean)
      .flatMap(value => String(value).split(','))
      .map(value => value.trim())
      .filter(isUsableKey)
  ));
}

export function geminiAttemptLimit(requestedAttempts: number, keyCount: number) {
  if (keyCount < 1) return 0;
  // Always allow at least 3 attempts so model-tier failover (2.5-flash -> 2.5-flash-lite -> 1.5-flash)
  // or multi-key rotation has room to operate within the deadline.
  return Math.max(3, Math.min(Math.max(requestedAttempts, keyCount), 8));
}

export function shouldRotateGeminiKey(status: number, remainingUntriedKeys: number) {
  return [401, 402, 403, 429].includes(status) && remainingUntriedKeys > 0;
}
