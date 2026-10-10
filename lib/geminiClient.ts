import {
  buildGeminiKeyPool,
  fetchDbGeminiKeys,
  geminiAttemptLimit,
  shouldRotateGeminiKey,
} from './geminiKeyPool';

const friendlyHttpError = (status: number) => {
  if (status === 400) return 'ข้อมูลคำสั่งที่ส่งไปยัง AI ไม่ถูกต้อง กรุณาตรวจสอบข้อมูลแล้วลองใหม่';
  if (status === 401) return 'รหัส API Key ไม่ถูกต้องหรือหมดอายุ กรุณาแจ้งผู้ดูแลระบบ';
  if (status === 403) return 'ระบบปฏิเสธการเข้าถึง AI กรุณาแจ้งผู้ดูแลระบบ';
  if (status === 404) return 'ไม่พบโมเดล AI ที่กำหนด กรุณาแจ้งผู้ดูแลระบบ';
  if (status === 429) return 'ขณะนี้คิว AI เต็มหรือโควตาถูกใช้ครบ กรุณารอสักครู่แล้วลองใหม่';
  if (status === 503) return 'บริการ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง';
  return `บริการ AI ขัดข้องชั่วคราว (Status ${status})`;
};

// Global round-robin atomic counter to interleave concurrent requests evenly
let globalRequestCounter = Math.floor(Math.random() * 1000);

/**
 * Resolves alternative model URL to tap into separate quota pools on retries.
 * Automatically normalizes legacy model names to current aliases supported by all API keys.
 */
function resolveTieredModelUrl(baseUrl: string, attempt: number): string {
  const normalized = baseUrl
    .replace('/gemini-2.5-flash-lite:', '/gemini-flash-lite-latest:')
    .replace('/gemini-2.5-flash:', '/gemini-flash-latest:')
    .replace('/gemini-1.5-flash:', '/gemini-flash-latest:')
    .replace('/gemini-1.5-pro:', '/gemini-pro-latest:');

  if (attempt === 0) return normalized;

  // On retry attempt 1+: alternate between flash and flash-lite capacity pools
  if (normalized.includes('gemini-flash-latest')) {
    return normalized.replace('/gemini-flash-latest:', '/gemini-flash-lite-latest:');
  }
  if (normalized.includes('gemini-flash-lite-latest')) {
    return normalized.replace('/gemini-flash-lite-latest:', '/gemini-flash-latest:');
  }

  return normalized;
}

/**
 * Groq Ultra-Fast Emergency Fallback:
 * If Gemini key quota is saturated (429) or unavailable, Groq Llama 3.3 executes
 * in ~400ms and returns an emulated Gemini response format transparently.
 */
