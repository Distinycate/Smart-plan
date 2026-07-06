import {
  extractRelevantPlanSection,
  extractRelevantRuleFindings,
} from './section-registry';
import type { SectionPromptInput } from './types';

const compactValue = (
  value: unknown,
  depth = 0
): unknown => {
  if (depth > 8) return '[depth-limited]';
  if (typeof value === 'string') {
    return value.length > 1_500
      ? `${value.slice(0, 1_500)}[truncated]`
      : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20)
      .map(item => compactValue(item, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .reduce<Record<string, unknown>>((result, [key, item]) => {
        if (item !== undefined) result[key] = compactValue(item, depth + 1);
        return result;
      }, {});
  }
  return value;
};

export const EVALUATION_SECTION_RESULT_JSON_SCHEMA = {
  type: 'OBJECT',
  properties: {
    section: { type: 'STRING' },
    score: { type: 'NUMBER' },
    max_score: { type: 'NUMBER' },
    level: {
      type: 'STRING',
      enum: [
        'excellent',
        'very_good',
        'good',
        'fair',
        'needs_improvement',
      ],
    },
    evidence_found: { type: 'ARRAY', items: { type: 'STRING' } },
    missing_evidence: { type: 'ARRAY', items: { type: 'STRING' } },
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          severity: {
            type: 'STRING',
            enum: ['critical', 'high', 'medium', 'low'],
          },
          issue_type: { type: 'STRING' },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          suggestion: { type: 'STRING' },
          auto_fixable: { type: 'BOOLEAN' },
        },
        required: [
          'severity',
          'issue_type',
          'title',
          'description',
          'suggestion',
          'auto_fixable',
        ],
      },
    },
    reason: { type: 'STRING' },
  },
  required: [
    'section',
    'score',
    'max_score',
    'level',
    'evidence_found',
    'missing_evidence',
    'strengths',
    'weaknesses',
    'suggestions',
    'issues',
    'reason',
  ],
} as const;

export function buildSectionEvaluationPrompt(
  input: SectionPromptInput
): string {
  const sectionData = compactValue(
    extractRelevantPlanSection(input.plan, input.section)
  );
  const ruleFindings = compactValue(
    extractRelevantRuleFindings(input.ruleBasedFindings, input.section)
  );
  const allowedScores = input.criterion.anchors
    .map(anchor => anchor.score)
    .join(', ');

  return `คุณคือผู้ประเมินแผนการจัดการเรียนรู้เชิงวิชาการ

ภารกิจ: ตรวจเฉพาะ "${input.criterion.title}" (${input.section})
โหมด: ${input.mode}

ข้อบังคับ:
- ห้ามตรวจหัวข้ออื่น ห้ามสรุปหรือคำนวณคะแนนรวม
- ใช้เฉพาะข้อมูล SECTION_DATA ห้ามแต่งหลักฐาน
- score ต้องเป็นหนึ่งใน [${allowedScores}] เท่านั้น
- max_score ต้องเท่ากับ ${input.criterion.maxScore}
- ทุกผลลัพธ์ต้องมี evidence_found และ missing_evidence เป็น array
- หากไม่พบหลักฐาน ให้ใส่ missing_evidence และห้ามให้คะแนนสูง
- หากมี critical issue คะแนนต้องไม่เกิน 60% ของคะแนนเต็ม
- ตอบ JSON object เท่านั้น ห้าม markdown หรือข้อความนอก JSON

RUBRIC_ANCHORS:
${JSON.stringify(input.criterion.anchors)}

REQUIRED_EVIDENCE:
${JSON.stringify(input.criterion.requiredEvidence)}

RULE_BASED_FINDINGS:
${JSON.stringify(ruleFindings)}

SECTION_DATA:
${JSON.stringify(sectionData)}

OUTPUT:
{
  "section": "${input.section}",
  "score": ${input.criterion.anchors[0]?.score ?? 0},
  "max_score": ${input.criterion.maxScore},
  "level": "needs_improvement",
  "evidence_found": [],
  "missing_evidence": [],
  "strengths": [],
  "weaknesses": [],
  "suggestions": [],
  "issues": [],
  "reason": ""
}`;
}

export function buildEvaluationRepairPrompt(
  originalPrompt: string,
  invalidOutput: unknown,
  reason: string
): string {
  return `${originalPrompt}

คำตอบก่อนหน้าไม่ผ่าน validation:
${reason}

INVALID_OUTPUT:
${JSON.stringify(compactValue(invalidOutput))}

แก้เฉพาะรูปแบบ JSON และความสอดคล้องกับ rubric ห้ามเพิ่มหลักฐานใหม่
ตอบ JSON object เท่านั้น`;
}
