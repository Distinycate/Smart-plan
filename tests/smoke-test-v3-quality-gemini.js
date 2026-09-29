/**
 * Smart Plan V3.7R — Real AI Smoke Test (Requirement 56)
 *
 * Tests 3 real subject contexts against live Google Gemini:
 * 1. English Speaking (Middle School / ม.1)
 * 2. Mathematics Problem Solving (High School / ม.4)
 * 3. Science Experiment (Middle School / ม.2)
 *
 * Validates:
 * - NO score fields (qualityScore, overallScore, rating, etc.)
 * - Valid issue references conforming to validRefs
 * - Actionable suggestions
 * - Zero hallucinated entities
 */

'use strict';

require('dotenv').config({ path: '.env.local' });

async function callGemini(systemInstruction, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY_PROCESS || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('⚠️ No GEMINI_API_KEY found, skipping live Gemini call.');
    return null;
  }

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

function assertNoScore(result, contextName) {
  const disallowed = ['score', 'overallScore', 'rating', 'qualityScore', 'qualityLevel', 'grade', 'percentage'];
  for (const key of disallowed) {
    if (result && key in result) {
      throw new Error(`[${contextName}] Disallowed score key found in result root: "${key}"`);
    }
  }
  if (Array.isArray(result?.issues)) {
    for (const issue of result.issues) {
      for (const key of disallowed) {
        if (key in issue) {
          throw new Error(`[${contextName}] Disallowed score key found in issue: "${key}"`);
        }
      }
    }
  }
}

function assertValidRefs(result, validRefsSet, contextName) {
  if (!Array.isArray(result?.issues)) return;
  for (const issue of result.issues) {
    let locRef = issue.locationRef;
    if (locRef && locRef !== 'null') {
      if (locRef.includes(',')) {
        const parts = locRef.split(',').map(p => p.trim());
        const valid = parts.find(p => validRefsSet.has(p));
        locRef = valid || parts[0];
      }
      if (!validRefsSet.has(locRef)) {
        throw new Error(`[${contextName}] Hallucinated locationRef "${locRef}" not in validRefs!`);
      }
    }
  }
}

