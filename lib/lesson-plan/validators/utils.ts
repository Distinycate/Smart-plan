import type { LessonPlan } from '../schema';
import type { ValidationIssue } from './types';

export const meaningful = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

export const allObjectives = (plan: LessonPlan) => [
  ...plan.objectives.knowledge,
  ...plan.objectives.process,
  ...plan.objectives.attitude,
].filter(meaningful);

const comparable = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\u0E00-\u0E7Fa-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokens = (value: unknown) =>
  comparable(value)
    .split(' ')
    .filter(token => token.length >= 2);

export function looselyMatches(left: unknown, right: unknown): boolean {
  const a = comparable(left);
  const b = comparable(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  const aTokens = tokens(a);
  const bTokens = tokens(b);
  if (!aTokens.length || !bTokens.length) return false;
  const overlap = aTokens.filter(token => bTokens.includes(token)).length;
  return overlap / Math.min(aTokens.length, bTokens.length) >= 0.4;
}

export const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));

export const dedupeIssues = (issues: ValidationIssue[]) => {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = `${issue.code}|${issue.section}|${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
