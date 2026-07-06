import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase';
import { createLessonPlanHash } from '../hash';
import { toCanonicalLessonPlan } from '../guards';
import type { EvaluationJobRecord } from './types';

export class EvaluationJobError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number,
    public readonly recoverable = httpStatus < 500
  ) {
    super(message);
    this.name = 'EvaluationJobError';
  }
}

export function qualityPlatformAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new EvaluationJobError(
      'E_SERVER_CONFIGURATION',
      'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Supabase service role',
      500,
      false
    );
  }
  return getSupabaseAdmin();
}

export async function getOwnedJob(
  jobId: string,
  userId: string
): Promise<EvaluationJobRecord> {
  const admin = qualityPlatformAdmin();
  const { data, error } = await admin
    .from('evaluation_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new EvaluationJobError(
      'E_DATABASE_READ',
      'ไม่สามารถอ่านข้อมูลงานประเมินได้',
      500
    );
  }
  if (!data) {
    throw new EvaluationJobError(
      'E_JOB_NOT_FOUND',
      'ไม่พบงานประเมิน หรือคุณไม่มีสิทธิ์เข้าถึง',
      404
    );
  }
  return data as EvaluationJobRecord;
}

export async function loadCanonicalPlan(job: EvaluationJobRecord) {
  const admin = qualityPlatformAdmin();
  const { data, error } = await admin
    .from('LessonPlans')
    .select('*')
    .eq('planId', job.lesson_plan_id)
    .maybeSingle();
  if (error || !data) {
    throw new EvaluationJobError(
      'E_LESSON_PLAN_NOT_FOUND',
      'ไม่พบแผนการสอนสำหรับงานประเมินนี้',
      404
    );
  }

  const plan = toCanonicalLessonPlan(data);
  if (createLessonPlanHash(plan) !== job.lesson_plan_hash) {
    throw new EvaluationJobError(
      'E_LESSON_PLAN_CHANGED',
      'แผนการสอนถูกแก้ไขหลังสร้างงาน กรุณาสร้างงานประเมินใหม่',
      409
    );
  }
  return plan;
}

export function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'unknown error';
  return message.slice(0, 1_000);
}
