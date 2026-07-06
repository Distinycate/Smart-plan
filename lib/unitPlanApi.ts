import { NextResponse } from 'next/server';

export function unitSuccess(data: unknown, message = 'สำเร็จ', warnings: string[] = []) {
  return NextResponse.json({ ok: true, data, message, warnings });
}

export function unitError(
  errorCode: string,
  message: string,
  status: number,
  details: Record<string, unknown> = {},
  recoverable = true
) {
  return NextResponse.json(
    { ok: false, errorCode, message, details, recoverable },
    { status }
  );
}

export const newEntityId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().split('-')[0].toUpperCase()}`;

