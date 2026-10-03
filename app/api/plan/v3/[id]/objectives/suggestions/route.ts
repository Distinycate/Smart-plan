import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import { getObjectiveSuggestions } from '@/lib/smartPlanV3/suggestions';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

interface RouteContext {
  params: { id: string };
}

export const maxDuration = 45;

/**
 * POST /api/plan/v3/[id]/objectives/suggestions
 * Provides 3 tiered objective candidates (Foundation / Target / Extended).
 * STRICT GOVERNANCE:
 * - Zero database writes.
 * - Does not mutate lesson state.
 * - Falls back cleanly to deterministic subject rules if AI is unavailable.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: planId } = params;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const { data: plan, error: planErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id, topic, subject_key, learning_focus, duration_minutes')
      .eq('id', planId)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }

    if (plan.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน หรือคุณไม่มีสิทธิ์เข้าถึง' }, { status: 404 });
    }

    // Load curriculum links for indicator context
    const { data: links } = await supabase
      .from('v3_lesson_curriculum_links')
      .select('indicator_code, indicator_label_snapshot')
      .eq('lesson_plan_id', planId);

    const indicatorText = (links || []).map(l => `${l.indicator_code}: ${l.indicator_label_snapshot}`).join('; ');

    // Always prepare deterministic fallback candidates
    const deterministicCandidates = getObjectiveSuggestions({
      subjectKey: plan.subject_key,
      learningFocus: plan.learning_focus,
      topic: plan.topic,
      indicatorText,
      durationMinutes: plan.duration_minutes || 60,
    });

    // Optional LLM enhancement
    try {
      const prompt = `คุณคือผู้เชี่ยวชาญด้านการออกแบบหลักสูตรและการสอน (Curriculum & Instructional Design) ของกระทรวงศึกษาธิการไทย
โปรดสร้างจุดประสงค์การเรียนรู้ 3 ด้านตามมาตรฐาน ว.PA (K - P - A) ในรูปแบบ JSON ภาษาไทย สำหรับแผนการสอนนี้:
- วิชา: ${plan.subject_key}
- เรื่อง: ${plan.topic}
- ลักษณะการเรียนรู้ (Focus): ${plan.learning_focus || 'ทั่วไป'}
- เวลาเรียน: ${plan.duration_minutes || 60} นาที
- ตัวชี้วัด: ${indicatorText || 'ตามมาตรฐาน'}

คำสั่งสำคัญ:
1. ข้อความต้องวัดและสังเกตได้จริงในคาบเรียน (Observable verbs เช่น ออกเสียง, พูดถาม-ตอบ, แสดงวิธีทำ, บันทึกผล)
2. ห้ามใช้คำกำกวม เช่น "เข้าใจ", "รู้เรื่อง"
3. แบ่งออกเป็น 3 ด้านตามเกณฑ์ ว.PA:
   - ด้านความรู้ (Knowledge: K): ข้อความลงท้ายด้วย (K)
   - ด้านทักษะ/กระบวนการ (Process/Skill: P): ข้อความลงท้ายด้วย (P)
   - ด้านคุณลักษณะอันพึงประสงค์/เจตคติ (Attitude: A): ข้อความลงท้ายด้วย (A)
4. ตอบกลับเฉพาะ JSON ที่มีโครงสร้างนี้เท่านั้น:
{
  "candidates": [
    {
      "id": "obj-sug-k",
      "category": "K",
      "categoryLabelTh": "ด้านความรู้ (Knowledge: K)",
      "categoryBadgeCls": "bg-blue-100 text-blue-800 border-blue-200",
      "level": "FOUNDATION",
      "levelLabelTh": "K - ด้านความรู้",
      "levelBadgeCls": "bg-blue-100 text-blue-800 border-blue-200",
      "statement": "...",
      "rationale": "...",
      "observableVerb": "..."
    },
    {
      "id": "obj-sug-p",
      "category": "P",
      "categoryLabelTh": "ด้านทักษะกระบวนการ (Process: P)",
      "categoryBadgeCls": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "level": "TARGET",
      "levelLabelTh": "P - ด้านทักษะ/ปฏิบัติ",
      "levelBadgeCls": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "statement": "...",
      "rationale": "...",
      "observableVerb": "..."
    },
    {
      "id": "obj-sug-a",
      "category": "A",
      "categoryLabelTh": "ด้านคุณลักษณะ/เจตคติ (Attitude: A)",
      "categoryBadgeCls": "bg-amber-100 text-amber-800 border-amber-200",
      "level": "EXTENDED",
      "levelLabelTh": "A - คุณลักษณะอันพึงประสงค์",
      "levelBadgeCls": "bg-amber-100 text-amber-800 border-amber-200",
      "statement": "...",
      "rationale": "...",
      "observableVerb": "..."
    }
  ]
}`;

      const modelName = 'gemini-2.5-flash';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      const response = await fetchGeminiWithRetry(
        apiUrl,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        },
        2,
        undefined,
        planId,
        4_500
      );

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed.candidates) && parsed.candidates.length >= 3) {
          return NextResponse.json({
            success: true,
            source: 'AI_ASSISTED',
            candidates: parsed.candidates,
          });
        }
      }
    } catch {
      // Fallback silently to deterministic candidates
    }

    return NextResponse.json({
      success: true,
      source: 'DETERMINISTIC_RULES',
      candidates: deterministicCandidates,
    });
  } catch (error: any) {
    console.error('[Objective Suggestions Error]', error);
    return NextResponse.json({
      success: false,
      error: 'เกิดข้อผิดพลาดในการสร้างข้อเสนอจุดประสงค์',
    }, { status: 500 });
  }
}
