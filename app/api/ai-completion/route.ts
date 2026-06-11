import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';

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
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

    // Fetch Error Memory from ai_error_logs
    const { data: errorLogs } = await supabase
      .from('ai_error_logs')
      .select('error_message, resolution_hint')
      .order('created_at', { ascending: false })
      .limit(30);

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
      const distinctErrors = Array.from(uniqueErrors.entries()).slice(0, 10);

      if (distinctErrors.length > 0) {
        errorMemoryText = `\n\n[ข้อมูลอ้างอิง: ข้อผิดพลาดที่เคยพบในอดีต กรุณาเรียนรู้และห้ามทำผิดซ้ำ]\n`;
        distinctErrors.forEach(([issue, hint], idx) => {
          errorMemoryText += `${idx + 1}. ปัญหาที่เคยพบ: ${issue}\n   แนวทางแก้ไข: ${hint}\n`;
        });
        errorMemoryText += `** คำสั่งสำคัญ: ให้นำแนวทางแก้ไขเหล่านี้ไปปรับใช้ในการสร้างส่วนที่เหลือของแผนนี้ เพื่อไม่ให้เกิดข้อผิดพลาดเดิมซ้ำอีก **\n`;
      }
    }

    const prompt = `MASTER SYSTEM PROMPT V1 (STEP 2: COMPLETION & ALIGNMENT)
สำหรับระบบสร้างแผนการจัดการเรียนรู้

คุณคือผู้เชี่ยวชาญด้านการวัดและประเมินผลตามสภาพจริง และนักออกแบบสื่อการเรียนรู้
เราได้สร้าง "กระบวนการจัดการเรียนรู้" ไว้แล้ว ดังนี้:
---
วิชา: ${subjectName} ชั้น: ${gradeLevel} เรื่อง: ${lessonTopic}

จุดประสงค์ความรู้ (K): ${objectiveK || '-'}
จุดประสงค์ทักษะ (P): ${objectiveP || '-'}
จุดประสงค์คุณลักษณะ (A): ${objectiveA || '-'}

กระบวนการจัดการเรียนรู้ที่ใช้:
${learningProcess}
---

หน้าที่ของคุณคือ "เติมเต็มส่วนที่เหลือของแผนการสอน" ให้สอดคล้องกับกระบวนการเรียนรู้และจุดประสงค์ที่กำหนดไว้อย่างสมบูรณ์แบบที่สุด

หลักการสำคัญ
1. สาระสำคัญ เนื้อหา สื่อ และภาระงาน ต้องสอดคล้องกับสิ่งที่อยู่ในกระบวนการจัดการเรียนรู้ด้านบน
2. การวัดผล (Measure K/P/A) ต้องตอบโจทย์จุดประสงค์การเรียนรู้ K/P/A ด้านบนอย่างแม่นยำ
3. เกณฑ์ Rubric 5 ระดับ ต้องเขียนให้ชัดเจน วัดได้จริง (5=ดีเยี่ยม, 4=ดีมาก, 3=ดี, 2=พอใช้, 1=ปรับปรุง) ห้ามเขียนข้ามระดับ ห้ามรวบรัดอย่างเด็ดขาด และเขียนคำอธิบายคุณภาพงานในแต่ละระดับให้ครบถ้วนทั้ง 5 ระดับ
4. ส่วน "บันทึกหลังการจัดกระบวนการเรียนรู้" (result, problems, solutions) ให้เขียนเตรียมไว้ล่วงหน้าโดยอิงจากกิจกรรมที่ทำ
5. ใช้ภาษาราชการทางการศึกษา
${errorMemoryText}

ให้ตอบกลับเป็น JSON Object เท่านั้น โดยมีคีย์ดังต่อไปนี้:
1. learningContent: (เนื้อหาสาระการเรียนรู้ทั้งหมด)
2. learningMedia: (สื่อการเรียนรู้)
3. learningSources: (แหล่งเรียนรู้เพิ่มเติม)
4. tasks: (ชิ้นงานหรือภาระงานที่ระบุในกิจกรรม)
6. measureK: (สิ่งที่ต้องการวัดและประเมินผล K)
7. methodK: (วิธีการวัด K)
8. toolK: (เครื่องมือวัด K)
9. criteriaK: (เกณฑ์ประเมิน K - ระบุระดับคะแนนที่ผ่าน)
10. rubricK: (คำอธิบายเกณฑ์ Rubric K แบ่งเป็น 5 ระดับอย่างละเอียด: 5, 4, 3, 2, 1 ห้ามตัดตอน)
11. measureP: (สิ่งที่ต้องการวัดและประเมินผล P)
12. methodP: (วิธีการวัด P)
13. toolP: (เครื่องมือวัด P)
14. criteriaP: (เกณฑ์ประเมิน P)
15. rubricP: (คำอธิบายเกณฑ์ Rubric P แบ่งเป็น 5 ระดับอย่างละเอียด: 5, 4, 3, 2, 1 ห้ามตัดตอน)
16. measureA: (สิ่งที่ต้องการวัดและประเมินผล A)
17. methodA: (วิธีการวัด A)
18. toolA: (เครื่องมือวัด A)
19. criteriaA: (เกณฑ์ประเมิน A)
20. rubricA: (คำอธิบายเกณฑ์ Rubric A แบ่งเป็น 5 ระดับอย่างละเอียด: 5, 4, 3, 2, 1 ห้ามตัดตอน)
21. resultK: (บันทึกหลังสอน ผลการเรียนรู้ด้าน K)
22. resultP: (บันทึกหลังสอน ผลการเรียนรู้ด้าน P)
23. resultA: (บันทึกหลังสอน ผลการเรียนรู้ด้าน A)
24. problems: (บันทึกหลังสอน ปัญหาและอุปสรรคที่คาดว่าจะพบ)
25. solutions: (บันทึกหลังสอน แนวทางแก้ไข)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
      }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 6, apiKey);
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
