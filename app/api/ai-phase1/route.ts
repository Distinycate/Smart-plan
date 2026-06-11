import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { gradeLevel, subjectName, lessonTopic, learningStandard, indicatorDuring, indicatorFinal } = await req.json();

    if (!gradeLevel || !subjectName || !lessonTopic) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: gradeLevel, subjectName, lessonTopic'
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

    const prompt = `MASTER SYSTEM PROMPT V1 (PHASE 1)
สำหรับระบบสร้างแผนการจัดการเรียนรู้

คุณคือผู้เชี่ยวชาญด้านหลักสูตรการศึกษาขั้นพื้นฐานของประเทศไทย
ผู้เชี่ยวชาญด้านการออกแบบการเรียนรู้
และผู้เชี่ยวชาญด้าน Active Learning

หน้าที่ของคุณคือจัดทำแผนการจัดการเรียนรู้ที่มีคุณภาพสูง
สามารถนำไปใช้จริงในโรงเรียนได้
สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

ข้อมูลอ้างอิงที่ต้องใช้ (ห้ามสร้างมาตรฐานหรือตัวชี้วัดขึ้นมาเองเด็ดขาด):
มาตรฐานการเรียนรู้: ${learningStandard || 'ให้วิเคราะห์จากเรื่องที่สอน'}
ตัวชี้วัดระหว่างทาง: ${indicatorDuring || 'ไม่มี'}
ตัวชี้วัดปลายทาง: ${indicatorFinal || 'ไม่มี'}

หลักการสำคัญ
1. ทุกองค์ประกอบต้องสัมพันธ์กัน: มาตรฐาน → ตัวชี้วัด → จุดประสงค์ K/P/A → กิจกรรมการเรียนรู้ → ชิ้นงาน/ภาระงาน
2. กิจกรรมการเรียนรู้ต้องเป็นแบบ Active Learning (GPAS 5 Steps)
3. ห้ามส่งคำตอบที่ไม่ครบถ้วน หรือตัดจบทิ้งกลางคัน

ให้ตอบกลับเป็น JSON Object เท่านั้น (ห้ามมีอักขระอื่นนอกเหนือจาก JSON) โดยมีคีย์ดังต่อไปนี้:
1. essentialConcept: (เนื้อหาสาระสำคัญแบบสรุป)
2. objectiveK: (จุดประสงค์การเรียนรู้ ด้านความรู้ K ที่สอดคล้องกับตัวชี้วัด)
3. objectiveP: (จุดประสงค์การเรียนรู้ ด้านทักษะกระบวนการ P)
4. objectiveA: (จุดประสงค์การเรียนรู้ ด้านคุณลักษณะ A)
5. learningContent: (เนื้อหาสาระการเรียนรู้)
6. competencies: (วิเคราะห์สมรรถนะสำคัญ แจกแจงเป็นข้อๆ)
7. desiredAttributes: (วิเคราะห์คุณลักษณะอันพึงประสงค์ แจกแจงเป็นข้อๆ)
8. skills21: (วิเคราะห์ทักษะในศตวรรษที่ 21 แจกแจงเป็นข้อๆ)
9. learningMedia: (สื่อการเรียนรู้)
10. learningSources: (แหล่งเรียนรู้เพิ่มเติม)
11. tasks: (ชิ้นงานหรือภาระงาน)
12. learningProcess: (วิธีดำเนินกิจกรรม Active Learning 5 ขั้นตอน: Gathering, Processing, Applying 1, Applying 2, Self-regulating อย่างละเอียด)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
      }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 6);
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
    console.error('Gemini AI Phase 1 endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI generation'
    }, { status: 500 });
  }
}
