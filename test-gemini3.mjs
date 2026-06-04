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
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    const resJson = JSON.parse(text);
    const aiText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let cleanedText = aiText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    cleanedText = cleanedText.trim();
    
    console.log("Raw AI Text Starts with:", cleanedText.substring(0, 50));
    const parsedData = JSON.parse(cleanedText);
    console.log("Successfully parsed JSON!");
  } catch (e) {
    console.error("Failed to parse AI output:", e.message);
  }
}

run();
