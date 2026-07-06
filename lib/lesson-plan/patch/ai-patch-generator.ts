import { randomUUID } from 'crypto';
import { fetchGeminiWithRetry } from '../../geminiClient';
import { getRubricCriterion } from '../rubrics/master-rubric';
import { runAIRequestQueued } from '../../ai/ai-request-queue';
import { retryWithBackoff } from '../../ai/ai-retry';
import { validatePatchSafety } from './safety';
import { getSectionsToRecheck } from './recheck-map';
import type { LessonPlan, EvaluationMode } from '../schema';
import type { EvaluationResultIssue } from '../evaluation/types';
import type { LessonPlanPatch, PatchTarget, PatchOperation } from './patch-schema';


export interface GenerateAiPatchInput {
  lessonPlanId: string;
  evaluationMode: EvaluationMode;
  targetSection: string;
  plan: LessonPlan;
  issues: EvaluationResultIssue[];
  apiKey?: string;
}

const SECTION_TARGET_MAP: Record<string, { target: PatchTarget; path: string[] }> = {
  objectives_kpa: { target: 'objectives.knowledge', path: ['objectives'] },
  learning_activities: { target: 'learningActivities', path: ['learningActivities'] },
  assessment_quality: { target: 'assessment.methods', path: ['assessment'] },
  curriculum_alignment: { target: 'curriculum.indicators', path: ['curriculum'] },
  active_learning: { target: 'learningActivities', path: ['learningActivities'] },
  constructive_alignment: { target: 'objectives.knowledge', path: ['objectives'] },
};

