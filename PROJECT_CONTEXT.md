# Project Context

Source of truth คือโฟลเดอร์นี้: Next.js 14, React, TypeScript, Supabase PostgreSQL/Auth และ Gemini API

ระบบเดิม Google Apps Script เป็น reference เท่านั้น ห้ามนำกลับมาแทน production stack โดยไม่มี architecture decision.

## Current Architecture State

- Legacy LessonPlan workflow ยังอยู่ใน `app/plan/PlanForm.tsx` และเป็น compatibility baseline
- Unit Planner, UnitLessons, Unit export และ alignment preview มี source แล้ว; สถานะ migration
  บน environment เป้าหมายต้องยืนยันด้วย Supabase ก่อนกล่าวว่าใช้งานจริง
- Canonical LessonPlan อยู่ใน `lib/lesson-plan/` และ map จาก legacy flat record ด้วย normalizer
- Legacy field mapping และ canonical write guard อยู่ใน `lib/lesson-plan/legacy-contract.ts`
- Golden Path registry อยู่ใน `lib/architecture/canonical-flow-registry.ts`
- Saved-plan evaluation ใช้ `/api/evaluations/*`; legacy evaluator ยังอยู่เฉพาะ compatibility
- AI improvement เป็น proposal-only: ห้าม patch processor update `LessonPlans` อัตโนมัติ
- Phase 1 Wave 1 เพิ่ม server-side authorization primitives ใน `lib/auth/authorization.ts`
  และ migration 12 สำหรับ profile/RLS hardening; ยังไม่ยืนยันว่า migration ถูกใช้ใน
  Supabase production
- Phase 1 Wave 2A ป้องกัน canonical AI runtime ผ่าน `lib/ai/canonical-ai-boundary.ts`
  และ migration 13; การทำงานจริงยังต้อง run migration และตรวจด้วย authenticated staging
- Phase 1 Wave 2B เพิ่ม explicit ownership boundary สำหรับ LessonPlan detail/update/archive/
  restore/export และ UnitPlan/UnitLesson/export; ไม่มี migration เพิ่มใน Wave นี้

## Safety

- ห้ามรัน `database/schema.sql` บน production
- ห้าม reset/revert dirty worktree
- ห้าม backfill LessonPlans อัตโนมัติ
- AI เสนอได้ แต่ครูต้องตรวจทานและอนุมัติก่อน apply ทุกครั้ง
- `profiles.role` เป็น server-controlled; ห้ามเชื่อ identity/role จาก client payload,
  query string หรือ localStorage
- middleware ป้องกันเฉพาะ page navigation; API ต้องตรวจ user/role/ownership เอง
- Canonical AI ต้องผ่าน session, payload boundary และ database admission ก่อน Gemini;
  legacy AI routes ยังอยู่ระหว่าง containment และห้ามถือว่าปลอดภัยแล้ว
- Admin เป็น read-only ต่อ LessonPlan ของครูคนอื่นใน application contract จนกว่า reviewer
  workflow จะได้รับการออกแบบและพิสูจน์แล้ว
- ห้ามกล่าวว่าพร้อม production จน manual regression ผ่าน
