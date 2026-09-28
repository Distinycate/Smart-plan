import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/authorization';

export const CANONICAL_AI_ROUTE_KINDS = [
  'process-core',
  'process-activity',
  'completion-k',
  'completion-p',
  'completion-a',
  'completion-reflection',
] as const;

export type CanonicalAiRouteKind = (typeof CANONICAL_AI_ROUTE_KINDS)[number];
export type CanonicalAiPayload = {
  gradeLevel: string;
  subjectName: string;
  lessonTopic: string;
  learningArea?: string;
  totalHours?: string | number;
  learningStandard?: string;
  indicatorDuring?: string;
  indicatorFinal?: string;
  availableMedia?: string;
  availableSources?: string;
  availableTasks?: string;
  objectiveK?: string;
  objectiveP?: string;
  objectiveA?: string;
  learningProcess?: string;
  essentialConcept?: string;
  learningContent?: string;
  competencies?: string;
  desiredAttributes?: string;
  skills21?: string;
  tasks?: string;
  learningMedia?: string;
  learningSources?: string;
} & Record<string, unknown>;

const MAX_CANONICAL_AI_BODY_BYTES = 48 * 1024;
const DEFAULT_GLOBAL_CONCURRENCY = 6;
const DEFAULT_PER_USER_CONCURRENCY = 2;
const DEFAULT_LEASE_SECONDS = 75;

export class CanonicalAiBoundaryError extends Error {
  constructor(
    public readonly code:
      | 'E_PERMISSION_DENIED'
      | 'E_INVALID_JSON'
      | 'E_AI_PAYLOAD_TOO_LARGE'
      | 'E_AI_PAYLOAD_INVALID'
      | 'E_AI_BUSY'
      | 'E_AI_ADMISSION_UNAVAILABLE',
    message: string,
    public readonly httpStatus: 400 | 401 | 413 | 429 | 503,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'CanonicalAiBoundaryError';
  }
}

export type CanonicalAiRequestContext = {
  payload: CanonicalAiPayload;
  userId: string;
  complete: (outcome: 'complete' | 'failed') => Promise<void>;
};

/**
 * Interface intentionally remains provider-shaped so a managed distributed rate
 * limiter can be introduced later without changing the canonical AI routes.
 * The current implementation is database-backed concurrency admission, not a
 * per-minute rate-limit claim.
 */
export interface CanonicalAiAdmissionProvider {
  admit(input: {
    userId: string;
    requestKind: CanonicalAiRouteKind;
  }): Promise<{ jobId: string; complete: CanonicalAiRequestContext['complete'] }>;
}

function boundedEnvironmentInteger(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

function validateText(payload: Record<string, unknown>, field: string, maximumLength: number, required = false) {
  const value = payload[field];
  if (value === undefined || value === null) {
    if (required) {
      throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_INVALID', `กรุณาระบุ ${field}`, 400);
    }
    return;
  }
  if (typeof value !== 'string') {
    throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_INVALID', `${field} ต้องเป็นข้อความ`, 400);
  }
  if (required && !value.trim()) {
    throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_INVALID', `กรุณาระบุ ${field}`, 400);
  }
  if (value.length > maximumLength) {
    throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_INVALID', `${field} ยาวเกินขนาดที่ระบบรองรับ`, 400);
  }
}

function validatePayload(payload: Record<string, unknown>, requestKind: CanonicalAiRouteKind): asserts payload is CanonicalAiPayload {
  validateText(payload, 'gradeLevel', 100, true);
  validateText(payload, 'subjectName', 250, true);
  validateText(payload, 'lessonTopic', 500, true);
  validateText(payload, 'learningArea', 250);
  validateText(payload, 'learningStandard', 12_000);
  validateText(payload, 'indicatorDuring', 12_000);
  validateText(payload, 'indicatorFinal', 12_000);
  validateText(payload, 'availableMedia', 8_000);
  validateText(payload, 'availableSources', 8_000);
  validateText(payload, 'availableTasks', 8_000);
  validateText(payload, 'objectiveK', 8_000);
  validateText(payload, 'objectiveP', 8_000);
  validateText(payload, 'objectiveA', 8_000);
  validateText(payload, 'learningProcess', 20_000, requestKind.startsWith('completion-'));
  validateText(payload, 'essentialConcept', 12_000);
  validateText(payload, 'learningContent', 12_000);
  validateText(payload, 'competencies', 8_000);
  validateText(payload, 'desiredAttributes', 8_000);
  validateText(payload, 'skills21', 8_000);
  validateText(payload, 'tasks', 8_000);
  validateText(payload, 'learningMedia', 8_000);
  validateText(payload, 'learningSources', 8_000);

  const totalHours = payload.totalHours;
  if (totalHours !== undefined && totalHours !== null) {
    const numericHours = Number(totalHours);
    if (!Number.isFinite(numericHours) || numericHours < 0 || numericHours > 1_000) {
      throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_INVALID', 'totalHours ไม่ถูกต้อง', 400);
    }
  }
}

async function readPayload(req: NextRequest): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers.get('content-length') || '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CANONICAL_AI_BODY_BYTES) {
    throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_TOO_LARGE', 'ข้อมูลคำขอ AI มีขนาดใหญ่เกินไป', 413);
  }

  const buffer = await req.arrayBuffer();
  if (buffer.byteLength > MAX_CANONICAL_AI_BODY_BYTES) {
    throw new CanonicalAiBoundaryError('E_AI_PAYLOAD_TOO_LARGE', 'ข้อมูลคำขอ AI มีขนาดใหญ่เกินไป', 413);
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(buffer));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('payload must be an object');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new CanonicalAiBoundaryError('E_INVALID_JSON', 'รูปแบบ JSON ไม่ถูกต้อง', 400);
  }
}

