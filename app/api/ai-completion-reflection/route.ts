import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';
import { clipForAi, fastGeminiUrl, fastJsonGenerationConfig } from '@/lib/geminiRuntime';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {

    const { 
      gradeLevel, 
      subjectName, 
      lessonTopic,
      objectiveK,
      objectiveP,
      objectiveA,
      learningProcess
    } = await req.json();

    if (!gradeLevel || !subjectName || !lessonTopic || !learningProcess) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters (need topic, objectives and learningProcess)'
      }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY_COMPLETION || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing GEMINI_API_KEY environment variable.'
      }, { status: 500 });
    }
    const apiUrl = fastGeminiUrl();

    // Fetch Error Memory from ai_error_logs
    const { data: errorLogs } = await supabase
      .from('ai_error_logs')
      .select('error_message, resolution_hint')
      .order('created_at', { ascending: false })
      .limit(3);

    let errorMemoryText = '';
    if (errorLogs && errorLogs.length > 0) {
      // Deduplicate and categorize
      const uniqueErrors = new Map<string, string>();
      errorLogs.forEach((log: any) => {
        const key = log.error_message?.trim();
        if (key && !uniqueErrors.has(key)) {
          uniqueErrors.set(key, log.resolution_hint || 'ควรปรับปรุงและตรวจสอบให้ถูกต้อง');
        }
      });

      // Take up to 10 unique errors to avoid confusing the AI
      const distinctErrors = Array.from(uniqueErrors.entries()).slice(0, 3);

      if (distinctErrors.length > 0) {
        errorMemoryText = `\n\n[ข้อมูลอ้างอิง: ข้อผิดพลาดที่เคยพบในอดีต กรุณาเรียนรู้และห้ามทำผิดซ้ำ]\n`;
        distinctErrors.forEach(([issue, hint], idx) => {
          errorMemoryText += `${idx + 1}. ปัญหาที่เคยพบ: ${issue}\n   แนวทางแก้ไข: ${hint}\n`;
        });
        errorMemoryText += `** คำสั่งสำคัญ: ให้นำแนวทางแก้ไขเหล่านี้ไปปรับใช้ในการสร้างส่วนที่เหลือของแผนนี้ เพื่อไม่ให้เกิดข้อผิดพลาดเดิมซ้ำอีก **\n`;
      }
    }

    const boundedLearningProcess = clipForAi(learningProcess, 6000);
    const prompt = `MASTER SYSTEM PROMPT V1 (STEP 2: COMPLETION - REFLECTION)
สำหรับระบบสร้างแผนการจัดการเรียนรู้

คุณคือผู้เชี่ยวชาญด้านการวัดและประเมินผลตามสภาพจริง
เราได้สร้าง "กระบวนการจัดการเรียนรู้" ไว้แล้ว ดังนี้:
---
วิชา: ${subjectName} ชั้น: ${gradeLevel} เรื่อง: ${lessonTopic}

กระบวนการจัดการเรียนรู้ที่ใช้:
${boundedLearningProcess}
---

หน้าที่ของคุณคือ "สร้างบันทึกหลังการจัดกระบวนการเรียนรู้" ให้สอดคล้องกับกระบวนการเรียนรู้ที่กำหนดไว้อย่างสมบูรณ์แบบที่สุด

หลักการสำคัญ
1. ส่วน "บันทึกหลังการจัดกระบวนการเรียนรู้" (result, problems, solutions) ให้เขียนเตรียมไว้ล่วงหน้าโดยอิงจากกิจกรรมที่คาดว่าจะเกิดขึ้นจริง
2. ใช้ภาษาราชการทางการศึกษา
${errorMemoryText}

ให้ตอบกลับเป็น JSON Object เท่านั้น โดยมีคีย์ดังต่อไปนี้:
1. resultK: (บันทึกหลังสอน ผลการเรียนรู้ด้าน K)
2. resultP: (บันทึกหลังสอน ผลการเรียนรู้ด้าน P)
3. resultA: (บันทึกหลังสอน ผลการเรียนรู้ด้าน A)
4. problems: (บันทึกหลังสอน ปัญหาและอุปสรรคที่คาดว่าจะพบ)
5. solutions: (บันทึกหลังสอน แนวทางแก้ไข)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: fastJsonGenerationConfig(1024)
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 2, apiKey);
    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error('Invalid response payload structure from Gemini API');
    }

    let cleanedText = aiText.trim();
    const match = cleanedText.match(/```(?:json)?([\\s\\S]*?)```/);
    if (match) {
      cleanedText = match[1].trim();
    } else {
      cleanedText = cleanedText.replace(/^```(?:json)?\\n?/, '').replace(/\\n?```$/, '').trim();
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError: any) {
      console.error("Failed to parse JSON. Raw AI Output:", aiText);
      throw new Error(`AI output parsing failed: ${parseError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Gemini AI Completion endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI completion generation'
    }, { status: 500 });
  }
}
