# Project Context

Source of truth คือโฟลเดอร์นี้: Next.js 14, React, TypeScript, Supabase PostgreSQL/Auth และ Gemini API

ระบบเดิม Google Apps Script เป็น reference เท่านั้น ห้ามนำกลับมาแทน production stack โดยไม่มี architecture decision.

## Current V2 State

- LessonPlan workflow เดิมยังอยู่ใน `app/plan/PlanForm.tsx`
- V2 Unit draft source ถูกเพิ่มแล้ว
- V2 migration ยังไม่ถูกรัน
- UnitLessons, Unit export และ Unit AI ยังไม่พร้อม
- Runner instructions อยู่ที่ `../AI_HANDOFF_V2_FOUNDATION.md`

## Safety

- ห้ามรัน `database/schema.sql` บน production
- ห้าม reset/revert dirty worktree
- ห้าม backfill LessonPlans อัตโนมัติ
- ห้ามกล่าวว่าพร้อม production จน manual regression ผ่าน

