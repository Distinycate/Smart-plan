/**
 * Smart Plan V3 — AI Quality Review Output Schema Validator
 * Validates AI response structure and sanitizes invalid refs.
 * Zero tolerance for hallucinated entity references.
 */

import type { V3QualityIssue, V3QualityCategory, V3QualitySeverity, V3QualityLocationType } from '../quality/types';

const VALID_CATEGORIES: V3QualityCategory[] = ['ALIGNMENT', 'ACTIVITY', 'ASSESSMENT', 'FEEDBACK', 'SUBJECT', 'PACKAGE', 'TIME', 'STRUCTURE'];
const VALID_SEVERITIES: V3QualitySeverity[] = ['ERROR', 'WARNING', 'INFO'];
const VALID_LOCATION_TYPES: V3QualityLocationType[] = ['LESSON', 'OBJECTIVE', 'EVIDENCE', 'ACTIVITY', 'ASSESSMENT', 'ASSESSMENT_TOOL', 'ASSET'];

export interface V3QualityReviewRawOutput {
  issues: Array<{
    category: string;
    severity: string;
    locationType: string;
    locationRef?: string | null;
    reason: string;
    suggestion?: string | null;
    proposedChange?: {
      field?: string | null;
      replacement?: string | null;
    } | null;
  }>;
}

export interface V3QualityReviewSchemaResult {
  valid: boolean;
  errors: string[];
  sanitizedIssues: V3QualityIssue[];
  rejectedCount: number;
}

/**
 * Parse and validate AI quality review output.
 * - Validates JSON structure
 * - Rejects issues with invalid refs
 * - Rejects issues with invalid categories/severities
 * - Returns only safe, valid issues with stable codes assigned
 */
export function validateQualityReviewOutput(
  rawText: string,
  validRefs: Set<string>
): V3QualityReviewSchemaResult {
  const errors: string[] = [];
  const sanitizedIssues: V3QualityIssue[] = [];
  let rejectedCount = 0;

  // Parse JSON
  let parsed: V3QualityReviewRawOutput;
  try {
    // Gemini sometimes wraps in ```json ... ```
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    errors.push(`AI response is not valid JSON: ${String(e).substring(0, 100)}`);
    return { valid: false, errors, sanitizedIssues: [], rejectedCount: 0 };
  }

  if (!Array.isArray(parsed?.issues)) {
    errors.push('AI response missing "issues" array');
    return { valid: false, errors, sanitizedIssues: [], rejectedCount: 0 };
  }

  let issueIndex = 0;
  for (const raw of parsed.issues) {
    issueIndex++;
    const issueErrors: string[] = [];

    // Validate category
    if (!VALID_CATEGORIES.includes(raw.category as V3QualityCategory)) {
      issueErrors.push(`Issue ${issueIndex}: invalid category "${raw.category}"`);
    }

    // Validate severity
    if (!VALID_SEVERITIES.includes(raw.severity as V3QualitySeverity)) {
      issueErrors.push(`Issue ${issueIndex}: invalid severity "${raw.severity}"`);
    }

    // Validate locationType
    if (!VALID_LOCATION_TYPES.includes(raw.locationType as V3QualityLocationType)) {
      issueErrors.push(`Issue ${issueIndex}: invalid locationType "${raw.locationType}"`);
    }

    // Normalize locationRef if AI provided comma-separated refs
    let locRef: string | null = raw.locationRef?.trim() || null;
    if (locRef && locRef !== 'null') {
      if (locRef.includes(',')) {
        const parts = locRef.split(',').map(p => p.trim()).filter(Boolean);
        const matched = parts.find(p => validRefs.has(p));
        locRef = matched || parts[0];
      }
    }

    // Validate ref (reject phantom refs like A99)
    if (locRef && locRef !== 'null' && !validRefs.has(locRef)) {
      issueErrors.push(`Issue ${issueIndex}: invalid locationRef "${locRef}" (not in lesson graph)`);
    }

    // Require non-empty reason
    if (!raw.reason?.trim()) {
      issueErrors.push(`Issue ${issueIndex}: missing reason`);
    }

    if (issueErrors.length > 0) {
      errors.push(...issueErrors);
      rejectedCount++;
      continue;
    }

    // Assign stable AI code (Q-AI-{index})
    const code = `Q-AI-${String(issueIndex).padStart(3, '0')}`;

    sanitizedIssues.push({
      code,
      category: raw.category as V3QualityCategory,
      severity: raw.severity as V3QualitySeverity,
      locationType: raw.locationType as V3QualityLocationType,
      locationRef: locRef || undefined,
      title: raw.reason.substring(0, 80),
      message: raw.reason,
      evidence: [],
      suggestion: raw.suggestion || null,
      proposedChange: raw.proposedChange
        ? {
            field: raw.proposedChange.field || '',
            replacement: raw.proposedChange.replacement || '',
          }
        : null,
      isBlocking: false, // AI issues are never blocking by themselves
      source: 'AI',
    });
  }

  return {
    valid: errors.length === 0 || sanitizedIssues.length > 0,
    errors,
    sanitizedIssues,
    rejectedCount,
  };
}
