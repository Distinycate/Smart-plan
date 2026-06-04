import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';
import { getCurriculumBySubject, formatStandards, formatDuringIndicators, formatFinalIndicators } from '@/lib/subjectStandardsData';

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
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Fetch Best Practices (Error Memory)
    const { data: bestPractices } = await supabase.from('ai_best_practices').select('*').limit(5);
    let errorMemoryText = '';
    if (bestPractices && bestPractices.length > 0) {
      errorMemoryText = `\n\nMASTER ERROR MEMORY PROMPT\nดึงข้อมูลจาก Supabase ก่อนส่งให้ AI\nข้อผิดพลาดที่เคยพบในระบบ:\n`;
      bestPractices.forEach((bp: any, idx: number) => {
        errorMemoryText += `${idx + 1}.\nประเภท:\n${bp.category}\nปัญหา:\n${bp.title}\nแนวทางแก้ไข:\n${bp.solution_pattern}\n`;
      });
      errorMemoryText += `กรุณาหลีกเลี่ยงข้อผิดพลาดเหล่านี้\n`;
    }

    // Fetch Training Examples (Knowledge Base)
    const { data: examples } = await supabase.from('ai_training_examples').select('*').eq('is_active', true).limit(1);
    let knowledgeBaseText = '';
    if (examples && examples.length > 0) {
      knowledgeBaseText = `\n\nMASTER KNOWLEDGE BASE PROMPT\nกรณีมีคลังแผนตัวอย่าง\nตัวอย่างแผนการจัดการเรียนรู้คุณภาพสูง:\n`;
      examples.forEach((ex: any, idx: number) => {
        knowledgeBaseText += `[ตัวอย่างแผนการจัดการเรียนรู้]\n${JSON.stringify(ex.example_content, null, 2)}\n`;
      });
      knowledgeBaseText += `\nใช้แผนตัวอย่างเป็นแนวทาง\nข้อกำหนด\n1. ห้ามคัดลอกข้อความ\n2. ใช้เป็นแนวทางด้านโครงสร้าง\n3. ใช้เป็นแนวทางด้านระดับความละเอียด\n4. รักษาคุณภาพเทียบเท่าหรือสูงกว่า\n5. ปรับให้เหมาะสมกับข้อมูลใหม่\n`;
    }

    const prompt = `MASTER SYSTEM PROMPT V1
สำหรับระบบสร้างแผนการจัดการเรียนรู้

คุณคือผู้เชี่ยวชาญด้านหลักสูตรการศึกษาขั้นพื้นฐานของประเทศไทย
ผู้เชี่ยวชาญด้านการออกแบบการเรียนรู้
ผู้เชี่ยวชาญด้าน Active Learning
ผู้เชี่ยวชาญด้านการวัดและประเมินผลตามสภาพจริง
และผู้เชี่ยวชาญด้านการจัดทำแผนการจัดการเรียนรู้

หน้าที่ของคุณคือจัดทำแผนการจัดการเรียนรู้ที่มีคุณภาพสูง
สามารถนำไปใช้จริงในโรงเรียนได้
สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

${(() => {
  const curriculum = getCurriculumBySubject(gradeLevel, subjectName);
  if (curriculum && (curriculum.standards.length > 0 || curriculum.indicators.length > 0)) {
    return `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดของวิชา ${subjectName} ระดับชั้น ${gradeLevel} (บังคับเลือกจากรายการนี้เท่านั้น ห้ามสร้างขึ้นมาเอง):
[มาตรฐานการเรียนรู้ที่มีทั้งหมด]
${formatStandards(curriculum)}

[ตัวชี้วัดระหว่างทางที่มีทั้งหมด]
${formatDuringIndicators(curriculum)}

[ตัวชี้วัดปลายทางที่มีทั้งหมด]
${formatFinalIndicators(curriculum)}

** คำสั่งพิเศษ ** 
คุณต้องเลือกดึงเฉพาะมาตรฐานและตัวชี้วัดจากรายการด้านบนที่ "สอดคล้องกับเรื่องที่สอน (${lessonTopic})" มากที่สุดเท่านั้น ห้ามนำตัวชี้วัดที่ไม่ได้อยู่ในรายการนี้มาใช้เด็ดขาด และห้ามสร้างตัวชี้วัดขึ้นมาเอง`;
  } else {
    return `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดที่ต้องใช้ (ห้ามสร้างขึ้นมาเอง):
