import type { LessonPlan } from '../schema';
import { createLessonPlanHash } from '../hash';
import type {
  LessonPlanPatch,
  PatchApplyResult,
  PatchBundle,
  PatchOperation,
} from './patch-schema';

// ─── Deep clone ───────────────────────────────────────────────────────────────
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── Path accessor ────────────────────────────────────────────────────────────
function getNestedValue(obj: unknown, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string[],
  value: unknown,
): void {
  const last = path[path.length - 1];
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (current[key] == null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[last] = value;
}

// ─── Individual operation appliers ────────────────────────────────────────────
function applySet(
  plan: Record<string, unknown>,
  patch: LessonPlanPatch,
): string | null {
  setNestedValue(plan, patch.path, patch.after);
  return null;
}

function applyAppend(
  plan: Record<string, unknown>,
  patch: LessonPlanPatch,
): string | null {
  const current = getNestedValue(plan, patch.path);
  if (!Array.isArray(current)) {
    // Auto-create as array
    setNestedValue(plan, patch.path, [patch.after]);
  } else {
    setNestedValue(plan, patch.path, [...current, patch.after]);
  }
  return null;
}

function applyReplaceItem(
  plan: Record<string, unknown>,
  patch: LessonPlanPatch,
): string | null {
  const index = patch.index;
  if (index == null) return 'replace_item patch ต้องระบุ index';
  const current = getNestedValue(plan, patch.path);
  if (!Array.isArray(current)) return 'target path ไม่ใช่ array';
  if (index < 0 || index >= current.length) return `index ${index} เกินขอบเขต array`;
  const newArr = [...current];
  newArr[index] = patch.after;
  setNestedValue(plan, patch.path, newArr);
  return null;
}

function applyRemoveItem(
  plan: Record<string, unknown>,
  patch: LessonPlanPatch,
): string | null {
  const index = patch.index;
  if (index == null) return 'remove_item patch ต้องระบุ index';
  const current = getNestedValue(plan, patch.path);
  if (!Array.isArray(current)) return 'target path ไม่ใช่ array';
  if (index < 0 || index >= current.length) return `index ${index} เกินขอบเขต array`;
  const newArr = [...current.slice(0, index), ...current.slice(index + 1)];
  setNestedValue(plan, patch.path, newArr);
  return null;
}

const OPERATION_MAP: Record<
  PatchOperation,
  (plan: Record<string, unknown>, patch: LessonPlanPatch) => string | null
> = {
  set: applySet,
  append: applyAppend,
  replace_item: applyReplaceItem,
  remove_item: applyRemoveItem,
};

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Apply a PatchBundle to a LessonPlan immutably.
 *
 * - If ALL patches succeed → returns the patched plan and new hash.
 * - If a patch errors → it is recorded in `skipped`, the rest continue.
 * - The original plan is never mutated.
 */
export function applyPatchBundle(
  plan: LessonPlan,
  bundle: PatchBundle,
): { patchedPlan: LessonPlan; result: PatchApplyResult } {
  // Work on a deep clone — never mutate the original
  const working = deepClone(plan) as unknown as Record<string, unknown>;
  const applied: LessonPlanPatch[] = [];
  const skipped: PatchApplyResult['skipped'] = [];

  for (const patch of bundle.patches) {
    const applyFn = OPERATION_MAP[patch.operation];
    if (!applyFn) {
      skipped.push({ patch, reason: `operation "${patch.operation}" ไม่รองรับ` });
      continue;
    }
    try {
      const error = applyFn(working, patch);
      if (error) {
        skipped.push({ patch, reason: error });
      } else {
        applied.push(patch);
      }
    } catch (err) {
      skipped.push({
        patch,
        reason: err instanceof Error ? err.message : 'unknown error during apply',
      });
    }
  }

  const patchedPlan = working as unknown as LessonPlan;
  const hashAfter = createLessonPlanHash(patchedPlan);

  return {
    patchedPlan,
    result: { applied, skipped, hashAfter },
  };
}
