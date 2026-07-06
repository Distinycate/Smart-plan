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

