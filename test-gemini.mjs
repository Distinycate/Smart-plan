import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-2.5-flash';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const prompt = `ทดสอบการทำงานของ AI ตอบกลับเป็น JSON object { "status": "ok" }`;

const payload = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { 
    responseMimeType: 'application/json',
    maxOutputTokens: 8192
  }
};

async function run() {
  console.log("Fetching...");
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error(e);
  }
}

run();