async function tryGroqFallback(payload: any, timeoutMs: number = 5500): Promise<Response | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const systemText = payload?.systemInstruction?.parts?.[0]?.text || '';
    const userText = payload?.contents?.[0]?.parts?.[0]?.text || '';
    if (!userText) return null;

    const messages: any[] = [];
    if (systemText) messages.push({ role: 'system', content: systemText });
    messages.push({ role: 'user', content: userText });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 6000));

    const wantsJson =
      payload?.generationConfig?.responseMimeType === 'application/json' ||
      userText.toLowerCase().includes('json') ||
      systemText.toLowerCase().includes('json');

    const groqBody: any = {
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: payload?.generationConfig?.temperature ?? 0.2,
      max_tokens: Math.min(payload?.generationConfig?.maxOutputTokens ?? 4096, 4096),
    };

    if (wantsJson) {
      if (!userText.toLowerCase().includes('json') && !systemText.toLowerCase().includes('json')) {
        messages[messages.length - 1].content += '\n(Return valid JSON format only)';
      }
      groqBody.response_format = { type: 'json_object' };
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify(groqBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (groqRes.ok) {
      const groqJson = await groqRes.json();
      const content = groqJson.choices?.[0]?.message?.content;
      if (content) {
        console.log('[AI Router] Successfully utilized Groq high-speed fallback for concurrency.');
        const emulatedGemini = {
          candidates: [
            {
              content: {
                parts: [{ text: content }],
                role: 'model',
              },
            },
          ],
        };
        return new Response(JSON.stringify(emulatedGemini), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  } catch (groqErr) {
    console.warn('[AI Router] Groq fallback error:', groqErr);
  }
  return null;
}

export async function fetchGeminiWithRetry(
  apiUrl: string,
  payload: any,
  requestedMaxAttempts: number = 3,
  customApiKey?: string,
  keyAffinity: string = '',
  timeoutMs: number = 28_000
) {
  const dbKeys = await fetchDbGeminiKeys();
  const apiKeys = buildGeminiKeyPool(customApiKey, {
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS,
    GEMINI_PAID_API_KEY: process.env.GEMINI_PAID_API_KEY || dbKeys.primary,
    GEMINI_FREE_API_KEY: process.env.GEMINI_FREE_API_KEY || dbKeys.free,
    GEMINI_API_KEY_PROCESS: process.env.GEMINI_API_KEY_PROCESS,
    GEMINI_API_KEY_COMPLETION: process.env.GEMINI_API_KEY_COMPLETION,
    GEMINI_API_KEY_EVALUATE: process.env.GEMINI_API_KEY_EVALUATE,
    GEMINI_API_KEY_FIX: process.env.GEMINI_API_KEY_FIX,
    GEMINI_API_KEY_ALIGNMENT: process.env.GEMINI_API_KEY_ALIGNMENT,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || dbKeys.primary,
  });

  if (apiKeys.length === 0) {
    // If no Gemini key is configured, check if Groq is available immediately
    const groqFallback = await tryGroqFallback(payload, timeoutMs);
    if (groqFallback) return groqFallback;
    throw new Error('API Key is not configured.');
  }

  const maxAttempts = geminiAttemptLimit(requestedMaxAttempts, apiKeys.length);
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  const rejectedKeyIndexes = new Set<number>();
  // Always start with the highest priority key (key 0 / primary paid key).
  // If exhausted or quota exceeded (401, 402, 403, 429), failover to subsequent fallback keys (free key).
  // Once credits are topped up, subsequent requests automatically start from key 0 again.
  const startIndex = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 1_500) break;

    const keyIndex = (startIndex + attempt) % apiKeys.length;
    const currentKey = apiKeys[keyIndex];
    const baseUrl = apiUrl.split('?')[0];

    // Multi-tier model failover: Automatically normalizes aliases and pivots between flash and flash-lite
    const attemptBaseUrl = resolveTieredModelUrl(baseUrl, attempt);
    const finalUrl = `${attemptBaseUrl}?key=${encodeURIComponent(currentKey)}`;

    const controller = new AbortController();
    // Cap attempt timeout between 2.5s and 8s so requests fail-fast and pivot rather than hanging
    const attemptTimeoutMs = Math.max(2_500, Math.min(8_000, remainingMs - 500));
    const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);

    try {
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) return response;

      lastStatus = response.status;
      await response.text();
      console.warn(
        `[Gemini API] status=${response.status} attempt=${attempt + 1}/${maxAttempts} model=${attemptBaseUrl.split('/').pop()} keySlot=${keyIndex + 1}/${apiKeys.length}`
      );

      if ([401, 402, 403, 429].includes(response.status)) {
        rejectedKeyIndexes.add(keyIndex);
      }
      const remainingUntriedKeys = apiKeys.length - rejectedKeyIndexes.size;
      const rotateKey = shouldRotateGeminiKey(response.status, remainingUntriedKeys);
      const retryable = rotateKey || [429, 500, 503].includes(response.status);
      const hasAnotherAttempt = attempt + 1 < maxAttempts && deadline - Date.now() > 1_500;

      if (!retryable || !hasAnotherAttempt) {
        break;
      }

      // Short randomized backoff to avoid thundering-herd effect
      const delay = rotateKey ? (60 + Math.random() * 150) : (350 + Math.random() * 450);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error?.message && (error.message.includes('กรุณา') || error.message.includes('API Key'))) {
        throw error;
      }

      const hasAnotherAttempt = attempt + 1 < maxAttempts && deadline - Date.now() > 1_500;
      if (!hasAnotherAttempt) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 350));
    }
  }

  // ─── Emergency Groq Failover ──────────────────────────────────────────────
  // If Gemini pool was saturated (e.g. 10-20 concurrent requests hit 429), try Groq immediately
  const remainingTimeForFallback = deadline - Date.now();
  if (remainingTimeForFallback > 1_200) {
    const groqFallback = await tryGroqFallback(payload, remainingTimeForFallback);
    if (groqFallback) return groqFallback;
  }

  throw new Error(lastStatus
    ? friendlyHttpError(lastStatus)
    : 'การประมวลผล AI ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
}