const databaseAdmissionProvider: CanonicalAiAdmissionProvider = {
  async admit({ userId, requestKind }) {
    const globalLimit = boundedEnvironmentInteger(
      'AI_GLOBAL_CONCURRENCY_LIMIT',
      DEFAULT_GLOBAL_CONCURRENCY,
      1,
      50,
    );
    const perUserLimit = boundedEnvironmentInteger(
      'AI_PER_USER_CONCURRENCY_LIMIT',
      DEFAULT_PER_USER_CONCURRENCY,
      1,
      10,
    );
    const leaseSeconds = boundedEnvironmentInteger(
      'AI_ADMISSION_LEASE_SECONDS',
      DEFAULT_LEASE_SECONDS,
      30,
      120,
    );

    const { data: rawData, error } = await supabaseAdmin.rpc('admit_canonical_ai_request', {
      p_user_id: userId,
      p_request_kind: requestKind,
      p_global_limit: globalLimit,
      p_per_user_limit: perUserLimit,
      p_lease_seconds: leaseSeconds,
    }).maybeSingle();
    const data = rawData as {
      job_id: string | null;
      admission_status: string;
      retry_after_seconds: number | null;
    } | null;

    if (error || !data || data.admission_status !== 'admitted' || !data.job_id) {
      if (data?.admission_status === 'user_limit_reached' || data?.admission_status === 'global_limit_reached') {
        throw new CanonicalAiBoundaryError(
          'E_AI_BUSY',
          'ระบบ AI กำลังประมวลผลคำขออยู่ กรุณาลองใหม่อีกครั้ง',
          429,
          Number(data.retry_after_seconds || 5),
        );
      }
      console.error('Canonical AI admission unavailable:', error?.message || 'unexpected response');
      throw new CanonicalAiBoundaryError(
        'E_AI_ADMISSION_UNAVAILABLE',
        'ระบบคิว AI ยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง',
        503,
      );
    }

    const jobId = String(data.job_id);
    let completed = false;
    return {
      jobId,
      complete: async (outcome) => {
        if (completed) return;
        completed = true;
        const { error: completeError } = await supabaseAdmin
          .from('ai_jobs')
          .update({
            status: outcome,
            updated_at: new Date().toISOString(),
            lease_expires_at: null,
            error_code: outcome === 'failed' ? 'E_AI_REQUEST_FAILED' : null,
          })
          .eq('job_id', jobId)
          .eq('user_id', userId);
        if (completeError) {
          // The lease eventually expires, so a completion-log failure must not
          // turn an already-generated teacher response into a false failure.
          console.error('Canonical AI admission completion failed:', completeError.message);
        }
      },
    };
  },
};

export async function beginCanonicalAiRequest(
  req: NextRequest,
  requestKind: CanonicalAiRouteKind,
  provider: CanonicalAiAdmissionProvider = databaseAdmissionProvider,
): Promise<CanonicalAiRequestContext> {
  let userId: string;
  try {
    const context = await requireUser();
    userId = context.user.id;
  } catch {
    throw new CanonicalAiBoundaryError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบก่อนใช้ AI', 401);
  }

  const payload = await readPayload(req);
  validatePayload(payload, requestKind);
  const admission = await provider.admit({ userId, requestKind });

  return {
    payload,
    userId,
    complete: admission.complete,
  };
}

export function isCanonicalAiBoundaryError(error: unknown): error is CanonicalAiBoundaryError {
  return error instanceof CanonicalAiBoundaryError;
}
