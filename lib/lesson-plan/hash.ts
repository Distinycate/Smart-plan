import { createHash } from 'node:crypto';
import type { LessonPlan } from './schema';

type JsonCompatible =
  | null
  | boolean
  | number
  | string
  | JsonCompatible[]
  | { [key: string]: JsonCompatible };

const sortValue = (value: unknown): JsonCompatible => {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(sortValue);

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, JsonCompatible>>((result, key) => {
        const item = record[key];
        if (item !== undefined) result[key] = sortValue(item);
        return result;
      }, {});
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean' || typeof value === 'string') return value;
  return String(value ?? '');
};

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function createLessonPlanHash(plan: LessonPlan): string {
  return createHash('sha256')
    .update(stableStringify(plan), 'utf8')
    .digest('hex');
}
