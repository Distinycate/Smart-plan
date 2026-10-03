import {
  buildGeminiKeyPool,
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
 * Google maintains independent rate-limit quotas for 2.5-flash, 2.5-flash-lite, and 1.5-flash.
 */
function resolveTieredModelUrl(baseUrl: string, attempt: number): string {
  if (attempt === 0) return baseUrl;

  // On retry attempt 1: if primary was 2.5-flash, pivot to 2.5-flash-lite
  if (baseUrl.includes('gemini-2.5-flash') && !baseUrl.includes('gemini-2.5-flash-lite')) {
    return baseUrl.replace('/gemini-2.5-flash:', '/gemini-2.5-flash-lite:');
  }

  // On retry attempt 2+: pivot to gemini-1.5-flash (highest throughput capacity)
  if (baseUrl.includes('gemini-2.5-flash') || baseUrl.includes('gemini-2.5-flash-lite')) {
    return baseUrl
      .replace('/gemini-2.5-flash-lite:', '/gemini-1.5-flash:')
      .replace('/gemini-2.5-flash:', '/gemini-1.5-flash:');
  }

  return baseUrl;
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
  const apiKeys = buildGeminiKeyPool(customApiKey, {
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS,
    GEMINI_API_KEY_PROCESS: process.env.GEMINI_API_KEY_PROCESS,
    GEMINI_API_KEY_COMPLETION: process.env.GEMINI_API_KEY_COMPLETION,
    GEMINI_API_KEY_EVALUATE: process.env.GEMINI_API_KEY_EVALUATE,
    GEMINI_API_KEY_FIX: process.env.GEMINI_API_KEY_FIX,
    GEMINI_API_KEY_ALIGNMENT: process.env.GEMINI_API_KEY_ALIGNMENT,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
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

  // Distributed Start Index: Combines caller keyAffinity with globalAtomicCounter to interleave
  // concurrent users across all available keys (essential for 10-20 concurrent users).
  const affinityHash = keyAffinity
    ? Array.from(keyAffinity).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0)
    : 0;
  const globalOffset = (globalRequestCounter++) >>> 0;
  const baseStartIndex = (affinityHash + globalOffset) % apiKeys.length;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 1_500) break;

    const keyIndex = (baseStartIndex + attempt) % apiKeys.length;
    const currentKey = apiKeys[keyIndex];
    const baseUrl = apiUrl.split('?')[0];

    // Multi-tier model failover: If attempt > 0, pivot to flash-lite or 1.5-flash
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

      if ([401, 403, 429].includes(response.status)) {
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
