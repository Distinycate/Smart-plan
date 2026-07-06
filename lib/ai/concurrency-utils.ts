import { retryWithBackoff } from './ai-retry';

export interface TaskResult<T> {
  taskName: string;
  status: 'success' | 'failed' | 'fallback';
  durationMs: number;
  attemptCount: number;
  errorType?: string;
  data: T;
}

export async function runWithRetry<T>(
  taskName: string,
  fn: () => Promise<T>,
  fallbackData: T
): Promise<TaskResult<T>> {
  const startTime = Date.now();
  let attemptCount = 0;
  let finalErrorType: string | undefined = undefined;

  try {
    const envRetries = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_AI_RETRY_MAX : undefined;
    const envDelay = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_AI_RETRY_BASE_DELAY_MS : undefined;

    const data = await retryWithBackoff(
      async () => {
        attemptCount++;
        return await fn();
      },
      {
        maxRetries: Number(envRetries || '2'),
        baseDelayMs: Number(envDelay || '1500'),
        onRetry: (attempt, error, delay) => {
          finalErrorType = error?.message || 'unknown_error';
          console.warn(`[AI Task: ${taskName}] Attempt ${attempt} failed: ${finalErrorType}. Retrying in ${delay}ms...`);
        }
      }
    );

    return {
      taskName,
      status: 'success',
      durationMs: Date.now() - startTime,
      attemptCount,
      data
    };
  } catch (error: any) {
    finalErrorType = error?.message || 'unknown_error';
    console.error(`[AI Task: ${taskName}] Failed after ${attemptCount} attempts. Using fallback. Error:`, error);
    
    return {
      taskName,
      status: 'fallback',
      durationMs: Date.now() - startTime,
      attemptCount,
      errorType: finalErrorType,
      data: fallbackData
    };
  }
}

export async function runLimitedConcurrency<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent?: number
): Promise<PromiseSettledResult<T>[]> {
  const envConcurrent = typeof process !== 'undefined' && process.env ? process.env.NEXT_PUBLIC_AI_PHASE2_MAX_CONCURRENT : undefined;
  const actualMaxConcurrent = maxConcurrent ?? Number(envConcurrent || '2');

  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let currentIndex = 0;

  const executeWorker = async () => {
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex++;
      try {
        const result = await tasks[taskIndex]();
        results[taskIndex] = { status: 'fulfilled', value: result };
      } catch (error: any) {
        results[taskIndex] = { status: 'rejected', reason: error };
      }
    }
  };

  const workers = Array.from({ length: Math.min(actualMaxConcurrent, tasks.length) }, () => executeWorker());
  await Promise.all(workers);
  
  return results;
}

export const FALLBACK_TEMPLATES = {
  K: {
    measureK: 'ความรู้ความเข้าใจในเนื้อหาบทเรียน',
    methodK: 'การตรวจผลงาน/ทดสอบ',
    toolK: 'แบบประเมินผลงาน/แบบทดสอบ',
    criteriaK: 'ผ่านเกณฑ์ร้อยละ 60 ขึ้นไป',
    rubricK: '5 = ดีเยี่ยม: เข้าใจเนื้อหาครบถ้วน อธิบายได้ชัดเจน\n4 = ดีมาก: เข้าใจเนื้อหาเกือบครบถ้วน\n3 = ดี: เข้าใจเนื้อหาเป็นส่วนใหญ่\n2 = พอใช้: เข้าใจเนื้อหาบางส่วน\n1 = ปรับปรุง: ยังไม่เข้าใจเนื้อหา'
  },
  P: {
    measureP: 'ทักษะกระบวนการที่เกี่ยวข้อง',
    methodP: 'การสังเกตพฤติกรรม/ตรวจผลงาน',
    toolP: 'แบบประเมินทักษะ',
    criteriaP: 'ผ่านเกณฑ์ระดับ ดี ขึ้นไป',
    rubricP: '5 = ดีเยี่ยม: ปฏิบัติได้ถูกต้องคล่องแคล่ว\n4 = ดีมาก: ปฏิบัติได้ถูกต้องเป็นส่วนใหญ่\n3 = ดี: ปฏิบัติได้ถูกต้อง\n2 = พอใช้: ปฏิบัติได้บ้างแต่ต้องแนะนำ\n1 = ปรับปรุง: ไม่สามารถปฏิบัติได้'
  },
  A: {
    measureA: 'คุณลักษณะอันพึงประสงค์',
    methodA: 'การสังเกตพฤติกรรม',
    toolA: 'แบบสังเกตพฤติกรรม',
    criteriaA: 'ผ่านเกณฑ์ระดับ ดี ขึ้นไป',
    rubricA: '5 = ดีเยี่ยม: แสดงพฤติกรรมอย่างสม่ำเสมอ\n4 = ดีมาก: แสดงพฤติกรรมบ่อยครั้ง\n3 = ดี: แสดงพฤติกรรมบางครั้ง\n2 = พอใช้: แสดงพฤติกรรมน้อยครั้ง\n1 = ปรับปรุง: ไม่แสดงพฤติกรรม'
  },
  Reflection: {
    resultK: 'นักเรียนมีความเข้าใจในบทเรียน',
    resultP: 'นักเรียนสามารถปฏิบัติกิจกรรมได้ตามเป้าหมาย',
    resultA: 'นักเรียนมีส่วนร่วมและตั้งใจเรียน',
    problems: 'นักเรียนบางส่วนอาจทำกิจกรรมไม่ทันเวลา',
    solutions: 'ปรับเวลาและกระบวนการให้ยืดหยุ่นมากขึ้น'
  }
};

