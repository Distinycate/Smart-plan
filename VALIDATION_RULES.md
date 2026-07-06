# Validation Rules

## Lesson Draft

ใช้ validation เดิมใน `lib/lessonPlanValidation.ts`. ห้ามเปลี่ยนจนกว่าจะมี regression evidence.

## Unit Draft

ต้องมี:

- `academicYear`
- `semester`
- `gradeLevel`
- `subjectId` หรือ `subjectName`
- `unitName`

`totalUnitHours` ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป

## Unit Ready

ต้องมีข้อกำหนด Draft และ:

- `totalUnitHours > 0`
- indicator อย่างน้อยหนึ่งรายการ
- `unitLearningOutcomes`
- `unitAssessmentOverview`
- UnitLesson อย่างน้อยหนึ่งรายการ

Foundation UI เปิดเฉพาะ Draft จนกว่า UnitLessons จะพร้อม

## Quality Platform Pre-Evaluation

ก่อนส่งแผนเข้า AI ให้ normalize เป็น canonical `LessonPlan` และเรียก
`preValidateLessonPlan(plan, mode)`.

Critical ที่ block การประเมิน:

- ไม่มีมาตรฐาน
- ไม่มีตัวชี้วัด
- ไม่มีจุดประสงค์
- ไม่มีกิจกรรม
- ไม่มี assessment methods
- ไม่มี assessment tools
- ไม่มี rubric สำหรับ `wpa_w9` หรือ `committee_4d`

ถ้ามี critical issue ต้องคืน `ready=false` และ
`status=lesson_plan_not_ready`; ห้ามเรียก AI.
