require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-flash-latest';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const prompt = `
คุณคือผู้เชี่ยวชาญด้านหลักสูตรการศึกษาขั้นพื้นฐานของประเทศไทย
หน้าที่ของคุณคือจัดทำแผนการจัดการเรียนรู้ที่มีคุณภาพสูงและสามารถนำไปใช้ได้จริงในห้องเรียน

ข้อมูลพื้นฐานของแผนการสอน:
- ระดับชั้น: ประถมศึกษาปีที่ 6
- รายวิชา: วิทยาศาสตร์
- เรื่องที่สอน: ระบบย่อยอาหาร

คำสั่ง:
จงสร้างเนื้อหาแผนการจัดการเรียนรู้โดยอิงจากแนวทาง Active Learning และ GPAS 5 Steps
การออกแบบกิจกรรมต้องเน้นให้ผู้เรียนได้ลงมือปฏิบัติจริง และวัดผลได้ตามสภาพจริง

ข้อควรระวังและแนวทางปฏิบัติที่ต้องปฏิบัติตามอย่างเคร่งครัด:
1. การระบุมาตรฐานและตัวชี้วัดต้องถูกต้องตามหลักสูตรแกนกลาง
2. ห้ามใช้ตัวชี้วัดที่ไม่มีอยู่จริงหรือสร้างขึ้นมาเองเด็ดขาด
3. จุดประสงค์การเรียนรู้ (K, P, A) ต้องสอดคล้องกับตัวชี้วัดที่เลือกมา
4. จุดประสงค์ K ต้องวัดความรู้ความเข้าใจ
5. จุดประสงค์ P ต้องวัดทักษะกระบวนการ หรือการปฏิบัติ
6. จุดประสงค์ A ต้องวัดคุณลักษณะ เจตคติ หรือพฤติกรรม
7. ทุกกิจกรรมต้องสนับสนุนจุดประสงค์การเรียนรู้
8. ทุกการประเมินต้องเชื่อมโยงกับจุดประสงค์ K/P/A
9. ห้ามส่งคำตอบที่ไม่ครบถ้วน หรือตัดจบทิ้งกลางคัน (ต้องตอบกลับให้ครบถ้วนทุกข้อจนถึงข้อสุดท้าย)

ให้ตอบกลับเป็น JSON Object เท่านั้น (ห้ามมีอักขระอื่นนอกเหนือจาก JSON) โดยมีคีย์ดังต่อไปนี้:
1. essentialConcept: (ความคิดรวบยอด)
2. objectiveK: (จุดประสงค์ K)
6. objectiveP: (จุดประสงค์ P)
7. objectiveA: (จุดประสงค์ A)
8. learningContent: (สาระการเรียนรู้)
9. competencies: (สมรรถนะสำคัญ)
10. desiredAttributes: (คุณลักษณะอันพึงประสงค์)
11. skills21: (ทักษะศตวรรษที่ 21)
12. learningProcess: (กิจกรรมการเรียนรู้แบบ Active Learning โดยแบ่งเป็นขั้นนำ ขั้นสอน ขั้นสรุป)
13. learningMedia: (สื่อการเรียนรู้)
14. learningSources: (แหล่งเรียนรู้)
15. tasks: (ภาระงาน/ชิ้นงาน)
16. measureK: (สิ่งที่ต้องการวัด K)
17. methodK: (วิธีการวัด K)
18. toolK: (เครื่องมือวัด K)
19. criteriaK: (เกณฑ์ประเมิน K)
20. rubricK: (เกณฑ์ Rubric K)
21. measureP: (สิ่งที่ต้องการวัด P)
22. methodP: (วิธีการวัด P)
23. toolP: (เครื่องมือวัด P)
24. criteriaP: (เกณฑ์ประเมิน P)
25. rubricP: (เกณฑ์ Rubric P)
26. measureA: (สิ่งที่ต้องการวัด A)
27. methodA: (วิธีการวัด A)
28. toolA: (เครื่องมือวัด A)
29. criteriaA: (เกณฑ์ประเมิน A)
30. rubricA: (เกณฑ์ Rubric A)
31. resultK: (ผลการจัดการเรียนรู้ K)
32. resultP: (ผลการจัดการเรียนรู้ P)
33. resultA: (ผลการจัดการเรียนรู้ A)
34. problems: (ปัญหาและอุปสรรค)
35. solutions: (แนวทางแก้ไข)
`;

const payload = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { 
    responseMimeType: 'application/json',
    maxOutputTokens: 8192
  }
};

async function run() {
  console.log("Testing with gemini-1.5-flash...");
  const start = Date.now();
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log("Time taken:", (Date.now() - start)/1000, "seconds");
    
    if (res.status === 200) {
      const resJson = JSON.parse(text);
      const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      
      let cleanedText = aiText.trim();
      if (cleanedText.startsWith('\`\`\`')) {
        cleanedText = cleanedText.replace(/^\`\`\`(?:json)?\n?/, '').replace(/\n?\`\`\`$/, '');
      }
      cleanedText = cleanedText.trim();
      
      const parsedData = JSON.parse(cleanedText);
      console.log("SUCCESS! Generated JSON with", Object.keys(parsedData).length, "keys.");
      console.log("Output Length:", JSON.stringify(parsedData).length, "characters");
      console.log("Sample learningProcess:", parsedData.learningProcess.substring(0, 100) + "...");
    } else {
      console.error("API returned error:", text);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

run();
