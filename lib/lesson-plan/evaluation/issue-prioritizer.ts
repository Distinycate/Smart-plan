import type {
  EvaluationResultIssue,
  EvaluationSectionResult,
} from './types';
import type { ValidationSeverity } from '../validators/types';

export interface PrioritizedEvaluationIssue extends EvaluationResultIssue {
  section: string;
  priorityScore: number;
  order: number;
}

export interface PrioritizedIssueSummary {
  ordered: PrioritizedEvaluationIssue[];
  bySeverity: Record<ValidationSeverity, PrioritizedEvaluationIssue[]>;
  counts: Record<ValidationSeverity, number>;
}

const severityWeight: Record<ValidationSeverity, number> = {
  critical: 400,
  high: 300,
  medium: 200,
  low: 100,
};

const issueTypeWeight = (issue: EvaluationResultIssue) => {
  const text = `${issue.issue_type} ${issue.title} ${issue.description}`.toLowerCase();
  if (/indicator|ตัวชี้วัด|assessment.tool|เครื่องมือประเมิน/.test(text)) return 40;
  if (/objective|จุดประสงค์|alignment|ความสอดคล้อง/.test(text)) return 35;
  if (/evidence|หลักฐาน|result|ผลลัพธ์/.test(text)) return 30;
  if (/active|gpas|activity|กิจกรรม/.test(text)) return 25;
  if (/rubric|เกณฑ์/.test(text)) return 20;
  if (/media|สื่อ|reflection|สะท้อน/.test(text)) return 10;
  return 0;
};

export function prioritizeIssues(
  results: readonly EvaluationSectionResult[]
): PrioritizedIssueSummary {
  const flattened = results.flatMap(result =>
    result.issues.map(issue => ({
      ...issue,
      section: result.section,
      priorityScore:
        severityWeight[issue.severity]
        + issueTypeWeight(issue)
        + (issue.auto_fixable ? 1 : 0),
      order: 0,
    }))
  );

  const ordered = flattened
    .sort((left, right) =>
      right.priorityScore - left.priorityScore
      || left.section.localeCompare(right.section)
      || left.title.localeCompare(right.title)
    )
    .map((issue, index) => ({ ...issue, order: index + 1 }));

  const bySeverity: PrioritizedIssueSummary['bySeverity'] = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const issue of ordered) bySeverity[issue.severity].push(issue);

  return {
    ordered,
    bySeverity,
    counts: {
      critical: bySeverity.critical.length,
      high: bySeverity.high.length,
      medium: bySeverity.medium.length,
      low: bySeverity.low.length,
    },
  };
}
