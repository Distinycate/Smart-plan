import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';
import { getCurriculumBySubject, formatStandards, formatDuringIndicators, formatFinalIndicators } from '@/lib/subjectStandardsData';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { gradeLevel, subjectName, lessonTopic, learningArea } = await req.json();

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

    let indicatorPrompt = '';
    
    if (learningArea && gradeLevel) {
      // Fetch dynamic curriculum from DB instead of hardcoded fallback
      const { data: dbIndicators, error: dbError } = await supabase
        .from('Indicators')
        .select('*')
        .eq('gradeLevel', gradeLevel)
        .eq('learningArea', learningArea)
        .eq('isActive', true)
        .order('indicatorCode', { ascending: true });
        
      if (dbIndicators && dbIndicators.length > 0) {
        // Group by standards
        const standardsMap = new Map<string, string>();
        const duringInds: string[] = [];
        const finalInds: string[] = [];
        
        dbIndicators.forEach(ind => {
          if (ind.standardCode && ind.standardText && !standardsMap.has(ind.standardCode)) {
            standardsMap.set(ind.standardCode, ind.standardText);
          }
          if (ind.indicatorType === 'during') {
            duringInds.push(`- ${ind.indicatorCode} ${ind.indicatorText}`);
          } else {
            finalInds.push(`- ${ind.indicatorCode} ${ind.indicatorText}`);
          }
        });
        
        let standardsStr = '';
        standardsMap.forEach((text, code) => {
          standardsStr += `- ${code} ${text}\n`;
        });
        
        indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดของวิชา ${subjectName} ระดับชั้น ${gradeLevel} (บังคับเลือกจากรายการนี้เท่านั้น):
[มาตรฐานการเรียนรู้ที่มีทั้งหมด]
${standardsStr || 'ไม่มีข้อมูลมาตรฐาน'}

[ตัวชี้วัดระหว่างทางที่มีทั้งหมด]
${duringInds.length > 0 ? duringInds.join('\n') : 'ไม่มีข้อมูลตัวชี้วัดระหว่างทาง'}

[ตัวชี้วัดปลายทางที่มีทั้งหมด]
${finalInds.length > 0 ? finalInds.join('\n') : 'ไม่มีข้อมูลตัวชี้วัดปลายทาง'}

** คำสั่งพิเศษ ** 
เลือกเฉพาะตัวชี้วัดที่สอดคล้องกับเรื่องที่สอน (${lessonTopic}) มากที่สุด (1-3 ข้อ) ห้ามนำตัวชี้วัดของวิชาอื่นมาปะปนเด็ดขาด`;
      } else {
        indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัด: ให้วิเคราะห์เองจากเรื่องที่สอนตามหลักสูตรแกนกลาง`;
      }
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
1. ให้สร้างข้อมูลเฉพาะ 8 ส่วนแรกของแผนการสอนเท่านั้น (เพื่อความรวดเร็ว) ได้แก่ มาตรฐาน, ตัวชี้วัด, จุดประสงค์ K/P/A, สมรรถนะ, คุณลักษณะ, ทักษะศตวรรษที่ 21 และ กระบวนการสอน (5 ขั้นตอน: นำ, สอน, ฝึก, ประยุกต์, สรุป)
2. ทุกองค์ประกอบต้องสัมพันธ์กัน
3. ใช้ภาษาราชการทางการศึกษา
${errorMemoryText}

ให้ตอบกลับเป็น JSON Object เท่านั้น โดยมีคีย์ดังต่อไปนี้:
1. essentialConcept: (เนื้อหาสาระสำคัญแบบสรุป)
2. learningStandard: (ระบุมาตรฐานที่ใช้)
3. indicatorDuring: (ระบุตัวชี้วัดระหว่างทางที่ใช้)
4. indicatorFinal: (ระบุตัวชี้วัดปลายทางที่ใช้)
5. objectiveK: (จุดประสงค์การเรียนรู้ ด้านความรู้ K)
6. objectiveP: (จุดประสงค์การเรียนรู้ ด้านทักษะกระบวนการ P)
7. objectiveA: (จุดประสงค์การเรียนรู้ ด้านคุณลักษณะ A)
8. competencies: (วิเคราะห์สมรรถนะสำคัญ แจกแจงเป็นข้อๆ)
9. desiredAttributes: (วิเคราะห์คุณลักษณะอันพึงประสงค์ แจกแจงเป็นข้อๆ)
10. skills21: (วิเคราะห์ทักษะในศตวรรษที่ 21 แจกแจงเป็นข้อๆ)
11. learningProcess: (วิธีดำเนินกิจกรรม 5 ขั้นตอน ได้แก่ 1. ขั้นนำ 2. ขั้นสอน 3. ขั้นฝึก 4. ขั้นประยุกต์ 5. ขั้นสรุป อธิบายโดยละเอียด และระบุชัดเจนว่าใครทำอะไร อย่างไร)`;

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
    } catch (parseError: any) {
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
