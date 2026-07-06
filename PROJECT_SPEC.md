# Project Specification

Smart Plan เป็นระบบ Next.js/Supabase สำหรับสร้างแผนรายคาบและต่อยอดเป็นแผนระดับหน่วย โดยต้องรักษา workflow รายคาบเดิม การบันทึก การสำรองข้อมูล และการส่งออก Word/PDF

## V2 Foundation Scope

- เพิ่มแผนระดับหน่วยแบบร่าง
- เพิ่ม schema แบบ non-destructive
- เพิ่ม VersionHistory ก่อนแก้ UnitPlan
- เพิ่ม completion checklist
- คง LessonPlan แบบ standalone

## Out of Scope

- backfill แผนเก่า
- Unit export
- AI alignment สำหรับ UnitPlan
- การสร้าง UnitLessons ด้วย AI
- การลบหรือเปลี่ยนชื่อ field เดิม

## Definition of Done

ถือว่าพร้อม release เมื่อ migration รันซ้ำได้, Unit draft บันทึกได้, update มี VersionHistory และ regression รายคาบ/Word/PDF ผ่านการทดสอบจริง

