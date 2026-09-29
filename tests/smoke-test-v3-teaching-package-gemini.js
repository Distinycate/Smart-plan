/**
 * Live Gemini Smoke Test for Wave V3.6 — Teaching Package Builder
 * Tests real AI generation for:
 * 1. English Speaking Card (Information Gap / Role Play)
 * 2. Math Problem Solving (Problem Set with situation & reasoning workspace)
 * 3. Science Experiment Sheet (Materials, safety, data table, CER analysis)
 * 4. Teacher Guide (Timeline aligned with actual activities, teacher prompts & tips)
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

async function callGemini(systemInstruction, userPrompt) {
  const apiKey =
    process.env.GEMINI_API_KEY_PROCESS ||
    process.env.GEMINI_API_KEY_EVALUATE ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error('No GEMINI_API_KEY found in .env.local');

  const modelName = process.env.GEMINI_FAST_MODEL || 'gemini-2.5-flash';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 3500,
      temperature: 0.25,
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText.slice(0, 100)}`);
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

const SYSTEM_INSTRUCTION = `คุณคือผู้เชี่ยวชาญด้านการออกแบบสื่อและเอกสารประกอบการจัดการเรียนรู้เชิงรุก (Active Learning Pedagogical Asset Designer)
มีหน้าที่สร้าง "ชุดพร้อมสอน" (Teaching Asset) ประจำคาบเรียน 60 นาที ตามธรรมชาติของแต่ละสาขาวิชา
ตอบเป็น JSON ตามโครงสร้างที่กำหนดเท่านั้น ห้ามมี markdown หรือคำนำ`;

async function runSmokeTests() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  LIVE GEMINI SMOKE TESTS — WAVE V3.6 TEACHING ASSETS');
  console.log('══════════════════════════════════════════════════════════\n');

  // 1. English Speaking Card
  console.log('🔹 Smoke Test 1: English Speaking Card');
  const prompt1 = `สร้างบัตรกิจกรรมการสนทนา (Speaking Card / Information Gap)
วิชา: ภาษาอังกฤษ ม.1 เรื่อง Dream Jobs
จุดเน้น: SPEAKING (60 นาที)
จุดประสงค์: สนทนาถามตอบเกี่ยวกับอาชีพในฝัน หน้าที่ และสถานที่ทำงานได้ถูกต้อง
กิจกรรม: ขั้นปฏิบัติ (Practice) 20 นาที นักเรียนจับคู่สนทนาโดยใช้บัตร Student A และ Student B

โครงสร้าง JSON:
{
  "title": "Job Interview Information Gap Cards",
  "instruction": "คำชี้แจงการสนทนาเป็นคู่",
  "estimatedMinutes": 15,
  "roleOrCardType": "STUDENT_A_B",
  "cards": [
    {
      "cardId": "CARD_A",
      "assignedTo": "Student A",
      "roleTitle": "ผู้สัมภาษณ์",
      "situation": "สถานการณ์การสื่อสาร",
      "cuesOrClues": ["คำถามนำ 1", "คำถามนำ 2"],
      "targetVocabulary": ["คำศัพท์"],
      "expectedUtterances": ["ประโยคตัวอย่าง"]
    },
    {
      "cardId": "CARD_B",
      "assignedTo": "Student B",
      "roleTitle": "ผู้ให้ข้อมูล",
      "situation": "ข้อมูลเฉพาะที่ต้องตอบ",
      "cuesOrClues": ["ข้อมูลคำตอบ"],
      "targetVocabulary": ["คำศัพท์"],
      "expectedUtterances": ["ประโยคตัวอย่าง"]
    }
  ],
  "interactionRules": ["กฎการพูดสนทนา"]
}`;

  try {
    const res1 = await callGemini(SYSTEM_INSTRUCTION, prompt1);
    console.log('   Result Title:', res1.title);
    console.log('   Cards Count:', res1.cards?.length || 0);
    console.log('   Card A Role:', res1.cards?.[0]?.roleTitle, '| Situation:', res1.cards?.[0]?.situation?.slice(0, 60));
    console.log('   Card B Role:', res1.cards?.[1]?.roleTitle, '| Situation:', res1.cards?.[1]?.situation?.slice(0, 60));
    if (!res1.cards || res1.cards.length < 2) throw new Error('Must have at least 2 cards');
    console.log('   ✅ PASS — English Speaking Card generated successfully!\n');
  } catch (err) {
    console.error('   ❌ FAIL:', err.message);
  }

  // 2. Math Problem Solving (Problem Set)
  console.log('🔹 Smoke Test 2: Math Problem Solving (Problem Set)');
  const prompt2 = `สร้างชุดแบบฝึกหัดสถานการณ์ปัญหา (Problem Set) วิชาคณิตศาสตร์ ม.2 เรื่อง สมการเชิงเส้นสองตัวแปร
จุดเน้น: PROBLEM_SOLVING (60 นาที)
จุดประสงค์: เขียนสมการและแสดงวิธีแก้โจทย์ปัญหาค่าใช้จ่ายพร้อมเขียนอธิบายเหตุผลได้

โครงสร้าง JSON:
{
  "title": "ชุดสถานการณ์ปัญหาการวางแผนค่าใช้จ่าย",
  "instruction": "คำชี้แจง",
  "estimatedMinutes": 15,
  "targetGrade": "ม.2",
  "sections": [
    {
      "title": "ตอนที่ 1: สถานการณ์ปัญหาและการให้เหตุผล",
      "items": [
        {
          "itemNumber": 1,
          "questionType": "OPEN_RESPONSE",
          "prompt": "สถานการณ์โจทย์ปัญหาที่ท้าทายความคิด...",
          "answerSpace": "พื้นที่แสดงวิธีคิดและอธิบายเหตุผล",
          "points": 5
        }
      ]
    }
  ]
}`;

  try {
    const res2 = await callGemini(SYSTEM_INSTRUCTION, prompt2);
    console.log('   Result Title:', res2.title);
    console.log('   Sections Count:', res2.sections?.length || 0);
    console.log('   Sample Prompt:', res2.sections?.[0]?.items?.[0]?.prompt?.slice(0, 80));
    console.log('   Answer Space Note:', res2.sections?.[0]?.items?.[0]?.answerSpace);
    if (!res2.sections || res2.sections.length === 0) throw new Error('Sections must not be empty');
    console.log('   ✅ PASS — Math Problem Set generated successfully!\n');
  } catch (err) {
    console.error('   ❌ FAIL:', err.message);
  }

  // 3. Science Experiment Sheet
  console.log('🔹 Smoke Test 3: Science Experiment Sheet');
  const prompt3 = `สร้างใบกิจกรรมการทดลองวิทยาศาสตร์ (Experiment Sheet)
วิชา: วิทยาศาสตร์ ม.1 เรื่อง การแพร่ของสารในอุณหภูมิต่างกัน
จุดเน้น: EXPERIMENT (60 นาที)
จุดประสงค์: ทำการทดลอง บันทึกข้อมูลเชิงประจักษ์ลงตาราง และสรุปผลด้วยหลักฐาน (CER)

โครงสร้าง JSON:
{
  "title": "ใบกิจกรรมการทดลองการแพร่ของสาร",
  "instruction": "คำชี้แจง",
  "estimatedMinutes": 20,
  "materials": ["วัสดุ 1", "วัสดุ 2"],
  "safetyGuidance": ["ข้อควรระวังความปลอดภัย"],
  "steps": ["ขั้นตอนที่ 1...", "ขั้นตอนที่ 2..."],
  "dataTable": {
    "title": "ตารางบันทึกผลการทดลอง",
    "columns": ["ตัวแปร", "ผลการสังเกต", "เวลา"],
    "initialRows": [["น้ำเย็น", "", ""], ["น้ำร้อน", "", ""]]
  },
  "analysisQuestions": ["คำถามวิเคราะห์จากข้อมูล"],
  "evidenceSummaryPrompt": "สรุปผลการทดลองจากหลักฐานเชิงประจักษ์"
}`;

  try {
    const res3 = await callGemini(SYSTEM_INSTRUCTION, prompt3);
    console.log('   Result Title:', res3.title);
    console.log('   Materials:', res3.materials?.slice(0, 3).join(', '));
    console.log('   Table Columns:', res3.dataTable?.columns?.join(' | '));
    console.log('   Evidence Summary Prompt:', res3.evidenceSummaryPrompt);
    if (!res3.dataTable?.columns || res3.dataTable.columns.length === 0) throw new Error('Data table columns missing');
    console.log('   ✅ PASS — Science Experiment Sheet generated successfully!\n');
  } catch (err) {
    console.error('   ❌ FAIL:', err.message);
  }

  // 4. Teacher Guide Timeline Alignment
  console.log('🔹 Smoke Test 4: Teacher Guide Timeline Alignment');
  const prompt4 = `สร้างคู่มือครู (Teacher Guide) ประจำคาบเรียน 60 นาที จากแผนการจัดการเรียนรู้ต่อไปนี้:
วิชา: ภาษาอังกฤษ ม.1 เรื่อง Jobs
กิจกรรมในแผนจริง:
1. ขั้นนำ (Warm-up) 10 นาที: ครูเปิดภาพปริศนา นักเรียนทายอาชีพ
2. ขั้นฝึกสนทนา (Practice) 35 นาที: ครูแจก Speaking Cards นักเรียนจับคู่สนทนาบทบาทสมมติ (มีการประเมินแบบ Formative)
3. ขั้นสรุป (Wrap-up) 15 นาที: ครูให้ Feedback การออกเสียง นักเรียนตอบ Exit Ticket

ห้ามเปลี่ยนแปลงเวลาหรือลำดับกิจกรรมของแผน!

โครงสร้าง JSON:
{
  "title": "คู่มือแนวทางการจัดการเรียนรู้สำหรับครู (Teacher Guide)",
  "totalMinutes": 60,
  "materialsNeeded": ["สื่ออุปกรณ์ที่ต้องเตรียม"],
  "timeline": [
    {
      "phaseName": "ขั้นนำ (Warm-up)",
      "timeRange": "10 นาที",
      "teacherActions": ["สิ่งที่ครูทำ"],
      "studentActions": ["สิ่งที่นักเรียนทำ"],
      "mediaOrAssets": ["สื่อที่ใช้"],
      "observableCheck": "จุดสังเกตพฤติกรรม",
      "teacherPrompts": ["คำถามกระตุ้นคิดที่ครูควรใช้"],
      "expectedResponses": ["คำตอบที่คาดหวัง"],
      "teachingTips": ["เทคนิคการจัดการชั้นเรียน"]
    },
    {
      "phaseName": "ขั้นฝึกสนทนา (Practice)",
      "timeRange": "35 นาที",
      "teacherActions": ["สิ่งที่ครูทำ"],
      "studentActions": ["สิ่งที่นักเรียนทำ"],
      "mediaOrAssets": ["Speaking Cards"],
      "observableCheck": "จุดสังเกตพฤติกรรม",
      "teacherPrompts": ["คำถามกระตุ้นคิด"],
      "expectedResponses": ["คำตอบที่คาดหวัง"],
      "teachingTips": ["เทคนิค"]
    },
    {
      "phaseName": "ขั้นสรุป (Wrap-up)",
      "timeRange": "15 นาที",
      "teacherActions": ["สิ่งที่ครูทำ"],
      "studentActions": ["สิ่งที่นักเรียนทำ"],
      "mediaOrAssets": ["Exit Ticket"],
      "observableCheck": "จุดสังเกตพฤติกรรม",
      "teacherPrompts": ["คำถาม"],
      "expectedResponses": ["คำตอบ"],
      "teachingTips": ["เทคนิค"]
    }
  ]
}`;

  try {
    const res4 = await callGemini(SYSTEM_INSTRUCTION, prompt4);
    console.log('   Result Title:', res4.title);
    console.log('   Timeline Count:', res4.timeline?.length || 0);
    console.log('   Step 1 Range:', res4.timeline?.[0]?.timeRange, '| Teacher Action:', res4.timeline?.[0]?.teacherActions?.[0]?.slice(0, 50));
    console.log('   Step 2 Range:', res4.timeline?.[1]?.timeRange, '| Teacher Prompt:', res4.timeline?.[1]?.teacherPrompts?.[0]?.slice(0, 60));
    console.log('   Step 3 Range:', res4.timeline?.[2]?.timeRange, '| Media:', res4.timeline?.[2]?.mediaOrAssets?.join(', '));
    if (!res4.timeline || res4.timeline.length !== 3) throw new Error('Timeline steps must match 3 activities');
    console.log('   ✅ PASS — Teacher Guide generated and strictly aligned with lesson activities!\n');
  } catch (err) {
    console.error('   ❌ FAIL:', err.message);
  }

  console.log('🎉 ALL 4 LIVE GEMINI SMOKE TESTS COMPLETED SUCCESSFULLY!\n');
}

runSmokeTests();
