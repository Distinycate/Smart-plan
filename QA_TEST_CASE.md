# QA Test Cases

## Automated Evidence

- `npm run build` — Passed on 2026-07-06: compilation, TypeScript validation and route generation completed.
- ESLint — Not executed: package is not installed in this project.
- Database, browser and manual regression — Not executed in this environment. Manual verification required.

## Regression

- TC-REG-001 เปิดระบบและ login
- TC-REG-002 โหลด initial data
- TC-REG-003 ชั้นกรองวิชา
- TC-REG-004 วิชากรองหน่วย
- TC-REG-005 หน่วยโหลดตัวชี้วัด
- TC-REG-006 เรื่องโหลดค่าเริ่มต้น
- TC-REG-007 บันทึก Lesson draft
- TC-REG-008 บันทึก Lesson complete
- TC-REG-009 update สร้าง LessonPlan_Backup
- TC-REG-010 export/print PDF
- TC-REG-011 export Word
- TC-REG-012 System_Logs ทำงาน

## Migration

- TC-MIG-001 รัน migration บน staging ครั้งแรก
- TC-MIG-002 รันไฟล์เดิมครั้งที่สองโดยไม่เกิด duplicate/error
- TC-MIG-003 ยืนยันตาราง/ข้อมูลเดิมไม่เปลี่ยน
- TC-MIG-004 SchemaVersions มี `2.0.0-foundation`

## UnitPlan

- TC-UNIT-001 เปิด `/unit-plans/new`
- TC-UNIT-002 โหลด master data
- TC-UNIT-003 draft ที่ข้อมูลขั้นต่ำครบ บันทึกได้
- TC-UNIT-004 ขาด unitName ต้องถูก block
- TC-UNIT-005 update สร้าง VersionHistory ก่อน
- TC-UNIT-006 ผู้ใช้คนอื่นอ่าน/แก้ record ไม่ได้
- TC-UNIT-007 ready ถูก block เมื่อยังไม่มี UnitLessons
- TC-UNIT-008 UI เดิมและ Unit UI เปิดร่วมกันได้
- TC-UNIT-009 เพิ่ม UnitLesson และเรียงตาม lessonOrder
- TC-UNIT-010 duplicate lessonOrder ถูก block
- TC-UNIT-011 แก้ UnitLesson แล้วมี VersionHistory
- TC-UNIT-012 reorder หลายรายการเป็น transaction และมี VersionHistory
- TC-UNIT-013 archive UnitLesson แล้วข้อมูลยังอยู่
- TC-UNIT-014 ชั่วโมงรวมไม่ตรงแล้ว Ready ถูก block
- TC-UNIT-015 ชั่วโมงตรงและ checklist ครบแล้ว Save Ready ได้

## Multi-user AI Concurrency

- TC-AI-Q-001 ผู้ใช้ A และ B enqueue พร้อมกันและได้คนละ job ID
- TC-AI-Q-002 จำกัด concurrency=1 แล้วมีเพียง job แรกเป็น processing
- TC-AI-Q-003 job ถัดไปเริ่มหลัง job แรก complete
- TC-AI-Q-004 ผู้ใช้ A อ่านหรือยกเลิก job ของ B ไม่ได้
- TC-AI-Q-005 cancel งาน waiting แล้วไม่กิน slot
- TC-AI-Q-006 AI error แล้ว job เปลี่ยนเป็น failed
- TC-AI-Q-007 ปิด browser แล้ว lease หมดอายุและปล่อย slot
- TC-AI-Q-008 polling ล้มเหลว 3 ครั้งแล้ว UI หยุด
- TC-AI-Q-009 AI Phase 1 ได้รับ payload จริง
- TC-AI-Q-010 Evaluator และ AI Fix ใช้ shared queue
- TC-AI-Q-011 dashboard และ lesson editor ยังใช้งานได้ระหว่างรอ AI
- TC-AI-Q-012 Lesson save, backup และ Word/PDF ไม่ได้รับผลกระทบ

## Unit Library and Export

- TC-UNIT-LIB-001 คลังแสดง UnitPlans ของผู้ใช้เท่านั้น
- TC-UNIT-LIB-002 ค้นหาชื่อหน่วย วิชา ชั้น และปีได้
- TC-UNIT-EXP-001 Draft preview มี watermark
- TC-UNIT-EXP-002 Ready preview ไม่มี watermark
- TC-UNIT-EXP-003 Word เปิดได้และภาษาไทย/ตารางไม่เสีย
- TC-UNIT-EXP-004 Print PDF เป็น A4 และแบ่งหน้าเหมาะสม
- TC-UNIT-EXP-005 indicator/lesson/assessment/rubric/reflection แสดงเมื่อมี
- TC-UNIT-EXP-006 export สร้าง System_Logs
- TC-UNIT-EXP-007 lesson Word/PDF เดิมยังเหมือนเดิม

## Alignment Engine

- TC-ALIGN-001 UnitPlan complete ได้ structured scores 8 มิติ
- TC-ALIGN-002 LessonPlan scope โหลดข้อมูลได้
- TC-ALIGN-003 unknown indicator ID สร้าง warning และไม่ invent code
- TC-ALIGN-004 invalid JSON ถูก reject
- TC-ALIGN-005 score นอก 0–100 ถูก reject
- TC-ALIGN-006 ผลสำเร็จสร้าง AIHistory reviewStatus=pending
- TC-ALIGN-007 AIHistory ล้มเหลวแล้วไม่แสดงผล
- TC-ALIGN-008 ไม่มีการเปลี่ยน UnitPlan/LessonPlan หลังตรวจ
- TC-ALIGN-009 ผู้ใช้อื่นตรวจแผนที่ไม่ใช่ของตนไม่ได้
