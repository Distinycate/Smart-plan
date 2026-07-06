export const ALIGNMENT_DIMENSIONS = [
  'indicatorAlignment',
  'objectiveQuality',
  'activityAlignment',
  'assessmentAlignment',
  'rubricQuality',
  'feasibility',
  'languageClarity',
  'teacherReadiness',
] as const;

const stringArray = (value: unknown) =>
  Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : [];

export function validateAlignmentResult(value: any) {
  if (!value || typeof value !== 'object') return null;
  const overallScore = Number(value.overallScore);
  if (!Number.isFinite(overallScore) || overallScore < 0 || overallScore > 100) return null;

  const dimensionScores: Record<string, number> = {};
  for (const dimension of ALIGNMENT_DIMENSIONS) {
    const score = Number(value.dimensionScores?.[dimension]);
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    dimensionScores[dimension] = score;
  }

  return {
    overallScore,
    level: String(value.level || ''),
    dimensionScores,
    strengths: stringArray(value.strengths),
    weaknesses: stringArray(value.weaknesses),
    criticalIssues: stringArray(value.criticalIssues),
    suggestions: stringArray(value.suggestions),
    revisedSuggestions: value.revisedSuggestions && typeof value.revisedSuggestions === 'object'
      ? value.revisedSuggestions
      : {},
    warnings: stringArray(value.warnings),
  };
}

