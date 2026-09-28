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

## ADR-013 — Golden Path and Preview-First AI Improvement

Status: Accepted

ตั้งแต่ Phase 0 งานใหม่ต้องต่อกับ Golden Path เดียว: `PlanForm`/`UnitPlannerForm`
→ Core + Activity → K/P/A/Reflection → `/api/evaluations/*` → AI proposal →
teacher review → explicit apply → export. รายชื่อ canonical และ compatibility routes
อยู่ใน `lib/architecture/canonical-flow-registry.ts`.

`/api/ai`, `/api/ai-phase*`, `/api/ai-evaluate*`, และ `/api/evaluation-jobs/*`
ยังคงอยู่เพื่อ compatibility เท่านั้น ห้ามพัฒนาฟีเจอร์ใหม่บนเส้นทางเหล่านี้.

AI improvement ไม่อาจ update `LessonPlans` หรือสร้าง recheck/cache invalidation
โดยอัตโนมัติอีกต่อไป. Patch job บันทึก proposal ใน `lesson_plan_patches` ด้วย
`applied=false` และแสดง before/after/reason ให้ครูตรวจทานก่อน. Apply ราย section,
backup/version history และ recheck จะถูกเพิ่มเป็น explicit teacher action ใน phase ถัดไป.

Legacy-to-canonical source-field mapping อยู่ใน `lib/lesson-plan/legacy-contract.ts`.
ไฟล์นี้ประกาศชัดว่า canonical model เป็น read-side boundary ในปัจจุบัน และห้ามสร้าง
automatic write mapper ก่อนมี teacher review, stale-hash, backup/version และ validation.

## ADR-014 — Server-Controlled Identity Before Any New Write Path

Status: Accepted

Phase 1 Wave 1 กำหนดว่า identity ต้องมาจาก `supabase.auth.getUser()` และ role เป็น
server-controlled attribute เท่านั้น. Client body, query string, localStorage และ UI role
ไม่มีสิทธิ์ตัดสิน authorization. Migration 12 จำกัด `profiles` update เหลือเฉพาะ field
ครูที่แก้ไขได้ และยกเลิก public profile read policy โดยไม่แก้หรือลบ profile row เดิม.

`lib/auth/authorization.ts` เป็น authorization primitive สำหรับ route ใหม่/route ที่กำลัง
harden: `requireUser`, `requireAdmin`, `requirePlanOwner`, `requireUnitPlanOwner`,
`requireEvaluationOwner`, และ `requirePatchOwner`. Middleware เป็นเพียง page-navigation
guard; API ต้องตรวจ session, role, ownership และ RLS ด้วยตัวเองเสมอ.

ห้ามสร้าง Apply Proposal, reviewer role หรือ write workflow ใหม่จนกว่า Wave 2 API
boundary และ Wave 4 production RLS verification ผ่านจริง.

## ADR-015 — Canonical AI Uses Database-Backed Admission

Status: Accepted

Canonical PlanForm AI routesต้องตรวจ authenticated user, bounded/validated request body และ
database-backed admission ก่อนเรียก Gemini. การ admission เป็น RPC ที่ใช้ advisory lock
เพื่อจำกัด concurrent request แบบข้าม serverless instance ทั้ง global และต่อผู้ใช้.

ระบบไม่ใช้ in-memory limiter เป็น production control. หาก migration 13/RPC ไม่พร้อม
route ต้อง fail closed (`503`) เพื่อไม่ใช้ Gemini โดยไม่มี shared security boundary.
การจำกัด request ต่อเวลาเป็นงาน production infrastructure ใน Wave 4; ห้ามอ้างว่า
concurrency admission แทน rate limiting ได้ทั้งหมด.

## ADR-016 — Admin Read Does Not Imply Teacher-Plan Write

Status: Accepted

Phase 1 Wave 2B แยก `requirePlanReader()` ออกจาก `requirePlanOwner()`. ผู้ดูแลระบบ
อาจอ่านแผนของครูคนอื่นเพื่อดูแลระบบ แต่ไม่มี implicit authority ในการแก้ไข, archive,
restore หรือส่งออกเอกสารของครูคนนั้น. Reviewer/Director จะเป็น role แยกใน Workflow
phase พร้อม policy เฉพาะ ไม่ใช่ขยาย admin privilege แบบเงียบ ๆ.

Unit child resources derive ownership from their persisted parent relationship. Route ต้องไม่
เชื่อ `unitPlanId`, `unitLessonId`, หรือ `user_id` จาก client จนกว่าจะตรวจ FK relationship
กับ UnitPlan ที่เป็นเจ้าของแล้ว.
