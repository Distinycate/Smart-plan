import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'LESSON_PLAN_NOT_FOUND'
  | 'LESSON_PLAN_NOT_READY'
  | 'INVALID_EVALUATION_MODE'
  | 'SUPABASE_SELECT_FAILED'
  | 'SUPABASE_INSERT_FAILED'
  | 'SUPABASE_UPDATE_FAILED'
  | 'SUPABASE_RLS_BLOCKED'
  | 'AI_RATE_LIMIT'
  | 'AI_TIMEOUT'
  | 'AI_INVALID_JSON'
  | 'AI_API_ERROR'
  | 'JOB_NOT_FOUND'
  | 'JOB_PROCESS_FAILED'
  | 'RESULT_NOT_FOUND'
  | 'UNKNOWN_ERROR';

export interface ApiErrorOptions {
  status?: number;
  debugMessage?: string;
  retryable?: boolean;
  step?: string;
  metadata?: Record<string, unknown>;
}

export function ok<T>(data: T, message?: string) {
  return NextResponse.json({
    ok: true,
    data,
    ...(message ? { message } : {})
  }, { status: 200 });
}

export function fail(code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
  const status = options.status || (
    code === 'AUTH_REQUIRED' ? 401 :
    code.includes('NOT_FOUND') ? 404 :
    code.includes('INVALID') || code.includes('NOT_READY') ? 400 :
    500
  );

  return NextResponse.json({
    ok: false,
    error: {
      code,
      message,
      debugMessage: options.debugMessage,
      retryable: options.retryable ?? false,
      step: options.step,
      metadata: options.metadata
    }
  }, { status });
}
