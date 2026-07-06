export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ValidationIssue {
  code: string;
  section: string;
  severity: ValidationSeverity;
  message: string;
  suggestion: string;
}
