# Setup Guide

## Local

1. ใช้ Node.js 20
2. ติดตั้ง dependencies ด้วย `npm install`
3. สร้าง `.env.local` จาก `.env.example`
4. ตั้งค่า Supabase URL, anon key, service-role key และ Gemini keys
5. รัน `npm run dev`

## V2 Staging Migration

1. สำรองฐานข้อมูลก่อน
2. ตรวจว่า environment เป็น staging
3. รัน `database/migrations/05_unit_planning_v2_foundation.sql`
4. รันไฟล์เดิมซ้ำเพื่อทดสอบ idempotency
5. ตรวจ `SchemaVersions`
6. รัน QA ใน `QA_TEST_CASE.md`

ห้ามรัน `database/schema.sql` บน production

## Shared AI Queue Migration

ก่อน deploy concurrency fix ให้รัน
`database/migrations/06_ai_jobs_concurrency_queue.sql` บน staging และรันซ้ำ
เพื่อยืนยัน idempotency จากนั้นตั้ง `AI_CONCURRENCY_LIMIT=1` เป็นค่าเริ่มต้น
และทดสอบด้วยผู้ใช้สองบัญชีพร้อมกันก่อน production.

## Unit Lesson Sequence Migration

หลัง migration 05 ให้รัน `database/migrations/07_unit_lesson_sequence.sql`
เพื่อเพิ่ม atomic reorder function และ partial unique index จากนั้นรันซ้ำเพื่อทดสอบ idempotency.

ตั้ง `GEMINI_API_KEY_ALIGNMENT` ได้หากต้องการแยก quota สำหรับ Alignment;
หากไม่ตั้ง ระบบใช้ `GEMINI_API_KEY`.

## Gemini Latency Configuration

- ตั้ง `GEMINI_FAST_MODEL=gemini-2.5-flash-lite` สำหรับ split generation routes.
- ตั้ง `GEMINI_API_KEYS` เป็นรายการ active keys คั่นด้วย comma เพื่อให้ retry สลับ key ได้.
- ลบ key เก่าที่หมดอายุออกจาก Vercel แล้ว redeploy ทุกครั้งหลังแก้ Environment Variables.
- อย่าตั้ง `GEMINI_API_KEYS` ซ้ำกับ `GEMINI_API_KEY` เพียงค่าเดียว หากต้องการรองรับผู้ใช้พร้อมกันจริง.
- ตรวจ Vercel Function Logs ว่าไม่มี 401/403/429/503 ต่อเนื่องก่อนเปิด production.

## Quality Platform Phase 2 Migration

1. สำรอง staging database.
2. ตรวจ `LessonPlans.planId` เป็น `VARCHAR(255)` และมี `user_id`.
3. รัน `database/migrations/09_lesson_plan_quality_platform.sql`.
4. รันไฟล์เดิมซ้ำอีกครั้งเพื่อตรวจ idempotency.
5. ตรวจ 6 tables, constraints, indexes, trigger, RLS และ `SchemaVersions`.
6. ห้าม deploy production ก่อนผ่าน staging verification.

## Quality Platform Phase 5 Runtime

ตั้ง `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY_EVALUATE` และ
`GEMINI_EVALUATION_MODEL=gemini-2.5-flash-lite` บน server. หน้า evaluator จะสร้าง
job แล้วเรียก `/api/evaluations/process` ทีละ section; ห้ามเปลี่ยนเป็น request เดียว
ที่รอ AI ครบทุก section. ตรวจ flow ตาม `AI_TO_AI_HANDOFF.md` บน staging ก่อน deploy.
