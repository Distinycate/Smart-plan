const http = require('http');

const PLAN_DATA = {
  planId: "test-plan-e2e-123",
  userId: "00000000-0000-0000-0000-000000000000",
  lessonTopic: "โครงสร้างเซลล์พืชและเซลล์สัตว์",
  subjectName: "วิทยาศาสตร์",
  gradeLevel: "ม.1",
  academicYear: "2567",
  learningStandard: "ว 1.2 เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต...",
  indicatorDuring: "เปรียบเทียบรูปร่างและโครงสร้างของเซลล์พืชและเซลล์สัตว์",
  indicatorFinal: "",
  indicatorSelectedIds: [],
  objectiveK: "อธิบายโครงสร้างและหน้าที่ของส่วนประกอบภายในเซลล์ได้",
  objectiveP: "วาดภาพและชี้ส่วนประกอบของเซลล์พืชและเซลล์สัตว์ได้",
  objectiveA: "ตระหนักถึงความสำคัญของเซลล์ต่อสิ่งมีชีวิต",
  learningProcess: "1. ขั้นนำ (10 นาที): ครูทบทวนความรู้เดิมเรื่องสิ่งมีชีวิต\n2. ขั้นสอน (30 นาที): ให้นักเรียนส่องกล้องจุลทรรศน์ดูเซลล์เยื่อหอมและเซลล์เยื่อบุข้างแก้ม\n3. ขั้นสรุป (10 นาที): สรุปความแตกต่างของเซลล์ทั้งสองชนิด",
  measureK: "ความเข้าใจเรื่องเซลล์",
  methodK: "ตรวจใบงาน",
  toolK: "ใบงานเรื่องเซลล์",
  criteriaK: "ผ่านเกณฑ์ร้อยละ 70",
  rubricK: "4: อธิบายได้ครบถ้วน 3: อธิบายได้ส่วนใหญ่ 2: อธิบายได้บางส่วน 1: อธิบายไม่ได้",
  measureP: "ทักษะการวาดภาพเซลล์",
  methodP: "ประเมินผลงาน",
  toolP: "แบบประเมินผลงาน",
  criteriaP: "ผ่านเกณฑ์ร้อยละ 70",
  rubricP: "4: วาดสวยงาม ถูกต้อง 3: วาดถูกต้อง 2: วาดพอใช้ 1: วาดไม่ถูกต้อง",
  measureA: "ความตั้งใจเรียน",
  methodA: "สังเกตพฤติกรรม",
  toolA: "แบบสังเกตพฤติกรรม",
  criteriaA: "ผ่านเกณฑ์ระดับ ดี",
  rubricA: "4: ตั้งใจมาก 3: ตั้งใจ 2: ไม่ค่อยตั้งใจ 1: ไม่ตั้งใจ",
};

async function fetchAPI(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: "Failed to parse JSON", body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log("🚀 [1/3] เริ่มทดสอบ AI Evaluate (/api/ai-evaluate)...");
  const evalRes = await fetchAPI('/api/ai-evaluate', { planData: PLAN_DATA });
  
  if (!evalRes.success) {
    console.error("❌ Evaluation Failed:", evalRes.error || evalRes);
    return;
  }
  
  const evaluation = evalRes.evaluation;
  console.log("✅ ประเมินสำเร็จ!");
  console.log(`📊 คะแนนรวม (Hybrid Score): ${evaluation.overallScore}/100`);
  console.log(`   - Rule-based: ${evaluation.ruleBasedScore}/30`);
  console.log(`   - AI Logic: ${evaluation.overallScore - evaluation.ruleBasedScore}/70`);
  
  console.log("💡 คำแนะนำจาก AI:");
  console.log(evaluation.suggestions);

  if (evaluation.errorsFound && evaluation.errorsFound.length > 0) {
    console.log("⚠️ ข้อผิดพลาดที่ AI พบ:", evaluation.errorsFound);
  }

  console.log("\n🚀 [2/3] เริ่มทดสอบ AI Auto-Fix (/api/ai-fix)...");
  
  // Test partial fix for overall suggestions
  const fixRes = await fetchAPI('/api/ai-fix', {
    planData: PLAN_DATA,
    isPartial: true,
    partialSection: 'overall',
    partialSuggestion: evaluation.suggestions || 'ปรับปรุงโครงสร้างและจุดประสงค์การเรียนรู้ให้สอดคล้องกัน'
  });

  if (!fixRes.success) {
    console.error("❌ Auto-Fix Failed:", fixRes.error || fixRes);
    return;
  }

  console.log("✅ ซ่อมแซมแผนสำเร็จ!");
  console.log(`📄 รหัสแผนใหม่ (Draft): ${fixRes.fixedPlanId}`);
  console.log(`✨ การเปลี่ยนแปลง (ตย. Learning Process):`);
  console.log(fixRes.newPlanData.learningProcess.substring(0, 200) + "...");

  console.log("\n✅ [3/3] จบการทดสอบ E2E Backend Workflow ทุกขั้นตอนสมบูรณ์!");
}

runTest();
