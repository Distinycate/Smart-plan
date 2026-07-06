import type {
  EvaluationLevel,
  EvaluationSectionResult,
} from './types';

export type EvaluationReadinessStatus =
  | 'not_ready_critical_issues'
  | 'ready'
  | 'ready_with_minor_revision'
  | 'needs_revision';

export interface AggregatedEvaluationScore {
  totalScore: number;
  totalMax: number;
  percentage: number;
  level: EvaluationLevel;
  readinessStatus: EvaluationReadinessStatus;
  categoryScores: Record<string, {
    score: number;
    maxScore: number;
    percentage: number;
  }>;
}

export function getEvaluationLevel(percentage: number): EvaluationLevel {
  if (percentage >= 95) return 'excellent';
  if (percentage >= 90) return 'very_good';
  if (percentage >= 80) return 'good';
  if (percentage >= 70) return 'fair';
  return 'needs_improvement';
}

export function aggregateScore(
  results: readonly EvaluationSectionResult[]
): AggregatedEvaluationScore {
  const sections = new Set<string>();
  for (const result of results) {
    if (sections.has(result.section)) {
      throw new Error(`Duplicate evaluation section: ${result.section}`);
    }
    sections.add(result.section);
  }

  const totalScore = results.reduce(
    (sum, result) => sum + Number(result.score || 0),
    0
  );
  const totalMax = results.reduce(
    (sum, result) => sum + Number(result.max_score || 0),
    0
  );
  const percentage = totalMax > 0
    ? Math.round((totalScore / totalMax) * 10_000) / 100
    : 0;
  const hasCritical = results.some(result =>
    result.issues.some(issue => issue.severity === 'critical')
  );
  const readinessStatus: EvaluationReadinessStatus = hasCritical
    ? 'not_ready_critical_issues'
    : percentage >= 90
      ? 'ready'
      : percentage >= 80
        ? 'ready_with_minor_revision'
        : 'needs_revision';

  const categoryScores = results.reduce<AggregatedEvaluationScore['categoryScores']>(
    (summary, result) => {
      summary[result.section] = {
        score: result.score,
        maxScore: result.max_score,
        percentage: result.max_score > 0
          ? Math.round((result.score / result.max_score) * 10_000) / 100
          : 0,
      };
      return summary;
    },
    {}
  );

  return {
    totalScore,
    totalMax,
    percentage,
    level: getEvaluationLevel(percentage),
    readinessStatus,
    categoryScores,
  };
}
