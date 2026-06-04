import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-2.5-flash';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const prompt = `
คุณคือผู้เชี่ยวชาญด้านหลักสูตรการศึกษาขั้นพื้นฐานของประเทศไทย
หน้าที่ของคุณคือจัดทำแผนการจัดการเรียนรู้ที่มีคุณภาพสูง
สำหรับระดับชั้น: ม.1, วิชา: วิทยาศาสตร์, เรื่อง: ระบบสุริยะ

ให้ตอบกลับเป็น JSON Object เท่านั้น (ห้ามมีอักขระอื่นนอกเหนือจาก JSON) โดยมีคีย์ 35 คีย์ ได้แก่:
1. learningStandard:
2. indicatorDuring:
3. indicatorFinal:
4. essentialConcept:
5. objectiveK:
... (ให้สร้างข้อมูลเต็มรูปแบบจนครบ 35 คีย์)
`;

const payload = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { 
    responseMimeType: 'application/json',
    maxOutputTokens: 8192
  }
};

async function run() {
  console.log("Fetching...");
  const start = Date.now();
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(`Status: ${res.status} (Time: ${Date.now() - start}ms)`);
    if (res.status === 200) {
      console.log("Success! Length:", text.length);
    } else {
      console.log("Error response:", text);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
