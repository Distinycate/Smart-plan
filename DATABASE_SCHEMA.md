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

## Safety

ห้ามรัน `database/schema.sql` บน production เพราะมี `DROP TABLE`. Production ใช้ migration ใน `database/migrations/` เท่านั้น
