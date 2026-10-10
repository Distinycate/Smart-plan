import { supabase } from './supabase';

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

let cachedDbKeys: { primary?: string; free?: string } | null = null;
let lastDbFetch = 0;

export async function fetchDbGeminiKeys(): Promise<{ primary?: string; free?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
    return cachedDbKeys || {};
  }
  const now = Date.now();
  if (cachedDbKeys && (now - lastDbFetch < 120_000)) {
    return cachedDbKeys;
  }
  try {
    const { data } = await supabase
      .from('AppConfig')
      .select('configKey, configValue')
      .in('configKey', ['GEMINI_API_KEY', 'GEMINI_FREE_API_KEY', 'GEMINI_PAID_API_KEY'])
      .eq('isActive', true);

    if (data && data.length > 0) {
      const map: Record<string, string> = {};
      data.forEach((item: any) => {
        map[item.configKey] = item.configValue;
      });
      cachedDbKeys = {
        primary: map.GEMINI_PAID_API_KEY || map.GEMINI_API_KEY,
        free: map.GEMINI_FREE_API_KEY,
      };
      lastDbFetch = now;
      return cachedDbKeys;
    }
  } catch (err) {
    console.warn('[geminiKeyPool] Could not query AppConfig from Supabase:', err);
  }
  return cachedDbKeys || {};
}

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