export async function generateAiPatch(
  input: GenerateAiPatchInput
): Promise<LessonPlanPatch | null> {
  const mapping = SECTION_TARGET_MAP[input.targetSection];
  if (!mapping) {
    throw new Error(`ไม่รองรับการแก้ไขอัตโนมัติสำหรับหมวดหมู่: ${input.targetSection}`);
  }

  const { target, path } = mapping;
  const targetContent = path.reduce((obj: any, key) => obj?.[key], input.plan);

  // Rubric details
  const criterion = getRubricCriterion(input.evaluationMode, input.targetSection);
  const rubricDetails = criterion 
    ? `หัวข้อประเมิน: ${criterion.title}\nเกณฑ์การผ่าน:\n${criterion.anchors.map(a => `- ${a.score} คะแนน: ${a.label} (${a.description})`).join('\n')}`
    : '';

  // Related curriculum context
  const curriculumContext = `ตัวชี้วัด/มาตรฐาน: ${JSON.stringify(input.plan.curriculum.indicators || input.plan.curriculum.standards || [])}`;
  const objectivesContext = `จุดประสงค์การเรียนรู้: ${JSON.stringify(input.plan.objectives || {})}`;

  const prompt = `คุณคือ AI แก้ไขแผนการสอนแบบระบุตำแหน่งเจาะจง (Patch-based system)

ข้อบังคับในการทำงาน:
1. แก้ไขเฉพาะหัวข้อ ${input.targetSection} (เป้าหมาย: ${target}, เส้นทางข้อมูล: ${path.join('.')})
2. ห้ามเขียนใหม่ทั้งหมด (ห้าม Rewrite ทั้งแผนการสอน) แก้เฉพาะส่วนที่มีปัญหาตามที่ระบุในประเด็น (Issues) เท่านั้น
3. ห้ามเปลี่ยนแปลงข้อมูลนอกหัวข้อที่รับผิดชอบเด็ดขาด
4. ห้ามเพิ่มเนื้อหาที่ขัดกับตัวชี้วัดหรือมาตรฐานหลักของแผนการสอนเดิม
5. คุณต้องตอบกลับในรูปแบบ JSON ตามโครงสร้างที่กำหนดไว้เท่านั้น

ข้อมูลแผนการสอนปัจจุบันในหมวดหมู่ที่ต้องแก้ไข:
${JSON.stringify(targetContent, null, 2)}

ข้อมูลบริบทที่เกี่ยวข้องของแผน:
- มาตรฐาน/ตัวชี้วัด:
${curriculumContext}
- จุดประสงค์ของแผน:
${objectivesContext}

เกณฑ์การประเมินที่เกี่ยวข้อง (Rubric):
${rubricDetails}

รายการประเด็นปัญหาที่ต้องแก้ไข (แก้ไม่เกิน 3 ประเด็น):
${input.issues.slice(0, 3).map((issue, idx) => `${idx + 1}. [${issue.severity}] ${issue.title}: ${issue.description}\nคำแนะนำ: ${issue.suggestion}`).join('\n')}

---
กรุณาตอบเป็น JSON ตามโครงสร้างข้อใดข้อหนึ่งต่อไปนี้เท่านั้น:

กรณีที่ 1: สามารถแก้ไขได้สำเร็จ
{
  "targetSection": "${input.targetSection}",
  "operation": "set" | "append" | "replace_item",
  "path": [${path.map(p => `"${p}"`).join(', ')}],
  "before": <ข้อมูลเดิมก่อนแก้ไข>,
  "after": <ข้อมูลใหม่หลังการแก้ไขสำเร็จ (ต้องเป็นข้อมูลที่มีรูปแบบเดียวกับก่อนแก้ไขและผ่านการปรับปรุงแล้ว)>,
  "reason": "<เหตุผลประกอบการแก้ไขที่ครูสามารถเข้าใจได้>"
}

กรณีที่ 2: ไม่สามารถแก้ไขโดยระบบอัตโนมัติได้ (ต้องให้คุณครูแก้ไขเอง)
{
  "cannotPatch": true,
  "reason": "<เหตุผลที่ระบบไม่สามารถแก้ไขส่วนนี้ได้โดยอัตโนมัติ>",
  "requiredUserAction": "<คำอธิบายขั้นตอนที่แนะนำให้ครูแก้ไขด้วยตนเอง>"
}
`;

  const apiKey = input.apiKey || process.env.GEMINI_API_KEY_EVALUATE || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY_EVALUATE is not configured');

  const model = process.env.GEMINI_EVALUATION_MODEL?.trim() || 'gemini-2.5-flash-lite';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const timeoutMs = process.env.AI_PATCH_TIMEOUT_MS ? Number(process.env.AI_PATCH_TIMEOUT_MS) : 45_000;

  return runAIRequestQueued(async () => {
    return retryWithBackoff(async () => {
      const response = await fetchGeminiWithRetry(
        apiUrl,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 2_000,
          },
        },
        1,
        apiKey,
        `patch-ai-${input.lessonPlanId}-${input.targetSection}`,
        timeoutMs
      );

      if (!response.ok) {
        throw new Error(`Gemini Patch API HTTP ${response.status}: ${response.statusText}`);
      }

      const responseJson = await response.json();
      const output = responseJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!output) throw new Error('Gemini returned an empty patch suggestion');

      const parsed = JSON.parse(output.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, ''));

      if (parsed.cannotPatch) {
        console.warn(`[AI Patch Generator] AI marked section ${input.targetSection} as unpatchable. Reason: ${parsed.reason}`);
        return null;
      }

      // Populate low-level fields
      const patch: LessonPlanPatch = {
        id: randomUUID(),
        target: target,
        operation: (parsed.operation || 'set') as PatchOperation,
        path: parsed.path || path,
        before: targetContent,
        after: parsed.after,
        reason: parsed.reason || 'AI ปรับปรุงเนื้อหาอัตโนมัติ',
        issueCode: input.issues[0]?.issue_type,
        issueSeverity: input.issues[0]?.severity,
        affectedSections: getSectionsToRecheck([target]),
      };

      // Run Safety Guard Checks (Task 6)
      const safety = validatePatchSafety(patch);
      if (!safety.valid) {
        throw new Error(`AI generated unsafe patch: ${safety.reason}`);
      }

      return patch;
    });
  });
}
