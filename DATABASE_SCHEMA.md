# Database Schema

ฐานข้อมูล production คือ Supabase PostgreSQL ตารางเดิมที่ต้องรักษา:

`AppConfig`, `Subjects`, `Units`, `LessonTopics`, `Indicators`, `BasicOptions`, `LessonPlans`, `LessonPlan_Backup`, `System_Logs`

## V2 Additive Tables

- `UnitPlans`: ข้อมูลแผนระดับหน่วย
- `UnitLessons`: ลำดับแผนรายคาบในหน่วย
- `UnitAssessments`: การประเมินระดับหน่วย
- `Rubrics`: rubric ที่มี owner scope
- `AIHistory`: ประวัติข้อเสนอและการ review AI
- `VersionHistory`: snapshot ก่อน update
- `SchemaVersions`: migration audit

Migration source: `database/migrations/05_unit_planning_v2_foundation.sql`

Atomic reorder migration: `database/migrations/07_unit_lesson_sequence.sql`

ลำดับ (`lessonOrder`) unique เฉพาะรายการที่ `lessonStatus <> archived`.
การนำออกจากลำดับจึงเป็น archive และไม่ขวางการใช้หมายเลขลำดับเดิมในอนาคต

## Relationships

`UnitPlans 1 → many UnitLessons/UnitAssessments`  
`LessonPlans` ยัง standalone และยังไม่ถูก backfill หรือบังคับให้ผูก UnitPlan

## Lesson Plan Quality Platform Tables

Migration source: `database/migrations/09_lesson_plan_quality_platform.sql`

- `evaluation_jobs`: งานประเมินตาม mode/hash และ progress
- `evaluation_results`: ผลประเมินแยก section
- `lesson_plan_issues`: ปัญหาตาม severity
- `lesson_plan_versions`: canonical JSON snapshot และ hash
- `lesson_plan_patches`: patch audit ก่อน/หลัง
- `evaluation_cache`: ผลเดิมตาม `lesson_plan_hash + evaluation_mode`

ตารางใหม่ใช้ `lesson_plan_id VARCHAR(255)` เพื่ออ้างอิง
`LessonPlans.planId` เดิมโดยไม่แปลง ID. ตาราง `ai_evaluation_*` จาก migration 08
ยังคงอยู่และไม่ได้ถูกแก้ไข.

## Safety

ห้ามรัน `database/schema.sql` บน production เพราะมี `DROP TABLE`. Production ใช้ migration ใน `database/migrations/` เท่านั้น
