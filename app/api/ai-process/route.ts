import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';
import { getCurriculumBySubject, formatStandards, formatDuringIndicators, formatFinalIndicators } from '@/lib/subjectStandardsData';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { gradeLevel, subjectName, lessonTopic } = await req.json();

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

    // Fetch Best Practices (Error Memory)
    const { data: bestPractices } = await supabase.from('ai_best_practices').select('*').limit(5);
    let errorMemoryText = '';
    if (bestPractices && bestPractices.length > 0) {
      errorMemoryText = `\n\nMASTER ERROR MEMORY PROMPT\nข้อผิดพลาดที่เคยพบในระบบ:\n`;
      bestPractices.forEach((bp: any, idx: number) => {
        errorMemoryText += `${idx + 1}.\nประเภท:\n${bp.category}\nปัญหา:\n${bp.title}\nแนวทางแก้ไข:\n${bp.solution_pattern}\n`;
      });
      errorMemoryText += `กรุณาหลีกเลี่ยงข้อผิดพลาดเหล่านี้\n`;
    }

    const curriculum = getCurriculumBySubject(gradeLevel, subjectName);
    let indicatorPrompt = '';
    
    if (curriculum && (curriculum.standards.length > 0 || curriculum.indicators.length > 0)) {
      indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดของวิชา ${subjectName} ระดับชั้น ${gradeLevel} (บังคับเลือกจากรายการนี้เท่านั้น):
[มาตรฐานการเรียนรู้ที่มีทั้งหมด]
${formatStandards(curriculum)}

[ตัวชี้วัดระหว่างทางที่มีทั้งหมด]
${formatDuringIndicators(curriculum)}

[ตัวชี้วัดปลายทางที่มีทั้งหมด]
${formatFinalIndicators(curriculum)}

** คำสั่งพิเศษ ** 
เลือกเฉพาะตัวชี้วัดที่สอดคล้องกับเรื่องที่สอน (${lessonTopic}) มากที่สุด (1-3 ข้อ) ห้ามนำตัวชี้วัดของวิชาอื่นมาปะปนเด็ดขาด`;
    } else {
      indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัด: ให้วิเคราะห์เองจากเรื่องที่สอนตามหลักสูตรแกนกลาง`;
    }

    const prompt = `MASTER SYSTEM PROMPT V1 (STEP 1: LEARNING PROCESS & CORE STRUCTURE)
สำหรับระบบสร้างแผนการจัดการเรียนรู้

คุณคือผู้เชี่ยวชาญด้าน Active Learning
หน้าที่ของคุณคือออกแบบโครงสร้างหลัก และ "กระบวนการจัดการเรียนรู้" ที่มีคุณภาพสูงและสามารถนำไปใช้จริงได้
สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

${indicatorPrompt}

หลักการสำคัญ
1. ให้สร้างข้อมูลเฉพาะ 8 ส่วนแรกของแผนการสอนเท่านั้น (เพื่อความรวดเร็ว) ได้แก่ มาตรฐาน, ตัวชี้วัด, จุดประสงค์ K/P/A, สมรรถนะ, คุณลักษณะ, ทักษะศตวรรษที่ 21 และ กระบวนการสอน (Active Learning 5 ขั้นตอน)
2. ทุกองค์ประกอบต้องสัมพันธ์กัน
3. ใช้ภาษาราชการทางการศึกษา
${errorMemoryText}

ให้ตอบกลับเป็น JSON Object เท่านั้น โดยมีคีย์ดังต่อไปนี้:
1. learningStandard: (ระบุมาตรฐานที่ใช้)
2. indicatorDuring: (ระบุตัวชี้วัดระหว่างทางที่ใช้)
3. indicatorFinal: (ระบุตัวชี้วัดปลายทางที่ใช้)
4. objectiveK: (จุดประสงค์การเรียนรู้ ด้านความรู้ K)
5. objectiveP: (จุดประสงค์การเรียนรู้ ด้านทักษะกระบวนการ P)
6. objectiveA: (จุดประสงค์การเรียนรู้ ด้านคุณลักษณะ A)
7. competencies: (วิเคราะห์สมรรถนะสำคัญ แจกแจงเป็นข้อๆ)
8. desiredAttributes: (วิเคราะห์คุณลักษณะอันพึงประสงค์ แจกแจงเป็นข้อๆ)
9. skills21: (วิเคราะห์ทักษะในศตวรรษที่ 21 แจกแจงเป็นข้อๆ)
10. learningProcess: (วิธีดำเนินกิจกรรม Active Learning 5 ขั้นตอน: นำเข้าสู่บทเรียน นำเสนอ ฝึกฝน ประยุกต์ และสรุป อธิบายโดยละเอียด)`;

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
    const match = cleanedText.match(/```(?:json)?([\\s\\S]*?)```/);
    if (match) {
      cleanedText = match[1].trim();
    } else {
      cleanedText = cleanedText.replace(/^```(?:json)?\\n?/, '').replace(/\\n?```$/, '').trim();
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse JSON. Raw AI Output:", aiText);
      throw new Error(`AI output parsing failed: ${parseError.message}`);
    }

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Gemini AI Process endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI process generation'
    }, { status: 500 });
  }
}
