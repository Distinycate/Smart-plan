import { fetchGeminiWithRetry } from '../../geminiClient';
import { getRubricCriterion } from '../rubrics/master-rubric';
import { isSectionInMode } from './modes';
import { runAIRequestQueued } from '../../ai/ai-request-queue';
import { retryWithBackoff } from '../../ai/ai-retry';

import {
  buildEvaluationRepairPrompt,
  buildSectionEvaluationPrompt,
  EVALUATION_SECTION_RESULT_JSON_SCHEMA,
} from './prompt-builder';
import {
  checkEvaluationConsistency,
  shouldRetryForConsistency,
} from './consistency-checker';
import type {
  EvaluateSectionInput,
  EvaluationAiTransport,
  EvaluationLevel,
  EvaluationResultIssue,
  EvaluationSectionResult,
  SectionEvaluationOutcome,
} from './types';

const levels: EvaluationLevel[] = [
  'excellent',
  'very_good',
  'good',
  'fair',
  'needs_improvement',
];
const severities = ['critical', 'high', 'medium', 'low'] as const;
export const EVALUATION_SECTION_TIMEOUT_MS = 45_000;

export class EvaluationResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationResultValidationError';
  }
}

const cleanJsonText = (value: string) =>
  value.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

export function safeParseEvaluationJson(value: unknown): unknown {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') {
    throw new EvaluationResultValidationError('AI output is not JSON text/object');
  }

  try {
    return JSON.parse(cleanJsonText(value));
  } catch (error) {
    throw new EvaluationResultValidationError(
      `AI JSON parse failed: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

const stringValue = (
  record: Record<string, unknown>,
  key: string
): string => {
  if (typeof record[key] !== 'string') {
    throw new EvaluationResultValidationError(`${key} must be a string`);
  }
  return String(record[key]).trim();
};

const stringArray = (
  record: Record<string, unknown>,
  key: string
): string[] => {
  const value = record[key];
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new EvaluationResultValidationError(`${key} must be string[]`);
  }
  return value.map(item => item.trim()).filter(Boolean);
};

const validateIssues = (value: unknown): EvaluationResultIssue[] => {
  if (!Array.isArray(value)) {
    throw new EvaluationResultValidationError('issues must be an array');
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new EvaluationResultValidationError(`issues[${index}] must be an object`);
    }
    const issue = item as Record<string, unknown>;
    const severity = stringValue(issue, 'severity');
    if (!severities.includes(severity as typeof severities[number])) {
      throw new EvaluationResultValidationError(`issues[${index}].severity is invalid`);
    }
    if (typeof issue.auto_fixable !== 'boolean') {
      throw new EvaluationResultValidationError(
        `issues[${index}].auto_fixable must be boolean`
      );
    }

    return {
      severity: severity as EvaluationResultIssue['severity'],
      issue_type: stringValue(issue, 'issue_type'),
      title: stringValue(issue, 'title'),
      description: stringValue(issue, 'description'),
      suggestion: stringValue(issue, 'suggestion'),
      auto_fixable: issue.auto_fixable,
    };
  });
};

export function validateEvaluationResult(
  value: unknown,
  input: Pick<EvaluateSectionInput, 'section'> & {
    criterion: NonNullable<ReturnType<typeof getRubricCriterion>>;
  }
): EvaluationSectionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EvaluationResultValidationError('evaluation result must be an object');
  }
  const record = value as Record<string, unknown>;
  const section = stringValue(record, 'section');
  if (section !== input.section) {
    throw new EvaluationResultValidationError(
      `section mismatch: expected ${input.section}`
    );
  }

  const score = Number(record.score);
  const maxScore = Number(record.max_score);
  if (!Number.isFinite(score) || !Number.isFinite(maxScore)) {
    throw new EvaluationResultValidationError('score/max_score must be numbers');
  }
  if (maxScore !== input.criterion.maxScore) {
    throw new EvaluationResultValidationError('max_score does not match rubric');
  }
  if (!input.criterion.anchors.some(anchor => anchor.score === score)) {
    throw new EvaluationResultValidationError('score is not an allowed rubric anchor');
  }

  const level = stringValue(record, 'level');
  if (!levels.includes(level as EvaluationLevel)) {
    throw new EvaluationResultValidationError('level is invalid');
  }

  return {
    section,
    score,
    max_score: maxScore,
    level: level as EvaluationLevel,
    evidence_found: stringArray(record, 'evidence_found'),
    missing_evidence: stringArray(record, 'missing_evidence'),
    strengths: stringArray(record, 'strengths'),
    weaknesses: stringArray(record, 'weaknesses'),
    suggestions: stringArray(record, 'suggestions'),
    issues: validateIssues(record.issues),
    reason: stringValue(record, 'reason'),
  };
}

export function createGeminiEvaluationTransport(
  apiKey?: string
): EvaluationAiTransport {
  return async request => {
    return runAIRequestQueued(async () => {
      return retryWithBackoff(async () => {
        const selectedKey =
          apiKey
          || process.env.GEMINI_API_KEY_EVALUATE
          || process.env.GEMINI_API_KEY;
        if (!selectedKey) throw new Error('GEMINI_API_KEY_EVALUATE is not configured');

        const model =
          process.env.GEMINI_EVALUATION_MODEL?.trim()
          || 'gemini-2.5-flash-lite';
        const apiUrl =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        // Check timeout configuration
        const timeoutMs = process.env.AI_SECTION_TIMEOUT_MS
          ? Number(process.env.AI_SECTION_TIMEOUT_MS)
          : request.timeoutMs;

        const response = await fetchGeminiWithRetry(
          apiUrl,
          {
            contents: [{ parts: [{ text: request.prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: EVALUATION_SECTION_RESULT_JSON_SCHEMA,
              temperature: 0,
              topP: 0.1,
              maxOutputTokens: 1_500,
              thinkingConfig: { thinkingBudget: 0 },
            },
          },
          1, // fetchGeminiWithRetry has internal retries, let our backoff wrapper manage the count
          selectedKey,
          `quality-eval-${request.mode}-${request.section}`,
          timeoutMs
        );
        
        if (!response.ok) {
          throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText || 'Error'}`);
        }

        const responseJson = await response.json();
        const output = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!output) throw new Error('Gemini returned an empty section result');
        return output;
      });
    });
  };
}


