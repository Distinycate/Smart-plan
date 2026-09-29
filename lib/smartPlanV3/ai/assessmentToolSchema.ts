/**
 * Smart Plan V3 — AI Assessment Tool Response Parser & Validator
 */

import { validateToolContent } from '../assessmentTools/schemas';

export interface ToolValidationResult {
  valid: boolean;
  error?: string;
  toolContent?: any;
}

/**
 * Extracts JSON block from raw LLM text
 */
export function extractJsonFromText(rawText: string): string {
  let cleaned = rawText.trim();

  // If wrapped in ```json ... ```
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(jsonBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }

  // If plain JSON with { ... }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1).trim();
  }

  return cleaned;
}

/**
 * Parses and validates tool JSON from Gemini response
 */
export function validateAiToolResponse(
  rawText: string,
  toolType: string
): ToolValidationResult {
  try {
    const jsonStr = extractJsonFromText(rawText);
    const parsed = JSON.parse(jsonStr);

    const validation = validateToolContent(toolType, parsed);
    if (!validation.success) {
      return {
        valid: false,
        error: `ข้อมูลเครื่องมือไม่ถูกต้องตามเกณฑ์: ${validation.error}`,
      };
    }

    return {
      valid: true,
      toolContent: validation.data || parsed,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `ไม่สามารถอ่านข้อมูล JSON จากแบบจำลอง AI ได้: ${err.message}`,
    };
  }
}
