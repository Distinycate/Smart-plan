import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { supabase } from '@/lib/supabase';
import { getCurriculumBySubject, formatStandards, formatDuringIndicators, formatFinalIndicators } from '@/lib/subjectStandardsData';
import { clipForAi, fastGeminiUrl, fastJsonGenerationConfig } from '@/lib/geminiRuntime';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {

    const { gradeLevel, subjectName, lessonTopic, learningArea, totalHours, learningStandard, indicatorDuring, indicatorFinal } = await req.json();

    if (!gradeLevel || !subjectName || !lessonTopic) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: gradeLevel, subjectName, lessonTopic'
      }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY_PROCESS || process.env.GEMINI_API_KEY;
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
        errorMemoryText = `\n\nMASTER ERROR MEMORY PROMPT\n[ข้อมูลอ้างอิง: ข้อผิดพลาดที่เคยพบในอดีต กรุณาเรียนรู้และห้ามทำผิดซ้ำ]\n`;
        distinctErrors.forEach(([issue, hint], idx) => {
          errorMemoryText += `${idx + 1}. ปัญหาที่เคยพบ: ${issue}\n   แนวทางแก้ไข: ${hint}\n`;
        });
        errorMemoryText += `\n** คำสั่งสำคัญ: ให้นำแนวทางแก้ไขเหล่านี้ไปปรับใช้ในการสร้างแผนครั้งนี้ เพื่อไม่ให้เกิดข้อผิดพลาดเดิมซ้ำอีก **\n`;
      }
    }

    let indicatorPrompt = '';
    
    const hasSelectedIndicators = learningStandard || indicatorDuring || indicatorFinal;
    
    if (hasSelectedIndicators) {
      indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดที่ผู้สอนเลือกไว้แล้ว (บังคับใช้ตามข้อมูลนี้ ห้ามคิดขึ้นมาใหม่เด็ดขาด):
[มาตรฐานการเรียนรู้]
${learningStandard || '-'}

[ตัวชี้วัดระหว่างทาง]
${indicatorDuring || '-'}

[ตัวชี้วัดปลายทาง]
${indicatorFinal || '-'}

** คำสั่งพิเศษ ** 
ให้ออกแบบจุดประสงค์ K/P/A และกระบวนการสอนให้สอดคล้องกับตัวชี้วัดเหล่านี้ และให้คัดลอกมาตรฐานและตัวชี้วัดเหล่านี้ส่งกลับมาใน JSON ด้วยห้ามดัดแปลง (ห้ามตัดรหัสตัวเลขตัวชี้วัดหรือมาตรฐานออกเด็ดขาด)`;
    } else if (learningArea && gradeLevel) {
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
            duringInds.push(`- ${ind.indicatorCode || ''} ${ind.indicatorText}`.trim());
          } else {
            finalInds.push(`- ${ind.indicatorCode || ''} ${ind.indicatorText}`.trim());
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
1. วิเคราะห์เรื่องที่สอน (${lessonTopic}) และเวลาเรียน (${totalHours || 1} ชั่วโมง)
2. เลือกมาตรฐานการเรียนรู้ และตัวชี้วัด ที่สอดคล้องกับเรื่องนี้ที่สุด จากรายการด้านบนเท่านั้น ห้ามคิดตัวชี้วัดขึ้นมาเอง และต้องระบุรหัสตัวชี้วัดด้วย (เช่น พ 1.1 ป.1/1)
3. เลือกจำนวนตัวชี้วัดให้เหมาะสมกับเวลาเรียน:
   - หากเวลาเรียน 1 ชั่วโมง ไม่ควรเกิน 2-3 ตัวชี้วัด
   - หากเวลาเรียน 2-3 ชั่วโมง ไม่ควรเกิน 3-5 ตัวชี้วัด
   เพื่อให้สามารถออกแบบกิจกรรมและการวัดผลได้อย่างมีคุณภาพ ไม่มากเกินไปจนสอนและประเมินไม่ทัน
4. ห้ามนำตัวชี้วัดของวิชาอื่นมาปะปนเด็ดขาด`;
      } else {
        // Fallback to local hardcoded curriculum data
        // Try to find matching learning area if exact subject name fails
        let localCurriculum = getCurriculumBySubject(subjectName, gradeLevel);
        if (!localCurriculum) {
           const allCurriculum = require('@/lib/subjectStandardsData').ALL_SUBJECT_CURRICULUM;
           if (allCurriculum) {
             localCurriculum = allCurriculum.find((s: any) => s.gradeLevel === gradeLevel && s.learningArea === learningArea);
           }
        }

        if (localCurriculum) {
           const standards = formatStandards(localCurriculum);
           const duringInds = formatDuringIndicators(localCurriculum);
           const finalInds = formatFinalIndicators(localCurriculum);
           
           indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัดของวิชา ${subjectName} ระดับชั้น ${gradeLevel} (บังคับเลือกจากรายการนี้เท่านั้น):
[มาตรฐานการเรียนรู้ที่มีทั้งหมด]
${standards || 'ไม่มีข้อมูลมาตรฐาน'}

[ตัวชี้วัดระหว่างทางที่มีทั้งหมด]
${duringInds || 'ไม่มีข้อมูลตัวชี้วัดระหว่างทาง'}

[ตัวชี้วัดปลายทางที่มีทั้งหมด]
${finalInds || 'ไม่มีข้อมูลตัวชี้วัดปลายทาง'}

** คำสั่งพิเศษ ** 
1. วิเคราะห์เรื่องที่สอน (${lessonTopic}) และเวลาเรียน (${totalHours || 1} ชั่วโมง)
2. เลือกมาตรฐานการเรียนรู้ และตัวชี้วัด ที่สอดคล้องกับเรื่องนี้ที่สุด จากรายการด้านบนเท่านั้น ห้ามคิดตัวชี้วัดขึ้นมาเอง และต้องระบุรหัสตัวชี้วัดด้วย (เช่น พ 1.1 ป.1/1)
3. เลือกจำนวนตัวชี้วัดให้เหมาะสมกับเวลาเรียน:
   - หากเวลาเรียน 1 ชั่วโมง ไม่ควรเกิน 2-3 ตัวชี้วัด
   - หากเวลาเรียน 2-3 ชั่วโมง ไม่ควรเกิน 3-5 ตัวชี้วัด
   เพื่อให้สามารถออกแบบกิจกรรมและการวัดผลได้อย่างมีคุณภาพ ไม่มากเกินไปจนสอนและประเมินไม่ทัน
4. ห้ามนำตัวชี้วัดของวิชาอื่นมาปะปนเด็ดขาด`;
        } else {
           indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัด: ให้วิเคราะห์เองจากเรื่องที่สอน (${lessonTopic}) ตามหลักสูตรแกนกลาง โดยให้เลือกจำนวนตัวชี้วัดให้เหมาะสมกับเวลาเรียน (แผน 1 ชั่วโมง ไม่เกิน 2-3 ตัวชี้วัด, แผน 2-3 ชั่วโมง ไม่เกิน 3-5 ตัวชี้วัด) และต้องระบุรหัสตัวชี้วัดมาด้วยให้ครบถ้วน`;
        }
      }
    } else {
      indicatorPrompt = `ข้อมูลมาตรฐานการเรียนรู้และตัวชี้วัด: ให้วิเคราะห์เองจากเรื่องที่สอน (${lessonTopic}) ตามหลักสูตรแกนกลาง โดยให้เลือกจำนวนตัวชี้วัดให้เหมาะสมกับเวลาเรียน (แผน 1 ชั่วโมง ไม่เกิน 2-3 ตัวชี้วัด, แผน 2-3 ชั่วโมง ไม่เกิน 3-5 ตัวชี้วัด) และต้องระบุรหัสตัวชี้วัดมาด้วยให้ครบถ้วน`;
    }

    const boundedIndicatorPrompt = clipForAi(indicatorPrompt, 8000);
    const prompt = `MASTER SYSTEM PROMPT V1 (STEP 1: LEARNING PROCESS)
สำหรับระบบสร้างแผนการจัดการเรียนรู้

คุณคือผู้เชี่ยวชาญด้าน Active Learning
หน้าที่ของคุณคือออกแบบ "กระบวนการจัดการเรียนรู้" ที่มีคุณภาพสูงและสามารถนำไปใช้จริงได้
สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

${boundedIndicatorPrompt}

หลักการสำคัญ
1. ให้สร้างข้อมูลเฉพาะ กระบวนการสอน (GPAS 5 ขั้นตอน: นำ, สอน, ฝึก, ประยุกต์, สรุป)
2. ทุกองค์ประกอบต้องสัมพันธ์กัน
3. ใช้ภาษาราชการทางการศึกษา
${errorMemoryText}

ให้ตอบกลับเป็น JSON Object เท่านั้น โดยมีคีย์ดังต่อไปนี้:
1. learningProcess: (วิธีดำเนินกิจกรรม 5 ขั้นตอน ได้แก่ 1. ขั้นนำ 2. ขั้นสอน 3. ขั้นฝึก 4. ขั้นประยุกต์ 5. ขั้นสรุป อธิบายโดยละเอียด และระบุชัดเจนว่าใครทำอะไร อย่างไร)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: fastJsonGenerationConfig(3072)
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
    console.error('Gemini AI Process endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI process generation'
    }, { status: 500 });
  }
}
