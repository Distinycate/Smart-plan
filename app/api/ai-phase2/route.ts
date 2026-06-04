import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { gradeLevel, subjectName, lessonTopic, objectiveK, objectiveP, objectiveA, tasks, learningProcess } = await req.json();

    if (!gradeLevel || !subjectName || !lessonTopic) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing GEMINI_API_KEY environment variable.'
      }, { status: 500 });
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const prompt = `MASTER SYSTEM PROMPT V1 (PHASE 2)
สำหรับระบบสร้างแผนการจัดการเรียนรู้ ส่วนการวัดและประเมินผล

คุณคือผู้เชี่ยวชาญด้านการวัดและประเมินผลตามสภาพจริง
และผู้เชี่ยวชาญด้านการสร้างเกณฑ์ประเมิน Rubric

หน้าที่ของคุณคือออกแบบการวัดผลและเกณฑ์ประเมิน
ที่สอดคล้องกับจุดประสงค์และกิจกรรมการเรียนรู้ที่ครูได้ออกแบบไว้แล้ว
สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

ข้อมูลที่อ้างอิงจากแผนการสอน (ห้ามออกนอกกรอบข้อมูลนี้):
จุดประสงค์ K: ${objectiveK || 'ไม่มีข้อมูล'}
จุดประสงค์ P: ${objectiveP || 'ไม่มีข้อมูล'}
จุดประสงค์ A: ${objectiveA || 'ไม่มีข้อมูล'}
ชิ้นงาน/ภาระงาน: ${tasks || 'ไม่มีข้อมูล'}
กิจกรรมการเรียนรู้: ${learningProcess || 'ไม่มีข้อมูล'}

หลักการสำคัญ
1. การประเมินต้องตอบสนองจุดประสงค์ K, P, A อย่างชัดเจน
2. เครื่องมือและวิธีการวัดต้องเหมาะสมกับกิจกรรมและชิ้นงาน
3. เกณฑ์ Rubric ต้องแบ่งเป็น 5 ระดับ (5, 4, 3, 2, 1) และเขียนอธิบายพฤติกรรมหรือคุณภาพงานให้ชัดเจน
4. ห้ามส่งคำตอบที่ไม่ครบถ้วน หรือตัดจบทิ้งกลางคัน

ให้ตอบกลับเป็น JSON Object เท่านั้น (ห้ามมีอักขระอื่นนอกเหนือจาก JSON) โดยมีคีย์ดังต่อไปนี้:
1. measureK: (สิ่งที่ต้องการวัดและประเมินผล ด้านความรู้ K)
2. methodK: (วิธีการวัด K)
3. toolK: (เครื่องมือวัด K)
4. criteriaK: (เกณฑ์การผ่าน K)
5. rubricK: (เกณฑ์ Rubric K 5 ระดับ: 5, 4, 3, 2, 1)
6. measureP: (สิ่งที่ต้องการวัดและประเมินผล ด้านทักษะ P)
7. methodP: (วิธีการวัด P)
8. toolP: (เครื่องมือวัด P)
9. criteriaP: (เกณฑ์การผ่าน P)
10. rubricP: (เกณฑ์ Rubric P 5 ระดับ: 5, 4, 3, 2, 1)
11. measureA: (สิ่งที่ต้องการวัดและประเมินผล ด้านคุณลักษณะ A)
12. methodA: (วิธีการวัด A)
13. toolA: (เครื่องมือวัด A)
14. criteriaA: (เกณฑ์การผ่าน A)
15. rubricA: (เกณฑ์ Rubric A 5 ระดับ: 5, 4, 3, 2, 1)
16. resultK: (ผลการจัดการเรียนรู้ K ที่คาดหวัง)
17. resultP: (ผลการจัดการเรียนรู้ P ที่คาดหวัง)
18. resultA: (ผลการจัดการเรียนรู้ A ที่คาดหวัง)
19. problems: (ปัญหาและอุปสรรคที่อาจเกิดขึ้นระหว่างการจัดกิจกรรมนี้)
20. solutions: (แนวทางแก้ไขและการพัฒนา)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
      }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 3);
    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error('Invalid response payload structure from Gemini API');
    }

    let cleanedText = aiText.trim();
    if (cleanedText.startsWith('\`\`\`')) {
      cleanedText = cleanedText.replace(/^\`\`\`(?:json)?\n?/, '').replace(/\n?\`\`\`$/, '');
    }
    cleanedText = cleanedText.trim();

    const parsedData = JSON.parse(cleanedText);

    return NextResponse.json({
      success: true,
      data: {
        ...parsedData,
        isAiDraft: true
      }
    });

  } catch (error: any) {
    console.error('Gemini AI Phase 2 endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI generation'
    }, { status: 500 });
  }
}
