# Architecture Decisions

## ADR-001 — Preserve Next.js and Supabase

Status: Accepted

ระบบจริงใช้ Next.js 14 และ Supabase แล้ว จึงแปลงแนวทาง Google Sheets ใน Handbook เป็น additive PostgreSQL migrations แทนการนำ Apps Script กลับมา

## ADR-002 — Unit Planner Is an Additive Module

Status: Accepted

Unit Planner ใช้ route, API และตารางใหม่ ไม่ refactor `PlanForm.tsx` ใน Foundation เพื่อลด regression risk

## ADR-003 — Optional Lesson Relationship

Status: Accepted

LessonPlans เดิมยัง standalone. การเชื่อม UnitLesson จะเป็น optional และไม่มี automatic backfill.

## ADR-004 — Backup Must Succeed Before Unit Update

Status: Accepted

ถ้าบันทึก VersionHistory ไม่สำเร็จ API ต้องหยุดก่อน update

## ADR-005 — AI Requires Preview and Teacher Apply

Status: Accepted for future work

AI Unit features ต้องบันทึก AIHistory และห้ามเขียนทับข้อมูลครูโดยอัตโนมัติ

## ADR-006 — Unit Export Is Separate From Lesson Export

Status: Accepted

Unit preview/PDF/Word ใช้ routes ใหม่ทั้งหมด เพื่อไม่เปลี่ยน template หรือ behavior ของ export รายคาบเดิม

## ADR-007 — Alignment V1 Is Preview Only

Status: Accepted

Alignment API รองรับ LessonPlan และ UnitPlan, ใช้ indicator จากฐานข้อมูลเมื่อมี,
validate structured output และบันทึก AIHistory แต่ไม่มี apply endpoint ใน V1.

## ADR-008 — Canonical Lesson Plan Is an Additive Boundary

Status: Accepted

Lesson Plan Quality Platform ใช้ `lib/lesson-plan/` เป็น canonical typed boundary.
ข้อมูล `LessonPlans` แบบ flat เดิมยังคงเดิมและถูกแปลงด้วย pure normalizer เมื่อระบบใหม่
ต้องใช้งาน จึงไม่เปลี่ยน database/API/export เดิมใน Phase 1.

Hash ใช้ stable key ordering และ SHA-256 ส่วน rubric ทั้ง 3 modes เป็น data structure
แบบล็อก anchor แยกจาก evaluator เดิม เพื่อให้ Phase ถัดไปเชื่อมได้โดยไม่เกิด breaking change.

## ADR-009 — Quality Platform Tables Coexist With Legacy Evaluation

Status: Accepted

Migration 09 เพิ่ม `evaluation_*` และ `lesson_plan_*` tables ใหม่โดยไม่แก้หรือลบ
`ai_evaluation_*` รุ่นเดิม. `lesson_plan_id` ใช้ `VARCHAR(255)` ให้ตรงกับ
`LessonPlans.planId` จริง แทนการบังคับ UUID ที่จะทำให้ข้อมูลเดิมเชื่อมไม่ได้.

RLS เปิดตั้งแต่ migration แต่ client มีสิทธิ์อ่านข้อมูลของตนเท่านั้น การเขียนทั้งหมดและ
shared cache ใช้ service role ฝั่ง server หลังตรวจ authentication/ownership.

## ADR-010 — Readiness Gate Is Rule-Based and Precedes AI

Status: Accepted

`POST /api/lesson-plans/validate` normalize แผนแล้วตรวจ readiness, alignment, GPAS และ
assessment โดยไม่เรียก AI. Critical issue คืน `lesson_plan_not_ready` และต้อง block
evaluation job ใน Phase 4. Validator เป็น additive module จึงไม่เปลี่ยน evaluator เดิม
จนกว่าจะมี integration และ regression evidence.

## ADR-011 — Unified Evaluation Is Section-Scoped and Anchor-Locked

Status: Accepted

Phase 4 ใช้ `SECTION_REGISTRY` เลือกเฉพาะข้อมูลที่จำเป็นต่อ criterion เดียว. AI ไม่มีสิทธิ์
รวมคะแนนและต้องเลือก score จาก rubric anchor เท่านั้น. Output ทุก section บังคับ
`evidence_found`/`missing_evidence`, ผ่าน consistency checker และใช้ deadline รวมไม่เกิน
45 วินาทีแม้มี repair retry.

Evaluator รุ่นเดิมยังไม่ถูกแทนที่จนกว่า Phase 5 async APIs และ regression QA พร้อม.

## ADR-012 — One AI Section per Serverless Request

Status: Accepted

Phase 5 แยก create ออกจาก AI processing และให้ `POST /api/evaluations/process`
claim/evaluate เพียงหนึ่ง section ต่อ request. Frontend เรียกซ้ำตาม `processNext`
เพื่อลดความเสี่ยง Vercel 60 วินาที โดยมี deadline ภายใน engine 45 วินาที.

Job/result writes ใช้ service role หลังตรวจ session ownership, ตรวจ lesson hash
ก่อนเรียก AI และ aggregate จาก completed section JSON เท่านั้น. Legacy evaluation
routes ยังคงอยู่สำหรับ DOCX และ rollback.
