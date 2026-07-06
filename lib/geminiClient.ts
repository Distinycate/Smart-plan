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

export async function fetchGeminiWithRetry(
  apiUrl: string,
  payload: unknown,
  requestedMaxAttempts = 3,
  customApiKey?: string
) {
  const apiKeys = buildGeminiKeyPool(customApiKey);

  if (apiKeys.length === 0) {
    throw new Error('API Key is not configured.');
  }

  // Reserve enough time for JSON parsing and the route response before
  // Vercel's 60-second hard limit.
  const maxAttempts = geminiAttemptLimit(requestedMaxAttempts, apiKeys.length);
  const deadline = Date.now() + 46_000;
  let lastStatus = 0;
  const rejectedKeyIndexes = new Set<number>();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 2_500) break;

    const keyIndex = attempt % apiKeys.length;
    const currentKey = apiKeys[keyIndex];
    const baseUrl = apiUrl.split('?')[0];
    const finalUrl = `${baseUrl}?key=${encodeURIComponent(currentKey)}`;
    const controller = new AbortController();
    const attemptTimeoutMs = Math.max(3_000, Math.min(22_000, remainingMs - 2_000));
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
        `[Gemini API] status=${response.status} attempt=${attempt + 1}/${maxAttempts} keySlot=${keyIndex + 1}/${apiKeys.length}`
      );

      if ([401, 403, 429].includes(response.status)) {
        rejectedKeyIndexes.add(keyIndex);
      }
      const remainingUntriedKeys = apiKeys.length - rejectedKeyIndexes.size;
      const rotateKey = shouldRotateGeminiKey(response.status, remainingUntriedKeys);
      const retryable = rotateKey || [500, 503].includes(response.status);
      const hasAnotherAttempt = attempt + 1 < maxAttempts && deadline - Date.now() > 2_500;
      if (!retryable || !hasAnotherAttempt) {
        throw new Error(friendlyHttpError(response.status));
      }

      const delay = rotateKey
        ? 100 + Math.random() * 150
        : 1_000 + Math.random() * 1_000;
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error?.message && (
        error.message.includes('กรุณา') ||
        error.message.includes('API Key')
      )) {
        throw error;
      }

      const hasAnotherAttempt = attempt + 1 < maxAttempts && deadline - Date.now() > 2_500;
      if (!hasAnotherAttempt) {
        if (error?.name === 'AbortError') {
          throw new Error('การประมวลผล AI ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
        }
        throw new Error('ไม่สามารถเชื่อมต่อบริการ AI ได้ กรุณาลองใหม่อีกครั้ง');
      }

      await new Promise(resolve => setTimeout(resolve, 750 + Math.random() * 750));
    }
  }

  throw new Error(lastStatus
    ? friendlyHttpError(lastStatus)
    : 'การประมวลผล AI ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
}
