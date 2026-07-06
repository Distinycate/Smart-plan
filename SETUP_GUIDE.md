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
