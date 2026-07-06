type GeminiEnvironment = {
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
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
  // Route-specific key is deliberately first. A shared pool is fallback, not
  // an override, because old/disabled pool keys must not mask a valid route key.
  const values = [
    customApiKey,
    environment.GEMINI_API_KEYS,
    environment.GEMINI_API_KEY_PROCESS,
    environment.GEMINI_API_KEY_COMPLETION,
    environment.GEMINI_API_KEY_EVALUATE,
    environment.GEMINI_API_KEY_FIX,
    environment.GEMINI_API_KEY_ALIGNMENT,
    environment.GEMINI_API_KEY,
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
  return Math.max(1, Math.min(Math.max(requestedAttempts, keyCount), 8));
}

export function shouldRotateGeminiKey(status: number, remainingUntriedKeys: number) {
  return [401, 403, 429].includes(status) && remainingUntriedKeys > 0;
}
