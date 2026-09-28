import type { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

export type ApplicationRole = 'user' | 'admin';

export type AuthorizationContext = {
  supabase: ReturnType<typeof createClient>;
  user: User;
  role: ApplicationRole;
};

export class AuthorizationError extends Error {
  constructor(
    public readonly code: 'E_PERMISSION_DENIED' | 'E_RESOURCE_NOT_FOUND',
    message: string,
    public readonly httpStatus: 401 | 403 | 404,
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

function requireIdentifier(value: string, label: string) {
  const identifier = value.trim();
  if (!identifier) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', `ไม่พบ${label}`, 404);
  }
  return identifier;
}

async function getRole(supabase: ReturnType<typeof createClient>, userId: string): Promise<ApplicationRole> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new AuthorizationError('E_PERMISSION_DENIED', 'ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้', 403);
  }

  return data?.role === 'admin' ? 'admin' : 'user';
}

/**
 * Canonical server-side identity boundary. Never derive identity from request
 * body, query strings, localStorage, or an unverified client-provided userId.
 */
export async function requireUser(): Promise<AuthorizationContext> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthorizationError('E_PERMISSION_DENIED', 'กรุณาเข้าสู่ระบบก่อน', 401);
  }

  return {
    supabase,
    user,
    role: await getRole(supabase, user.id),
  };
}

export async function requireAdmin(): Promise<AuthorizationContext> {
  const context = await requireUser();
  if (context.role !== 'admin') {
    throw new AuthorizationError('E_PERMISSION_DENIED', 'คุณไม่มีสิทธิ์ผู้ดูแลระบบ', 403);
  }
  return context;
}

/** Read contract: an administrator may inspect another teacher's plan, but not mutate it. */
export async function requirePlanReader(planId: string): Promise<AuthorizationContext & { plan: Record<string, unknown> }> {
  const context = await requireUser();
  const id = requireIdentifier(planId, 'แผนการสอน');
  const { data, error } = await context.supabase
    .from('LessonPlans')
    .select('*')
    .eq('planId', id)
    .maybeSingle();

  if (error || !data) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
  }
  if (data.user_id !== context.user.id && context.role !== 'admin') {
    throw new AuthorizationError('E_PERMISSION_DENIED', 'คุณไม่มีสิทธิ์เข้าถึงแผนการสอนนี้', 403);
  }

  return { ...context, plan: data };
}

/** Write/export/archive/restore contract: only the teacher who owns the plan may act. */
export async function requirePlanOwner(planId: string): Promise<AuthorizationContext & { plan: Record<string, unknown> }> {
  const context = await requirePlanReader(planId);
  if (context.plan.user_id !== context.user.id) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์ดำเนินการ', 404);
  }
  return context;
}

/** Unit plans intentionally remain owner-only until a reviewer/admin policy exists. */
export async function requireUnitPlanOwner(unitPlanId: string): Promise<AuthorizationContext & { unitPlan: Record<string, unknown> }> {
  const context = await requireUser();
  const id = requireIdentifier(unitPlanId, 'แผนระดับหน่วย');
  const { data, error } = await context.supabase
    .from('UnitPlans')
    .select('*')
    .eq('unitPlanId', id)
    .maybeSingle();

  if (error || !data) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', 'ไม่พบแผนระดับหน่วย หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
  }
  if (data.user_id !== context.user.id) {
    throw new AuthorizationError('E_PERMISSION_DENIED', 'คุณไม่มีสิทธิ์เข้าถึงแผนระดับหน่วยนี้', 403);
  }

  return { ...context, unitPlan: data };
}

/**
 * Child ownership derives from the parent UnitPlan. The URL parent ID must match
 * the child's actual foreign key; neither client-supplied ID is authoritative.
 */
export async function requireUnitLessonOwner(
  unitPlanId: string,
  unitLessonId: string,
): Promise<AuthorizationContext & { unitPlan: Record<string, unknown>; lesson: Record<string, unknown> }> {
  const context = await requireUnitPlanOwner(unitPlanId);
  const childId = requireIdentifier(unitLessonId, 'แผนรายคาบในหน่วย');
  const { data, error } = await context.supabase
    .from('UnitLessons')
    .select('*')
    .eq('unitLessonId', childId)
    .maybeSingle();

  if (error || !data || data.unitPlanId !== context.unitPlan.unitPlanId || data.user_id !== context.user.id) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', 'ไม่พบแผนรายคาบ หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
  }

  return { ...context, lesson: data };
}

/**
 * These resources are owner-only by design. A future reviewer role must add an
 * explicit RLS policy and contract before this helper is widened.
 */
export async function requireEvaluationOwner(jobId: string): Promise<AuthorizationContext & { evaluation: Record<string, unknown> }> {
  const context = await requireUser();
  const id = requireIdentifier(jobId, 'งานประเมิน');
  const { data, error } = await context.supabase
    .from('evaluation_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();

  if (error || !data) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', 'ไม่พบงานประเมิน หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
  }
  return { ...context, evaluation: data };
}

export async function requirePatchOwner(patchJobId: string): Promise<AuthorizationContext & { patchJob: Record<string, unknown> }> {
  const context = await requireUser();
  const id = requireIdentifier(patchJobId, 'งานข้อเสนอปรับปรุง');
  const { data, error } = await context.supabase
    .from('patch_jobs')
    .select('*')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();

  if (error || !data) {
    throw new AuthorizationError('E_RESOURCE_NOT_FOUND', 'ไม่พบงานข้อเสนอปรับปรุง หรือคุณไม่มีสิทธิ์เข้าถึง', 404);
  }
  return { ...context, patchJob: data };
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}
