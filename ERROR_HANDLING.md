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

ห้ามส่ง secret, service-role key หรือ raw payload ที่มีข้อมูลส่วนบุคคลลง client/log. เมื่อ save ล้มเหลว UI ต้องเก็บข้อมูลใน form.
