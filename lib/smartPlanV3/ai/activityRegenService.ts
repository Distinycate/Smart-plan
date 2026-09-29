/**
 * Smart Plan V3 — Partial Activity Regeneration Service
 * Generates an alternative for a single activity node with surrounding context.
 * Never regenerates the whole lesson; never overwrites automatically.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { V3Repository } from '../repository';
import { V3LessonGraph, V3BlueprintActivityDraft } from '../types';

export interface RegenerateSingleActivityResult {
  success: boolean;
  error?: string;
  originalActivity?: any;
  alternativeDraft?: V3BlueprintActivityDraft;
}

export async function regenerateSingleActivity(
  planId: string,
  activityId: string,
  supabase: SupabaseClient,
  userId: string,
  options?: { customApiKey?: string; isAdmin?: boolean }
): Promise<RegenerateSingleActivityResult> {
  const repo = new V3Repository(supabase);
  const graph: V3LessonGraph | null = await repo.getLessonGraph(planId, userId, options?.isAdmin);

  if (!graph || !graph.lesson) {
    return { success: false, error: 'ไม่พบข้อมูลแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' };
  }

  const { lesson, activities, objectives, evidence, activityObjectiveLinks, activityEvidenceLinks } = graph;

  const targetIndex = activities.findIndex(a => a.id === activityId);
  if (targetIndex === -1) {
    return { success: false, error: 'ไม่พบกิจกรรมที่ต้องการขอแนวทางใหม่' };
  }

  const currentActivity = activities[targetIndex];
  const prevActivity = targetIndex > 0 ? activities[targetIndex - 1] : null;
  const nextActivity = targetIndex < activities.length - 1 ? activities[targetIndex + 1] : null;

  // Find linked objectives and evidence
  const currentObjIds = activityObjectiveLinks
    .filter(l => l.activity_id === activityId)
    .map(l => l.objective_id);
  const linkedObjs = objectives.filter(o => currentObjIds.includes(o.id));

  const currentEvdIds = activityEvidenceLinks
    .filter(l => l.activity_id === activityId)
    .map(l => l.evidence_id);
  const linkedEvds = evidence.filter(e => currentEvdIds.includes(e.id));

  const systemInstruction = `คุณเป็นผู้เชี่ยวชาญด้านการออกแบบกิจกรรม Active Learning สำหรับครูไทย
หน้าที่ของคุณคือเสนอ "แนวทางกิจกรรมใหม่ทางเลือก" สำหรับ 1 กิจกรรมย่อย โดยต้องสอดคล้องกับกิจกรรมก่อนหน้าและถัดไปอย่างราบรื่น
และต้องเน้นการลงมือปฏิบัติจริงของผู้เรียน (Active Learning) ห้ามมีแต่ครูบรรยาย`;

  const userPrompt = `กรุณาเสนอแนวทางกิจกรรมใหม่สำหรับขั้นนี้ (1 กิจกรรม):

=== บริบทแผนการสอน ===
- วิชา: ${lesson.subject_key}
- ระดับชั้น: ${lesson.grade_level}
- เรื่อง: ${lesson.topic}
- ลักษณะวิชา: ${lesson.learning_focus || '-'}

=== ตำแหน่งกิจกรรมในคาบเรียน ===
- กิจกรรมก่อนหน้า: ${prevActivity ? `ขั้น ${prevActivity.phase} (${prevActivity.title || 'ไม่มีชื่อ'}) เวลา ${prevActivity.minutes} นาที` : 'ไม่มี (เป็นกิจกรรมแรกของคาบ)'}
- กิจกรรมปัจจุบันที่ต้องการเปลี่ยน: ขั้น ${currentActivity.phase} (${currentActivity.title || ''}) เวลา ${currentActivity.minutes} นาที
  - บทบาทครูเดิม: ${currentActivity.teacher_actions}
  - บทบาทผู้เรียนเดิม: ${currentActivity.student_actions}
- กิจกรรมถัดไป: ${nextActivity ? `ขั้น ${nextActivity.phase} (${nextActivity.title || 'ไม่มีชื่อ'}) เวลา ${nextActivity.minutes} นาที` : 'ไม่มี (เป็นกิจกรรมสุดท้ายของคาบ)'}

=== จุดประสงค์และหลักฐานที่เกี่ยวข้อง ===
- จุดประสงค์: ${linkedObjs.map(o => o.statement).join('; ') || 'ตามความเหมาะสมของเรื่อง'}
- หลักฐานการเรียนรู้: ${linkedEvds.map(e => e.description).join('; ') || '-'}
- เวลาที่กำหนด: ${currentActivity.minutes} นาที

=== รูปแบบผลลัพธ์ (JSON เท่านั้น) ===
{
  "temporaryId": "ALT",
  "phase": "${currentActivity.phase}",
  "title": "ชื่อกิจกรรมใหม่ที่กระชับและน่าสนใจ",
  "minutes": ${currentActivity.minutes},
  "teacherActions": ["บทบาทครู 1", "บทบาทครู 2"],
  "studentActions": ["บทบาทผู้เรียน 1 (ห้ามว่าง ต้องได้ลงมือทำจริง)", "บทบาทผู้เรียน 2"],
  "formativeCheck": {
    "enabled": true,
    "description": "วิธีประเมินความเข้าใจสั้นๆ"
  },
  "feedback": {
    "enabled": false,
    "description": ""
  },
  "requiredAssetHints": []
}`;

  const modelName = 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  try {
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
        temperature: 0.3,
      },
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 2, options?.customApiKey, planId, 25_000);
    const resJson = await response.json();
    const rawAiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawAiText) {
      return { success: false, error: 'ไม่ได้รับเนื้อหาทางเลือกจาก AI' };
    }

    let cleaned = rawAiText.trim();
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
    if (match) cleaned = match[1].trim();
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    const parsed = JSON.parse(cleaned);

    const alternativeDraft: V3BlueprintActivityDraft = {
      temporaryId: `ALT-${Date.now().toString(36)}`,
      phase: parsed.phase || currentActivity.phase,
      title: parsed.title || 'กิจกรรมทางเลือกใหม่',
      minutes: Number(parsed.minutes) || currentActivity.minutes,
      teacherActions: Array.isArray(parsed.teacherActions) ? parsed.teacherActions : [parsed.teacherActions || ''],
      studentActions: Array.isArray(parsed.studentActions) ? parsed.studentActions : [parsed.studentActions || ''],
      linkedObjectiveRefs: [],
      linkedEvidenceRefs: [],
      formativeCheck: parsed.formativeCheck,
      feedback: parsed.feedback,
      requiredAssetHints: Array.isArray(parsed.requiredAssetHints) ? parsed.requiredAssetHints : [],
      resolvedObjectiveIds: currentObjIds,
      resolvedEvidenceIds: currentEvdIds,
    };

    return {
      success: true,
      originalActivity: currentActivity,
      alternativeDraft,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'ไม่สามารถขอแนวทางกิจกรรมใหม่ได้ กรุณาลองใหม่อีกครั้ง',
    };
  }
}
