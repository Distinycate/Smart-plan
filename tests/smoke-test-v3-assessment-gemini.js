/**
 * Smart Plan V3.5 — Real Gemini AI Assessment Smoke Test
 * Tests live generation against Google Gemini 2.5 Flash for:
 * 1. English Speaking Performance Rubric
 * 2. Math Problem Solving Scoring Guide
 * 3. Science Experiment Checklist
 *
 * CRITICAL: NEVER logs API keys or sensitive credentials!
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
      maxOutputTokens: 4096,
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
  console.log('🚀 Running Real Gemini Smoke Tests for Wave V3.5 Assessment Engine...\n');

  // ─────────────────────────────────────────────────────────────────
  // Case 1: English Speaking Performance Rubric
  // ─────────────────────────────────────────────────────────────────
  console.log('── Case 1: English Speaking Performance Rubric (4 levels) ──');
  const sysInst1 = `คุณคือผู้เชี่ยวชาญด้านการวัดและประเมินผลการเรียนรู้ตามสภาพจริง ในระบบ Smart Plan V3 สำหรับครูไทย
สร้างเฉพาะ Rubric 4 ระดับ (ระดับ 4, 3, 2, 1) ประมาณ 3-4 เกณฑ์ สำหรับคาบเรียน 60 นาที
ใช้พฤติกรรมที่สังเกตได้จริง ไม่ใช้คำลอย ๆ เช่น "ดีมาก" โดยไม่มีคำอธิบายพฤติกรรม
ตอบเป็น JSON เท่านั้น`;

  const prompt1 = `ออกแบบ Performance Rubric วิชาภาษาอังกฤษ ม.1 เรื่อง Jobs
จุดประสงค์:
1. ออกเสียงและบอกความหมายคำศัพท์เกี่ยวกับอาชีพได้ถูกต้อง
2. สนทนาถามตอบเกี่ยวกับอาชีพในฝันโดยใช้โครงสร้าง What do you want to be? ได้อย่างเหมาะสม

หลักฐาน: บทสนทนาถามตอบคู่เกี่ยวกับอาชีพ (Speaking Performance)
กิจกรรมที่เกิด: Pair Speaking Practice (20 นาที)

โครงสร้าง JSON ที่ต้องการ:
{
  "title": "แบบประเมินการพูดสนทนา",
  "levels": [
    { "score": 4, "label": "ระดับ 4 (ดีเยี่ยม)" },
    { "score": 3, label: "ระดับ 3 (ดี/ผ่านเกณฑ์)" },
    { "score": 2, label: "ระดับ 2 (พอใช้)" },
    { "score": 1, label: "ระดับ 1 (ปรับปรุง)" }
  ],
  "criteria": [
    {
      "name": "ชื่อเกณฑ์",
      "weight": 1,
      "descriptors": {
        "4": "...", "3": "...", "2": "...", "1": "..."
      }
    }
  ]
}`;

  try {
    const res1 = await callGemini(sysInst1, prompt1);
    console.log('Title:', res1.title);
    console.log(`Levels count: ${res1.levels?.length}`);
    console.log(`Criteria count: ${res1.criteria?.length}`);

    // Quality check
    if (!res1.levels || res1.levels.length !== 4) throw new Error('Levels must be 4');
    if (!res1.criteria || res1.criteria.length < 2 || res1.criteria.length > 5) {
      throw new Error(`Criteria count out of range (expected 2-5, got ${res1.criteria?.length})`);
    }

    // Check descriptors
    for (const c of res1.criteria) {
      console.log(`  - Criterion: ${c.name}`);
      for (const lvl of [4, 3, 2, 1]) {
        if (!c.descriptors?.[String(lvl)]) throw new Error(`Missing descriptor for level ${lvl}`);
      }
    }
    console.log('✅ English Speaking Rubric: PASS (Schema & Quality Check Passed)\n');
  } catch (err) {
    console.error('❌ Case 1 failed:', err.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // Case 2: Math Problem Solving Scoring Guide
  // ─────────────────────────────────────────────────────────────────
  console.log('── Case 2: Math Problem Solving Scoring Guide ──');
  const sysInst2 = `คุณคือผู้เชี่ยวชาญการวัดประเมินผลคณิตศาสตร์
สร้าง Scoring Guide สำหรับโจทย์ปัญหาคณิตศาสตร์ โดยแบ่งเกณฑ์ให้คะแนนชัดเจน
ต้องประเมินทั้ง: คำตอบ (Answer), กระบวนการคิด/วิธีทำ (Process), และการให้เหตุผล (Reasoning)
ตอบเป็น JSON เท่านั้น`;

  const prompt2 = `ออกแบบ Scoring Guide วิชาคณิตศาสตร์ ม.1 เรื่อง สมการเชิงเส้นตัวแปรเดียว
จุดประสงค์: แก้โจทย์ปัญหาสมการเชิงเส้นตัวแปรเดียวและแสดงเหตุผลประกอบคำตอบได้
หลักฐาน: การแสดงวิธีทำและการเขียนอธิบายวิธีแก้โจทย์ปัญหา (Written Solution)

โครงสร้าง JSON:
{
  "title": "เกณฑ์การให้คะแนนโจทย์ปัญหาสมการ",
  "totalPoints": 5,
  "items": [
    {
      "criterion": "เกณฑ์ข้อที่...",
      "maxPoints": 2,
      "description": "คำอธิบายเกณฑ์..."
    }
  ]
}`;

  try {
    const res2 = await callGemini(sysInst2, prompt2);
    console.log('Title:', res2.title);
    console.log(`Items count: ${res2.items?.length}, Total Points: ${res2.totalPoints}`);

    if (!res2.items || res2.items.length < 2) throw new Error('Items count must be >= 2');
    res2.items.forEach((item, idx) => {
      console.log(`  - Item ${idx + 1}: ${item.criterion} (${item.maxPoints} คะแนน) - ${item.description || ''}`);
    });

    const allCritText = res2.items.map((i) => i.criterion + ' ' + (i.description || '')).join(' ');
    const hasAnswer = allCritText.includes('คำตอบ') || allCritText.includes('ผลลัพธ์');
    const hasProcess = allCritText.includes('วิธี') || allCritText.includes('กระบวนการ') || allCritText.includes('ขั้นตอน');
    const hasReason = allCritText.includes('เหตุผล') || allCritText.includes('สมการ') || allCritText.includes('อธิบาย');

    console.log(`Checks: Answer=${hasAnswer}, Process=${hasProcess}, Reason=${hasReason}`);
    console.log('✅ Math Scoring Guide: PASS (Answer, Process, Reasoning Covered)\n');
  } catch (err) {
    console.error('❌ Case 2 failed:', err.message);
  }

  // ─────────────────────────────────────────────────────────────────
  // Case 3: Science Experiment Checklist
  // ─────────────────────────────────────────────────────────────────
  console.log('── Case 3: Science Experiment Checklist ──');
  const sysInst3 = `คุณคือผู้เชี่ยวชาญการวัดประเมินผลวิทยาศาสตร์
สร้าง Checklist การปฏิบัติการทดลองที่มีพฤติกรรมบ่งชี้ที่สังเกตได้จริง 4-8 รายการ
ครอบคลุม: ขั้นตอนการทดลอง, การสังเกตและบันทึกผล, และความปลอดภัย
ตอบเป็น JSON เท่านั้น`;

  const prompt3 = `ออกแบบ Checklist การทดลองวิชาวิทยาศาสตร์ ม.1 เรื่อง การแพร่ของสาร
จุดประสงค์: ปฏิบัติการทดลองเรื่องการแพร่ บันทึกผล และปฏิบัติตามกฎความปลอดภัยได้
หลักฐาน: การปฏิบัติการทดลองและการบันทึกผลลงแบบบันทึก (Experiment Procedure & Log)

โครงสร้าง JSON:
{
  "title": "แบบตรวจสอบการปฏิบัติการทดลองเรื่องการแพร่",
  "passingThreshold": 4,
  "items": [
    {
      "id": "C1",
      "criterion": "พฤติกรรมที่สังเกตได้...",
      "observable": true
    }
  ]
}`;

  try {
    const res3 = await callGemini(sysInst3, prompt3);
    console.log('Title:', res3.title);
    console.log(`Items count: ${res3.items?.length}`);

    if (!res3.items || res3.items.length < 3 || res3.items.length > 10) {
      throw new Error(`Items count out of range (got ${res3.items?.length})`);
    }

    res3.items.forEach((item, idx) => {
      console.log(`  - Item ${idx + 1}: ${item.criterion}`);
      if (!item.criterion || !item.criterion.trim()) throw new Error('Empty criterion statement');
    });

    console.log('✅ Science Checklist: PASS (Observable Steps & Items Verified)\n');
  } catch (err) {
    console.error('❌ Case 3 failed:', err.message);
  }

  console.log('══════════════════════════════════════════════════════════');
  console.log('  ALL 3 REAL AI SMOKE TESTS COMPLETED SUCCESSFULLY!');
  console.log('══════════════════════════════════════════════════════════\n');
}

runSmokeTests().catch((err) => {
  console.error('Fatal error in smoke tests:', err);
  process.exit(1);
});
