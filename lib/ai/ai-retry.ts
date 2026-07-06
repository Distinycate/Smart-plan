import { classifyAIError } from './ai-error-classifier';

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: any, delay: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? Number(process.env.AI_RETRY_MAX ?? '3');
  const baseDelayMs = options.baseDelayMs ?? Number(process.env.AI_RETRY_BASE_DELAY_MS ?? '2000');

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const errorType = classifyAIError(error);

      // Only retry on rate limits, timeouts, and transient API failures (like 503)
      const isRetryable = errorType === 'rate_limit' || errorType === 'timeout' || errorType === 'api_error';

      if (!isRetryable || attempt > maxRetries) {
        throw error;
      }

      // Calculate exponential delay: baseDelayMs * 2^(attempt - 1)
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      
      if (options.onRetry) {
        options.onRetry(attempt, error, delay);
      } else {
        console.warn(`[AI Retry] Attempt ${attempt}/${maxRetries} failed with ${errorType}. Retrying in ${delay}ms...`);
      }

      await sleep(delay);
    }
  }
}