export async function evaluateSection(
  input: EvaluateSectionInput,
  options: { transport?: EvaluationAiTransport } = {}
): Promise<SectionEvaluationOutcome> {
  if (!isSectionInMode(input.mode, input.section)) {
    throw new Error(`Section ${input.section} is not registered for ${input.mode}`);
  }
  const criterion = getRubricCriterion(input.mode, input.section);
  if (!criterion) {
    throw new Error(`Rubric criterion not found: ${input.mode}/${input.section}`);
  }

  const transport =
    options.transport || createGeminiEvaluationTransport(input.apiKey);
  const basePrompt = buildSectionEvaluationPrompt({
    plan: input.plan,
    section: input.section,
    criterion,
    mode: input.mode,
    ruleBasedFindings: input.ruleBasedFindings,
  });
  let prompt = basePrompt;
  let lastError: unknown;
  let previousOutput: unknown;
  const deadline = Date.now() + EVALUATION_SECTION_TIMEOUT_MS;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 2_500) {
      lastError = new Error('Section evaluation exceeded 45-second deadline');
      break;
    }
    try {
      previousOutput = await transport({
        prompt,
        section: input.section,
        mode: input.mode,
        criterion,
        attempt,
        timeoutMs: Math.min(43_000, remainingMs),
        repairReason: lastError instanceof Error ? lastError.message : undefined,
      });
      const parsed = safeParseEvaluationJson(previousOutput);
      const result = validateEvaluationResult(parsed, {
        section: input.section,
        criterion,
      });
      const consistencyFlags = checkEvaluationConsistency(
        result,
        criterion,
        input.ruleBasedFindings
      );

      if (attempt === 1 && shouldRetryForConsistency(consistencyFlags)) {
        const consistencyReason =
          consistencyFlags.map(flag => flag.message).join('; ');
        lastError = new Error(consistencyReason);
        prompt = buildEvaluationRepairPrompt(
          basePrompt,
          result,
          consistencyReason
        );
        continue;
      }

      return { result, consistencyFlags, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      prompt = buildEvaluationRepairPrompt(
        basePrompt,
        previousOutput,
        error instanceof Error ? error.message : 'invalid result'
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Section evaluation failed');
}
