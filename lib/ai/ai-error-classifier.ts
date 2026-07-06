export type AIErrorType = 'rate_limit' | 'timeout' | 'invalid_json' | 'api_error' | 'unknown_error';

export interface ClassifiedError {
  type: AIErrorType;
  message: string;
}

export function classifyAIError(error: any): AIErrorType {
  if (!error) return 'unknown_error';

  const message = (error.message || '').toLowerCase();
  
  // Rate limit / Quota check
  if (message.includes('429') || message.includes('quota') || message.includes('rate limit') || message.includes('too many requests')) {
    return 'rate_limit';
  }

  // Timeout check
  if (message.includes('timeout') || message.includes('deadline') || message.includes('aborted') || error.name === 'AbortError') {
    return 'timeout';
  }

  // JSON parse error check
  if (message.includes('json') || message.includes('parse') || error.name === 'SyntaxError') {
    return 'invalid_json';
  }

  // API error (HTTP 500, 503, bad gateways, generic fetch failure)
  if (message.includes('500') || message.includes('503') || message.includes('502') || message.includes('504') || message.includes('api error') || message.includes('fetch failed')) {
    return 'api_error';
  }

  return 'unknown_error';
}

export function isRateLimitError(error: any): boolean {
  return classifyAIError(error) === 'rate_limit';
}
