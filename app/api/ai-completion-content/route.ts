import { NextRequest, NextResponse } from 'next/server';
import { fetchGeminiWithRetry } from '@/lib/geminiClient';
import { fastGeminiUrl, fastJsonGenerationConfig } from '@/lib/geminiRuntime';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { gradeLevel, subjectName, lessonTopic, learningProcess } = await req.json();

    if (!gradeLevel || !subjectName || !lessonTopic || !learningProcess) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY_PROCESS || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Missing API Key');

    const apiUrl = fastGeminiUrl();

    const prompt = `MASTER SYSTEM PROMPT V1 (STEP 2: CONTENT & MEDIA)
สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

กระบวนการจัดการเรียนรู้ที่สร้างไว้แล้ว:
${learningProcess}

หน้าที่ของคุณคือ สกัดและสร้างข้อมูลต่อไปนี้ให้สอดคล้องกับกระบวนการจัดการเรียนรู้ด้านบนแบบ 100%:
1. เนื้อหาสาระ (Learning Content)
2. สื่อการเรียนรู้ (Media)
3. แหล่งเรียนรู้ (Sources)
4. ชิ้นงาน/ภาระงาน (Tasks)

**เงื่อนไขสำคัญ:**
- "ไม่เอาเยอะ เอาอย่างสองอย่างพอ" (กระชับ ตรงประเด็น)
- ต้องเป็นสิ่งที่ปรากฏอยู่ในกระบวนการจัดการเรียนรู้ด้านบนเท่านั้น ห้ามคิดสิ่งใหม่ที่ไม่ได้สอน

ให้ตอบกลับเป็น JSON Object เท่านั้น โดยมีคีย์ดังต่อไปนี้:
1. learningContent: (เนื้อหาสาระสำคัญแบบสรุปสั้นๆ)
2. learningMedia: (สื่อการเรียนรู้ 1-2 อย่าง)
3. learningSources: (แหล่งเรียนรู้ 1-2 อย่าง)
4. tasks: (ชิ้นงานหรือภาระงาน 1-2 อย่าง)
`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        ...fastJsonGenerationConfig(1024),
        responseSchema: {
          type: "OBJECT",
          properties: {
            learningContent: { type: "STRING" },
            learningMedia: { type: "ARRAY", items: { type: "STRING" } },
            learningSources: { type: "ARRAY", items: { type: "STRING" } },
            tasks: { type: "ARRAY", items: { type: "STRING" } }
          }
        }
      }
    };

    const response = await fetchGeminiWithRetry(apiUrl, payload, 3, apiKey, 'completion-content');
    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) throw new Error('Invalid response');

    let cleanedText = aiText.trim();
    const match = cleanedText.match(/```(?:json)?([\s\S]*?)```/);
    if (match) {
      cleanedText = match[1].trim();
    } else {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }
    
    return NextResponse.json({ success: true, data: JSON.parse(cleanedText) });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