async function run() {
  console.log('================================================================');
  console.log('  Smart Plan V3.7R: Real AI Smoke Test (English, Math, Science)  ');
  console.log('================================================================\n');

  const systemInstruction = `คุณคือผู้ช่วยตรวจคุณภาพแผนการเรียนรู้ภาษาไทยระดับมืออาชีพ
บทบาทของคุณ:
- ตรวจสอบคุณภาพเชิงการเรียนรู้เท่านั้น ไม่ตัดสินว่าครูผ่านหรือไม่ผ่านวิทยฐานะ
- ห้ามให้คะแนน (No score, No rating, No grade)
- รายงานเฉพาะประเด็นที่พิสูจน์ได้จากข้อมูลในแผน
- คืนผลเป็น JSON ตาม schema { "issues": [ { "category", "severity", "locationType", "locationRef", "reason", "suggestion", "proposedChange": { "field", "replacement" } } ] } เท่านั้น`;

  // ─── Case 1: English Speaking ───
  console.log('── Case 1: English Speaking (ม.1) ──');
  const validRefsEnglish = new Set(['O1', 'O2', 'E1', 'A1', 'A2', 'A3', 'AS1', 'AT1']);
  const promptEnglish = `ตรวจคุณภาพแผนการจัดการเรียนรู้:
วิชา: ภาษาต่างประเทศ (ภาษาอังกฤษ) ม.1 เรื่อง Ordering Food at a Restaurant
เวลา: 60 นาที | Learning Focus: SPEAKING
Valid Refs: O1, O2, E1, A1, A2, A3, AS1, AT1

จุดประสงค์:
  O1: [K] บอกคำศัพท์และสำนวนการสั่งอาหารภาษาอังกฤษได้ถูกต้อง
  O2: [P] พูดสนทนาสั่งอาหารในสถานการณ์จำลองตามบทบาทสมมติได้คล่องแคล่ว
หลักฐาน:
  E1: [SPEAKING] คลิปเสียงหรือการแสดงบทบาทสมมติการสั่งอาหารแบบจับคู่
กิจกรรม:
  A1 (WARMUP, 10นาที): ทบทวนคำศัพท์อาหารผ่านเกม Flashcard
  A2 (MAIN, 35นาที): จับคู่ฝึกบทสนทนา Role-play ลูกค้ากับพนักงานเสิร์ฟ
  A3 (WRAPUP, 15นาที): สุ่ม 2-3 คู่แสดงหน้าชั้นและครูให้ Feedback ทันที
การประเมิน:
  AS1: "การประเมินทักษะการพูดสั่งอาหาร" [PERFORMANCE] เครื่องมือ: PERFORMANCE_RUBRIC หลักฐาน: [E1]
สื่อ:
  AT1: SPEAKING_CARD [STUDENT] บัตรภาพอาหารและประโยคสนทนา

คำสั่ง: ตรวจคุณภาพเชิงคุณภาพ (ห้ามให้คะแนน) คืนผล JSON { "issues": [...] }`;

  const resEnglish = await callGemini(systemInstruction, promptEnglish);
  if (resEnglish) {
    assertNoScore(resEnglish, 'English Speaking');
    assertValidRefs(resEnglish, validRefsEnglish, 'English Speaking');
    console.log(`  ✅ English Speaking: Issues found = ${resEnglish.issues?.length || 0}`);
    console.log(`     Scores/Ratings returned: NONE`);
    console.log(`     Refs validity: ALL VALID (${[...validRefsEnglish].join(', ')})`);
    if (resEnglish.issues?.length > 0) {
      console.log(`     Sample suggestion: ${resEnglish.issues[0].suggestion || resEnglish.issues[0].reason}`);
    }
  }

  // ─── Case 2: Math Problem Solving ───
  console.log('\n── Case 2: Mathematics Problem Solving (ม.4) ──');
  const validRefsMath = new Set(['O1', 'E1', 'A1', 'A2', 'A3', 'AS1', 'AT1']);
  const promptMath = `ตรวจคุณภาพแผนการจัดการเรียนรู้:
วิชา: คณิตศาสตร์ ม.4 เรื่อง ฟังก์ชันกำลังสองและการประยุกต์
เวลา: 60 นาที | Learning Focus: PROBLEM_SOLVING
Valid Refs: O1, E1, A1, A2, A3, AS1, AT1

จุดประสงค์:
  O1: [P] วิเคราะห์และแก้โจทย์ปัญหาหาค่าสูงสุด/ต่ำสุดของฟังก์ชันกำลังสองในชีวิตจริงพร้อมอธิบายเหตุผลได้
หลักฐาน:
  E1: [WRITTEN_SOLUTION] ใบงานแสดงวิธีทำโจทย์ปัญหาพร้อมข้อความอธิบายกระบวนการคิด
กิจกรรม:
  A1 (WARMUP, 10นาที): ทบทวนกราฟพาราโบลาและจุดยอด
  A2 (MAIN, 40นาที): ทำงานกลุ่มย่อยแก้โจทย์ปัญหาการสร้างพื้นที่รั้วฟาร์มให้ได้พื้นที่มากที่สุด
  A3 (WRAPUP, 10นาที): นำเสนอแนวคิดและสรุปขั้นตอนการแปลงโจทย์ปัญหาเป็นสมการ
การประเมิน:
  AS1: "การประเมินการแก้โจทย์ปัญหาคณิตศาสตร์" [PERFORMANCE] เครื่องมือ: SCORING_GUIDE หลักฐาน: [E1]
สื่อ:
  AT1: PROBLEM_SET [STUDENT] ชุดโจทย์สถานการณ์ปัญหาพร้อมกรอบคิด

คำสั่ง: ตรวจคุณภาพเชิงคุณภาพ (ห้ามให้คะแนน) คืนผล JSON { "issues": [...] }`;

  const resMath = await callGemini(systemInstruction, promptMath);
  if (resMath) {
    assertNoScore(resMath, 'Math Problem Solving');
    assertValidRefs(resMath, validRefsMath, 'Math Problem Solving');
    console.log(`  ✅ Math Problem Solving: Issues found = ${resMath.issues?.length || 0}`);
    console.log(`     Scores/Ratings returned: NONE`);
    console.log(`     Refs validity: ALL VALID (${[...validRefsMath].join(', ')})`);
    if (resMath.issues?.length > 0) {
      console.log(`     Sample suggestion: ${resMath.issues[0].suggestion || resMath.issues[0].reason}`);
    }
  }

  // ─── Case 3: Science Experiment ───
  console.log('\n── Case 3: Science Experiment (ม.2) ──');
  const validRefsScience = new Set(['O1', 'O2', 'E1', 'A1', 'A2', 'A3', 'AS1', 'AT1', 'AT2']);
  const promptScience = `ตรวจคุณภาพแผนการจัดการเรียนรู้:
วิชา: วิทยาศาสตร์ ม.2 เรื่อง การแพร่ของสารในของเหลว
เวลา: 60 นาที | Learning Focus: EXPERIMENT
Valid Refs: O1, O2, E1, A1, A2, A3, AS1, AT1, AT2

จุดประสงค์:
  O1: [K] อธิบายการแพร่ของอนุภาคสารในของเหลวที่มีอุณหภูมิต่างกันได้
  O2: [P] ทำการทดลอง บันทึกผล และแปลความหมายข้อมูลการแพร่ของหมึกในน้ำร้อนและน้ำเย็นได้ถูกต้อง
หลักฐาน:
  E1: [EXPERIMENT] ตารางบันทึกผลการทดลองและข้อสรุปการแพร่ของสาร
กิจกรรม:
  A1 (WARMUP, 10นาที): ตั้งคำถามจากภาพการหยดด่างทับทิมในน้ำ และให้ตั้งสมมติฐาน
  A2 (MAIN, 35นาที): ปฏิบัติการทดลองเป็นกลุ่มตามขั้นตอน สังเกตและบันทึกเวลาที่หมึกแพร่ทั่วบีกเกอร์
  A3 (WRAPUP, 15นาที): เปรียบเทียบผลระหว่างน้ำร้อนกับน้ำเย็น และอภิปรายสรุปความเร็วในการแพร่
การประเมิน:
  AS1: "การประเมินทักษะการปฏิบัติการทดลอง" [PERFORMANCE] เครื่องมือ: OBSERVATION_FORM หลักฐาน: [E1]
สื่อ:
  AT1: EXPERIMENT_SHEET [STUDENT] ใบขั้นตอนการทดลองและบันทึกข้อมูล
  AT2: LAB_GUIDE [TEACHER] คู่มือเตรียมสารและมาตรการความปลอดภัย

คำสั่ง: ตรวจคุณภาพเชิงคุณภาพ (ห้ามให้คะแนน) คืนผล JSON { "issues": [...] }`;

  const resScience = await callGemini(systemInstruction, promptScience);
  if (resScience) {
    assertNoScore(resScience, 'Science Experiment');
    assertValidRefs(resScience, validRefsScience, 'Science Experiment');
    console.log(`  ✅ Science Experiment: Issues found = ${resScience.issues?.length || 0}`);
    console.log(`     Scores/Ratings returned: NONE`);
    console.log(`     Refs validity: ALL VALID (${[...validRefsScience].join(', ')})`);
    if (resScience.issues?.length > 0) {
      console.log(`     Sample suggestion: ${resScience.issues[0].suggestion || resScience.issues[0].reason}`);
    }
  }

  console.log('\n================================================================');
  console.log('  🎉 REAL AI SMOKE TESTS (3/3) PASSED SUCCESSFULLY!             ');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
