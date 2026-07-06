# Business Rules

- BR-SEL-001: เปลี่ยนระดับชั้นต้องล้าง subject, unit และ indicator ที่ไม่สัมพันธ์
- BR-SEL-002: เปลี่ยนรายวิชาต้องล้าง unit และ indicator ที่ไม่สัมพันธ์
- BR-SEL-003: เลือกหน่วยแล้วโหลด indicator จากฐานข้อมูล
- BR-EDIT-001: ครูแก้ข้อมูลที่ระบบเติมได้
- BR-EDIT-002: ห้าม overwrite ข้อมูลครูแบบเงียบ
- BR-SAVE-001: LessonPlan และ UnitPlan บันทึกร่างได้ตาม validation ขั้นต่ำ
- BR-SAVE-002: update UnitPlan ต้องมี VersionHistory ก่อน
- BR-UNIT-001: UnitPlan ไม่บังคับ LessonPlans เดิมให้ผูกหน่วย
- BR-UNIT-002: Ready ต้องมีชั่วโมง, indicator, outcomes, assessment และ UnitLesson
- BR-UNIT-003: ผลรวม `estimatedHours` ของ UnitLessons ที่ไม่ archived ต้องตรงกับ `totalUnitHours` ก่อน Ready
- BR-UNIT-004: ลำดับแผนต้องไม่ซ้ำและ reorder ต้องทำแบบ transaction
- BR-UNIT-005: การนำแผนรายคาบออกใช้ archive ไม่ hard delete
- BR-ARC-001: ใช้ archive แทน hard delete
- BR-MIG-001: migration เป็น additive, idempotent และไม่ backfill รอบแรก
- BR-AI-001: AI เป็นข้อเสนอ ครูต้อง review/apply เอง
- BR-EXP-001: export รายคาบเดิมห้ามเสียหาย
