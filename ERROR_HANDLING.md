# Error Handling

Unit APIs ใช้รูปแบบ:

```json
{ "ok": true, "data": {}, "message": "สำเร็จ", "warnings": [] }
```

```json
{
  "ok": false,
  "errorCode": "E_VALIDATION_FAILED",
  "message": "ข้อความภาษาไทย",
  "details": {},
  "recoverable": true
}
```

Error codes หลัก: `E_VALIDATION_FAILED`, `E_PERMISSION_DENIED`, `E_UNIT_NOT_FOUND`, `E_BACKUP_FAILED`, `E_UNKNOWN`.

Queue error codes: `E_QUEUE_SCHEMA_MISSING`, `E_QUEUE_UNAVAILABLE`,
`E_QUEUE_JOB_NOT_FOUND`, `E_QUEUE_ADMISSION_REQUIRED`,
`E_QUEUE_ADMISSION_INVALID`, `E_QUEUE_WAIT_TIMEOUT`.

Alignment error codes: `E_AI_FAILED`, `E_AI_INVALID_OUTPUT`,
`E_AI_HISTORY_FAILED`, `E_LESSON_NOT_FOUND`, `E_UNIT_NOT_FOUND`.

Lesson Plan validation error codes:
`E_PERMISSION_DENIED`, `E_INVALID_JSON`, `E_INVALID_EVALUATION_MODE`,
`E_LESSON_PLAN_NOT_FOUND`, `E_VALIDATION_FAILED`, `E_VALIDATION_INTERNAL`.

`lesson_plan_not_ready` เป็น validation status ไม่ใช่ server error และควรคืน HTTP 200
พร้อมรายการ critical issues เพื่อให้ UI แสดง checklist.

Unified Evaluation Engine ต้องแยก:

- invalid JSON / missing field → repair prompt ได้ 1 ครั้ง
- score นอก anchor / max score ไม่ตรง → reject และ retry
- evidence ขัดกับ score → consistency flag `retry_section`
- deadline เกิน 45 วินาที → section failed; Phase 5 เป็นผู้บันทึกและ retry

Phase 5 error codes:
`E_JOB_NOT_FOUND`, `E_JOB_NOT_PROCESSABLE`, `E_RETRY_NOT_ALLOWED`,
`E_FAILED_SECTION_NOT_FOUND`, `E_LESSON_PLAN_CHANGED`,
`E_DATABASE_READ`, `E_SERVER_CONFIGURATION`.

Section ที่ล้มเหลวต้องเก็บ `error_message` และ `attempt_count`; ห้ามลบผล section
ที่สำเร็จแล้ว และ retry ต้อง reset เฉพาะ section ที่เป็น `failed`.

Runtime compatibility note (2026-07-07): failure path ใช้สถานะ `failed` และ fields
จาก migration 09 เท่านั้น. ห้ามคืน `ok: true` เมื่อ AI section ล้มเหลว เพราะ UI
จะเข้าใจผิดว่า section สำเร็จและแสดงผลว่าง.

ห้ามส่ง secret, service-role key หรือ raw payload ที่มีข้อมูลส่วนบุคคลลง client/log. เมื่อ save ล้มเหลว UI ต้องเก็บข้อมูลใน form.
