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

