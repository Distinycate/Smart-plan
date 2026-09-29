/**
 * Smart Plan V3.4 — Real Gemini AI Smoke Test
 * Tests live generation against Google Gemini 2.5 Flash for:
 * 1. English Speaking
 * 2. Mathematics Problem Solving
 * 3. Science Experiment
 *
 * CRITICAL: NEVER logs API keys or sensitive user credentials!
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

async function callGemini(systemInstruction, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY_PROCESS || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No GEMINI_API_KEY found');

  const modelName = 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
      temperature: 0.2,
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('No text returned from Gemini API');

  let cleaned = rawText.trim();
  const match = cleaned.match(/```(?:json)?([\s\S]*?)```/);
  if (match) cleaned = match[1].trim();
  cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  return JSON.parse(cleaned);
}

async function runSmokeTests() {
  console.log('🚀 Running Real Gemini Smoke Tests for Wave V3.4...\n');

  // Case 1: English Speaking
  console.log('── Case 1: English Speaking 60 min ──');
  const sysInst = `คุณเป็นผู้เชี่ยวชาญด้านการจัดการเรียนรู้เชิงรุก (Active Learning) สำหรับครูไทย ออกแบบกิจกรรม 60 นาที ตอบเป็น JSON เท่านั้น`;
  const prompt1 = `ออกแบบ Lesson Blueprint 60 นาที วิชาภาษาอังกฤษ ม.1 เรื่อง Jobs
ลักษณะวิชา: SPEAKING (เน้นการพูดเพื่อการสื่อสารจริง นักเรียนต้องมีเวลาฝึกพูดจริง)
ตัวชี้วัด: [ต 1.2 ม.1/1] พูดและเขียนบรรยายเกี่ยวกับตนเอง กิจวัตรประจำวัน ประสบการณ์ และสิ่งแวดล้อมใกล้ตัว
จุดประสงค์:
[O1] นักเรียนสามารถออกเสียงคำศัพท์เกี่ยวกับอาชีพได้ถูกต้อง
[O2] นักเรียนสามารถจับคู่ถามและตอบเกี่ยวกับอาชีพที่ใฝ่ฝันได้
หลักฐาน:
[E1] การสนทนาถาม-ตอบเกี่ยวกับอาชีพในฝัน (SPEAKING)
ความเชื่อมโยง: O1 และ O2 เชื่อมกับ E1

ส่ง JSON ที่มี summary และ activities (4-7 กิจกรรม รวมเวลา 60 นาที, มี title, phase, minutes, teacherActions, studentActions ห้ามว่าง, linkedObjectiveRefs [O1, O2], linkedEvidenceRefs [E1])`;

  try {
    const t0 = Date.now();
    const res1 = await callGemini(sysInst, prompt1);
    const ms1 = Date.now() - t0;
    console.log(`  ✓ Gemini Response received in ${ms1}ms`);
    console.log(`  ✓ Activities count: ${res1.activities?.length}`);
    const totalMin1 = res1.activities?.reduce((s, a) => s + (a.minutes || 0), 0);
    console.log(`  ✓ Total minutes: ${totalMin1}/60`);

    const speakingObs = res1.activities?.some(a =>
      JSON.stringify(a.studentActions).includes('พูด') ||
      JSON.stringify(a.studentActions).includes('สนทนา') ||
      JSON.stringify(a.studentActions).includes('ถาม')
    );
    console.log(`  ✓ Quality Observation: Students actually speak? ${speakingObs ? 'YES (นักเรียนได้ฝึกพูดจริง)' : 'NO'}`);
  } catch (err) {
    console.error('  ✗ Case 1 Failed:', err.message);
  }

  // Case 2: Mathematics Problem Solving
  console.log('\n── Case 2: Mathematics Problem Solving 60 min ──');
  const prompt2 = `ออกแบบ Lesson Blueprint 60 นาที วิชาคณิตศาสตร์ ม.2 เรื่อง การแก้สมการเชิงเส้นตัวแปรเดียว
ลักษณะวิชา: PROBLEM_SOLVING (เน้นการแก้ปัญหา แสดงวิธีคิด อธิบายเหตุผล ไม่ประเมินเฉพาะคำตอบสุดท้าย)
ตัวชี้วัด: [ค 1.3 ม.2/1] เข้าใจและใช้สมบัติของการเท่ากันและสมบัติของจำนวน เพื่อวิเคราะห์และแก้ปัญหา
จุดประสงค์:
[O1] นักเรียนสามารถวิเคราะห์และวางแผนแก้โจทย์ปัญหาทางคณิตศาสตร์ได้
[O2] นักเรียนสามารถอธิบายเหตุผลและวิธีคิดในการแก้สมการได้
หลักฐาน:
[E1] ใบกิจกรรมแสดงวิธีคิดและคำอธิบายกระบวนการแก้โจทย์ (PROBLEM_SET)

ส่ง JSON ที่มี summary และ activities (4-7 กิจกรรม รวมเวลา 60 นาที, มี title, phase, minutes, teacherActions, studentActions ห้ามว่าง, linkedObjectiveRefs [O1, O2], linkedEvidenceRefs [E1])`;

  try {
    const t0 = Date.now();
    const res2 = await callGemini(sysInst, prompt2);
    const ms2 = Date.now() - t0;
    console.log(`  ✓ Gemini Response received in ${ms2}ms`);
    console.log(`  ✓ Activities count: ${res2.activities?.length}`);
    const totalMin2 = res2.activities?.reduce((s, a) => s + (a.minutes || 0), 0);
    console.log(`  ✓ Total minutes: ${totalMin2}/60`);

    const reasoningObs = res2.activities?.some(a =>
      JSON.stringify(a.studentActions).includes('คิด') ||
      JSON.stringify(a.studentActions).includes('วิเคราะห์') ||
      JSON.stringify(a.studentActions).includes('อธิบาย') ||
      JSON.stringify(a.studentActions).includes('แก้โจทย์')
    );
    console.log(`  ✓ Quality Observation: Students reason and explain? ${reasoningObs ? 'YES (นักเรียนได้คิดและอธิบายวิธีคิด)' : 'NO'}`);
  } catch (err) {
    console.error('  ✗ Case 2 Failed:', err.message);
  }

  // Case 3: Science Experiment
  console.log('\n── Case 3: Science Experiment 60 min ──');
  const prompt3 = `ออกแบบ Lesson Blueprint 60 นาที วิชาวิทยาศาสตร์ ม.1 เรื่อง การสังเคราะห์ด้วยแสงของพืช
ลักษณะวิชา: EXPERIMENT (เน้นการปฏิบัติทดลองจริง เก็บข้อมูล วิเคราะห์ข้อมูล และใช้หลักฐานในการสรุป)
ตัวชี้วัด: [ว 1.2 ม.1/1] อธิบายความสำคัญของการสังเคราะห์ด้วยแสงของพืชต่อสิ่งมีชีวิตและสิ่งแวดล้อม
จุดประสงค์:
[O1] นักเรียนสามารถทดสอบการมีอยู่ของแป้งในใบไม้ได้
[O2] นักเรียนสามารถสรุปปัจจัยในการสังเคราะห์ด้วยแสงจากหลักฐานการทดลองได้
หลักฐาน:
[E1] บันทึกผลการทดลองการทดสอบแป้งในใบไม้ (EXPERIMENT)

ส่ง JSON ที่มี summary และ activities (4-7 กิจกรรม รวมเวลา 60 นาที, มี title, phase, minutes, teacherActions, studentActions ห้ามว่าง, linkedObjectiveRefs [O1, O2], linkedEvidenceRefs [E1])`;

  try {
    const t0 = Date.now();
    const res3 = await callGemini(sysInst, prompt3);
    const ms3 = Date.now() - t0;
    console.log(`  ✓ Gemini Response received in ${ms3}ms`);
    console.log(`  ✓ Activities count: ${res3.activities?.length}`);
    const totalMin3 = res3.activities?.reduce((s, a) => s + (a.minutes || 0), 0);
    console.log(`  ✓ Total minutes: ${totalMin3}/60`);

    const expObs = res3.activities?.some(a =>
      JSON.stringify(a.studentActions).includes('ทดลอง') ||
      JSON.stringify(a.studentActions).includes('บันทึก') ||
      JSON.stringify(a.studentActions).includes('สังเกต')
    );
    console.log(`  ✓ Quality Observation: Hands-on experiment & data? ${expObs ? 'YES (นักเรียนได้ทดลองและบันทึกผลจริง)' : 'NO'}`);
  } catch (err) {
    console.error('  ✗ Case 3 Failed:', err.message);
  }

  console.log('\n🎉 Real AI Smoke Tests Completed!\n');
}

runSmokeTests();
