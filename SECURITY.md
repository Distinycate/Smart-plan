# Security

- Secrets อยู่ใน environment variables เท่านั้น
- `.env.local` ห้าม commit
- Unit APIs ตรวจ Supabase user ทุก request
- V2 tables เปิด RLS และจำกัดข้อมูลด้วย `user_id`
- Service role ใช้เฉพาะ server สำหรับ audit/log
- ห้ามเชื่อถือ `user_id` จาก client
- ห้ามแสดง raw database error แก่ผู้ใช้
- HTML export ต้อง escape user/AI content
- AI output ต้อง validate และ review ก่อน apply
- AI queue ไม่เปิด anon/browser policy และตรวจเจ้าของ job ทุกครั้ง
- Alignment endpoint ต้องมี queue admission ที่เป็นของผู้ใช้และยังไม่หมด lease
- Prompt alignment ไม่ส่งชื่อครู โรงเรียน อีเมล หรือ secret
- Word export escape ข้อมูลครู/AI ก่อนประกอบ HTML
- Quality Platform tables เปิด RLS และให้ผู้ใช้ read เฉพาะ job/plan ของตน.
- Quality Platform ไม่มี direct client write policy; jobs/results/issues/versions/patches/cache
  ต้องเขียนผ่าน server-side service role หลังตรวจ auth และ ownership.
- `evaluation_cache` เป็น service-role only เพื่อป้องกันผลประเมินข้ามผู้ใช้รั่วไหล.
- Validation API บังคับ auth; การโหลด `lessonPlanId` ใช้ Supabase RLS และไม่คืน raw plan.
- Rule-based validation ไม่ส่งข้อมูลแผนออกไปยัง AI หรือ third party.
- Evaluation prompt ส่งเฉพาะ section data ที่ registry อนุญาต ไม่ส่งแผนทั้งฉบับ.
- Evaluation engine ไม่ส่ง metadata ครู/โรงเรียนใน section ที่ไม่เกี่ยวข้อง.
- Evaluation API key อ่านจาก server environment เท่านั้น.
- Phase 5 status/result/process/retry ตรวจ `evaluation_jobs.user_id` กับ authenticated user.
- Phase 5 โหลด LessonPlan ด้วย RLS ตอน create และตรวจ SHA-256 hash ซ้ำก่อน process.
- Cache hit ต้องสร้าง completed job ของผู้ใช้ก่อนคืนผล ห้ามคืน shared cache โดยไม่มี ownership record.
- Admin evaluation ต้องใช้ authenticated Supabase RLS policy เดียวกับ plan detail;
  ห้ามใช้ service-role โหลดแผนโดยไม่ตรวจ session และห้ามบังคับ owner equality
  เพราะ Admin มีสิทธิ์ตรวจแผนที่หน้า Admin แสดง.
- Diagnostic normalize route ต้องบังคับ auth และไม่คืน `user_id` ของเจ้าของแผน.

## Known Security Risks

- Wave 1 hardening เปลี่ยน `profiles.role` เป็น server-controlled attribute ผ่าน
  policy/column privilege migration `12_security_identity_authorization_foundation.sql`.
  ต้อง run และตรวจ production RLS/grants ก่อนถือว่าแก้ช่องโหว่จริง.
- middleware ป้องกันเฉพาะ page navigation; API ถูก exclude โดยตั้งใจและต้องตรวจ
  authentication/authorization ภายใน route ทุกครั้ง.
- export, restore, AI generation และ legacy evaluation routes ยังต้องทำ Wave 2
  API Security Boundary ก่อน production sign-off.
- `database/schema.sql` เป็น destructive และห้ามใช้ production

## Phase 1 Authorization Contract

- Identity ต้องมาจาก `supabase.auth.getUser()` เท่านั้น; ห้ามใช้ `userId` จาก body,
  query string, localStorage หรือ client state เป็นสิทธิ์เข้าถึง.
- `profiles.role`, `profiles.id`, `profiles.email`, และ `profiles.created_at` เป็น
  system-controlled fields. ผู้ใช้แก้ได้เฉพาะ `full_name`, `gender`, `age`,
  `subject_group`, และ `grade_levels`.
- ใช้ `lib/auth/authorization.ts` เป็น primitive กลาง: `requireUser`,
  `requireAdmin`, `requirePlanOwner`, `requireUnitPlanOwner`,
  `requireEvaluationOwner`, `requirePatchOwner`.
- การยืนยันหน้าเว็บผ่าน middleware เป็น UX guard เท่านั้น; API ownership check
  และ RLS เป็น security boundary ที่ต้องมีเสมอ.

## Phase 1 Wave 2A — Canonical AI Runtime Boundary

- PlanForm Golden Path routes (`ai-process-core`, `ai-process-activity`,
  `ai-completion-k/p/a/reflection`) ต้องเรียก `requireUser()` ก่อน parse payload
  หรือเรียก Gemini. Anonymous request ต้องได้รับ `401`.
- Canonical AI request body มี hard limit 48 KiB และ validate field type, required
  fields, string length และ `totalHours` ก่อน admission.
- Migration 13 เพิ่ม database-backed distributed concurrency admission ใน `ai_jobs`.
  จำกัด global และ per-user concurrent requests ผ่าน environment limits; หาก RPC/schema
  ยังไม่พร้อม ระบบ fail closed ด้วย `503` แทนการเรียก Gemini แบบไม่มี shared boundary.
- Admission เป็น concurrency limiter ไม่ใช่ distributed per-minute rate limiter.
  ต้องเพิ่ม managed rate-limit provider ใน Wave 4 หลังยืนยัน deployment architecture.
- Legacy AI/evaluation routes ยังไม่ถูกปิดใน Wave 2A เพราะ `app/evaluator/page.tsx`
  ยังมี callers; ต้อง migrate/test caller ก่อน Wave 2D containment.

## Phase 1 Wave 2B — Plan & Unit Ownership Boundary

- Lesson Plan contract: teacher owner อ่าน/แก้/archive/restore/export ได้;
  administratorอ่านแผนครูคนอื่นได้ แต่ไม่มี implicit write, restore หรือ export privilege.
- `requirePlanReader()` ใช้สำหรับ detail/preview read และ `requirePlanOwner()` ใช้กับ
  update/archive/restore/Word/PDF. Unauthorized resource คืน `404` เพื่อไม่เปิดเผย ID.
- UnitPlan, Unit export และ preview เป็น owner-only. UnitLesson authorization ต้อง
  resolve parent UnitPlan ก่อน และตรวจว่า `UnitLessons.unitPlanId` ตรงกับ URL parent
  กับ `user_id` ของ session จริง.
- ไม่มี API direct สำหรับ UnitAssessments หรือ Rubrics ใน source ปัจจุบัน; route ใหม่ใน
  อนาคตต้องเริ่มจาก parent ownership contract ไม่ใช่รับ owner ID จาก body.
- Service-role ใช้ได้เฉพาะ backup/log/reorder หลัง route ผ่าน ownership check แล้ว.
- RLS ไม่ถูกผ่อนหรือแทนที่: application authorization เป็น layer เพิ่มเหนือ RLS/constraints.

## API Key Incident Note — 2026-07-06

พบ ignored local test scripts ที่เคยฝังคีย์ Gemini แบบ plaintext.
ค่าถูกนำออกแล้วและตรวจซ้ำไม่พบรูปแบบ key ใน source นอก `.env.local`.
เนื่องจาก key เคยอยู่ในไฟล์ข้อความ ควร rotate key ชุดนั้นและอัปเดต Vercel/Supabase environment
แม้การทดสอบปัจจุบันจะตอบ HTTP 200.