มาตรฐานการเรียนรู้: ${learningStandard || 'ให้วิเคราะห์จากเรื่องที่สอน (ตามหลักสูตรแกนกลาง)'}
ตัวชี้วัดระหว่างทาง: ${indicatorDuring || 'ให้วิเคราะห์จากเรื่องที่สอน (ตามหลักสูตรแกนกลาง)'}
ตัวชี้วัดปลายทาง: ${indicatorFinal || 'ให้วิเคราะห์จากเรื่องที่สอน (ตามหลักสูตรแกนกลาง)'}`;
  }
})()}

หลักการสำคัญ
1. ทุกองค์ประกอบต้องสัมพันธ์กัน
มาตรฐาน → ตัวชี้วัด → จุดประสงค์ K/P/A → กิจกรรมการเรียนรู้ → ชิ้นงาน/ภาระงาน → การวัดผล → Rubric
2. ห้ามสร้างข้อมูลที่ไม่มีอยู่จริง
หากไม่มีข้อมูลตัวชี้วัด ให้แจ้งว่า "ไม่พบข้อมูลตัวชี้วัด" ห้ามเดา
3. ใช้ภาษาราชการทางการศึกษา
4. ใช้รูปแบบที่เหมาะสมกับระดับชั้น
5. คำนึงถึงเวลาเรียนที่กำหนด
6. ทุกกิจกรรมต้องสนับสนุนจุดประสงค์การเรียนรู้
7. ทุกการประเมินต้องเชื่อมโยงกับจุดประสงค์ K/P/A
8. ห้ามส่งคำตอบที่ไม่ครบถ้วน
9. หากข้อมูลไม่เพียงพอ ให้ระบุข้อมูลที่ต้องการเพิ่มเติม
10. ผลลัพธ์ต้องพร้อมใช้งานจริง
11. ตัวชี้วัดต้องตรงตามรายวิชาที่กำหนด ห้ามนำตัวชี้วัดของวิชาอื่นมาปะปนเด็ดขาด
${errorMemoryText}${knowledgeBaseText}
ให้ตอบกลับเป็น JSON Object เท่านั้น (ห้ามมีอักขระอื่นนอกเหนือจาก JSON) โดยมีคีย์ดังต่อไปนี้:
1. learningStandard: (ใช้มาตรฐานการเรียนรู้ที่กำหนดมาให้ หากมี)
2. indicatorDuring: (ใช้ตัวชี้วัดระหว่างทางที่กำหนดมาให้ หากมี)
3. indicatorFinal: (ใช้ตัวชี้วัดปลายทางที่กำหนดมาให้ หากมี)
4. essentialConcept: (เนื้อหาสาระสำคัญแบบสรุป)
5. objectiveK: (จุดประสงค์การเรียนรู้ ด้านความรู้ K ที่สอดคล้องกับตัวชี้วัด)
6. objectiveP: (จุดประสงค์การเรียนรู้ ด้านทักษะกระบวนการ P)
7. objectiveA: (จุดประสงค์การเรียนรู้ ด้านคุณลักษณะ A)
8. learningContent: (เนื้อหาสาระการเรียนรู้)
9. competencies: (วิเคราะห์สมรรถนะสำคัญ แจกแจงเป็นข้อๆ)
10. desiredAttributes: (วิเคราะห์คุณลักษณะอันพึงประสงค์ แจกแจงเป็นข้อๆ)
11. skills21: (วิเคราะห์ทักษะในศตวรรษที่ 21 แจกแจงเป็นข้อๆ)
12. learningMedia: (สื่อการเรียนรู้)
13. learningSources: (แหล่งเรียนรู้เพิ่มเติม)
14. tasks: (ชิ้นงานหรือภาระงาน)
15. learningProcess: (วิธีดำเนินกิจกรรม Active Learning 5 ขั้นตอน: Warm-up, Presentation, Practice, Production, Wrap-up ละเอียดๆ)
16. measureK: (สิ่งที่ต้องการวัดและประเมินผล K)
17. methodK: (วิธีการวัด K)
18. toolK: (เครื่องมือวัด K)
19. criteriaK: (เกณฑ์ประเมิน K)
20. rubricK: (เกณฑ์ Rubric K 5 ระดับ 5, 4, 3, 2, 1)
21. measureP: (สิ่งที่ต้องการวัดและประเมินผล P)
22. methodP: (วิธีการวัด P)
23. toolP: (เครื่องมือวัด P)
24. criteriaP: (เกณฑ์ประเมิน P)
25. rubricP: (เกณฑ์ Rubric P 5 ระดับ 5, 4, 3, 2, 1)
26. measureA: (สิ่งที่ต้องการวัดและประเมินผล A)
27. methodA: (วิธีการวัด A)
28. toolA: (เครื่องมือวัด A)
29. criteriaA: (เกณฑ์ประเมิน A)
30. rubricA: (เกณฑ์ Rubric A 5 ระดับ 5, 4, 3, 2, 1)
31. resultK: (ผลการจัดการเรียนรู้ K)
32. resultP: (ผลการจัดการเรียนรู้ P)
33. resultA: (ผลการจัดการเรียนรู้ A)
34. problems: (ปัญหาและอุปสรรค)
35. solutions: (แนวทางแก้ไขและการพัฒนา)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 3);

    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error('Invalid response payload structure from Gemini API');
    }

    // Parse the generated text into JSON, handling markdown block wrappers if present
    let cleanedText = aiText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    cleanedText = cleanedText.trim();

    const parsedData = JSON.parse(cleanedText);

    // --- PHASE 3: AI HALLUCINATION VALIDATION ---
    const { validateIndicators } = await import('@/lib/aiValidator');
    
    // Extract indicator codes from the generated text
    const indicatorRegex = /([ก-ฮ]\s*[๐-๙0-9]+\.[๐-๙0-9]+)\s+((?:ป|ม)\.[๐-๙0-9]+(?:-[๐-๙0-9]+)?)\/([๐-๙0-9]+)/g;
    const extractCodes = (text: string) => {
      if (!text) return [];
      const matches = Array.from(text.matchAll(indicatorRegex));
      return matches.map(m => `${m[1].trim()} ${m[2].trim()}/${m[3].trim()}`.replace(/\s+/g, ' '));
    };

    const codesToCheck = [
      ...extractCodes(parsedData.indicatorDuring || ''),
      ...extractCodes(parsedData.indicatorFinal || '')
    ];

    let validationResult = { isValid: true, hallucinatedIndicators: [] as string[] };
    if (codesToCheck.length > 0) {
      validationResult = await validateIndicators(codesToCheck);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...parsedData,
        isAiDraft: true, // Flag for UI to show warning
        aiValidation: validationResult
      }
    });

  } catch (error: any) {
    console.error('Gemini AI endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI generation'
    }, { status: 500 });
  }
}
