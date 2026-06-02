import { NextRequest, NextResponse } from 'next/server';

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
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `คุณคือผู้เชี่ยวชาญด้านหลักสูตรการศึกษาขั้นพื้นฐานของไทย 
จงช่วยร่างเนื้อหาแผนการจัดการเรียนรู้ฉบับสมบูรณ์ สำหรับระดับชั้น: ${gradeLevel}, วิชา: ${subjectName}, เรื่อง: ${lessonTopic}

ให้วิเคราะห์จากชื่อเรื่องและระดับชั้น แล้วตอบกลับเป็น JSON Object เท่านั้น (ห้ามมีอักขระอื่นนอกเหนือจาก JSON) โดยมีคีย์ดังต่อไปนี้:
1. learningStandard: (วิเคราะห์มาตรฐานการเรียนรู้ที่สอดคล้องกับเรื่องนี้ เช่น มาตรฐาน ต 1.1)
2. indicatorDuring: (วิเคราะห์ตัวชี้วัดระหว่างทางที่สอดคล้องกับเรื่องนี้ ระบุรหัสและข้อความ เช่น ต 1.1 ม.x/x...)
3. indicatorFinal: (วิเคราะห์ตัวชี้วัดปลายทางที่สอดคล้องกับเรื่องนี้ ระบุรหัสและข้อความ เช่น ต 1.2 ม.x/x...)
4. essentialConcept: (เนื้อหาสาระสำคัญแบบสรุป สรุปความคิดรวบยอด สั้นกระชับ)
5. objectiveK: (จุดประสงค์การเรียนรู้ ด้านความรู้ K)
6. objectiveP: (จุดประสงค์การเรียนรู้ ด้านทักษะกระบวนการ P)
7. objectiveA: (จุดประสงค์การเรียนรู้ ด้านคุณลักษณะ A)
8. learningContent: (เนื้อหาสาระการเรียนรู้ อธิบายหัวข้อย่อย คำศัพท์ หรือโครงสร้างเนื้อหา)
9. learningMedia: (แนะนำสื่อการเรียนรู้ 3-4 รายการที่เหมาะกับเรื่องนี้ เช่น - ใบงานคำศัพท์\\n- วิดีโอคลิปสั้น\\n- บัตรคำศัพท์)
10. learningSources: (แนะนำแหล่งเรียนรู้เพิ่มเติม เช่น - อินเทอร์เน็ต\\n- ห้องสมุด)
11. tasks: (ชิ้นงานหรือภาระงานของนักเรียน เช่น - แบบฝึกหัดบทสนทนา\\n- ใบงานคำศัพท์)
12. learningProcess: (วิธีดำเนินกิจกรรมแบบ Active Learning ระบุสิ่งที่ครูและนักเรียนทำ แบ่งเป็นขั้นนำ, ขั้นสอน, ขั้นสรุป ให้ชัดเจน)
13. methodK: (วิธีการวัด ด้าน K เช่น การทดสอบ, การตรวจใบงาน)
14. toolK: (เครื่องมือวัด ด้าน K เช่น แบบทดสอบ, ใบงาน)
15. criteriaK: (เกณฑ์ประเมิน ด้าน K เช่น ผ่านเกณฑ์ร้อยละ 60)
16. methodP: (วิธีการวัด ด้าน P เช่น การประเมินทักษะพูด)
17. toolP: (เครื่องมือวัด ด้าน P เช่น แบบประเมินภาระงาน)
18. criteriaP: (เกณฑ์ประเมิน ด้าน P เช่น ผ่านเกณฑ์ระดับคุณภาพดีขึ้นไป)
19. methodA: (วิธีการวัด ด้าน A เช่น การสังเกตพฤติกรรม)
20. toolA: (เครื่องมือวัด ด้าน A เช่น แบบประเมินคุณลักษณะ)
21. criteriaA: (เกณฑ์ประเมิน ด้าน A เช่น ผ่านเกณฑ์ระดับคุณภาพดีขึ้นไป)
22. resultK: (จำลอง "ผลการจัดการเรียนรู้" หลังสอนเสร็จ ด้าน K เพื่อให้ครูดูเป็นแนวทาง เช่น นักเรียนร้อยละ 85 เข้าใจคำศัพท์...)
23. resultP: (จำลอง "ผลการจัดการเรียนรู้" ด้าน P เช่น นักเรียนส่วนใหญ่พูดสื่อสารได้ดี มีบางส่วนต้องพัฒนาเพิ่มเติม...)
24. resultA: (จำลอง "ผลการจัดการเรียนรู้" ด้าน A เช่น นักเรียนใฝ่เรียนรู้และให้ความร่วมมือในการทำงานกลุ่ม...)
25. problems: (จำลอง "ปัญหาและอุปสรรค" ที่อาจพบในการสอนเรื่องนี้ เช่น นักเรียนบางคนสมาธิสั้นหรือจำคำศัพท์ไม่ได้...)
26. solutions: (จำลอง "แนวทางแก้ไขและการพัฒนา" เพื่อเป็นแนวทางให้ครู เช่น จัดกิจกรรมกลุ่มคละความสามารถ...)`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      next: { revalidate: 0 } // Bypass caching
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API responded with status ${response.status}: ${errText}`);
    }

    const resJson = await response.json();
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      throw new Error('Invalid response payload structure from Gemini API');
    }

    // Parse the generated text into JSON
    const parsedData = JSON.parse(aiText.trim());

    return NextResponse.json({
      success: true,
      data: parsedData
    });

  } catch (error: any) {
    console.error('Gemini AI endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error occurred during AI generation'
    }, { status: 500 });
  }
}
