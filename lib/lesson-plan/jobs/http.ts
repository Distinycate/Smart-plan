import { NextResponse } from 'next/server';
import { EvaluationJobError } from './server';

export function evaluationErrorResponse(error: unknown) {
  if (error instanceof EvaluationJobError) {
    return NextResponse.json({
      ok: false,
      errorCode: error.code,
      message: error.message,
      details: {},
      recoverable: error.recoverable,
    }, { status: error.httpStatus });
  }

  console.error('Quality evaluation API failed:', error);
  const realMessage = error instanceof Error 
    ? error.message 
    : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
  return NextResponse.json({
    ok: false,
    errorCode: 'E_INTERNAL_SERVER_ERROR',
    message: `เกิดข้อผิดพลาดภายในระบบ: ${realMessage}`,
    details: { realError: realMessage, errorStack: error instanceof Error ? error.stack : undefined },
    recoverable: false,
  }, { status: 500 });
}

export function invalidRequest(message: string, details: Record<string, unknown> = {}) {
  return NextResponse.json({
    ok: false,
    errorCode: 'E_VALIDATION_FAILED',
    message,
    details,
    recoverable: true,
  }, { status: 400 });
}
