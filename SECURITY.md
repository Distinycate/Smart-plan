# Security

- Secrets อยู่ใน environment variables เท่านั้น
- `.env.local` ห้าม commit
- Unit APIs ตรวจ Supabase user ทุก request
- V2 tables เปิด RLS และจำกัดข้อมูลด้วย `user_id`
- Service role ใช้เฉพาะ server สำหรับ audit/log
- ห้ามเชื่อถือ `user_id` จาก client
- ห้ามแสดง raw database error แก่ผู้ใช้
- HTML export ต้อง escape user/AI content
- AI output ต้อง validate และ review ก่อน apply
- AI queue ไม่เปิด anon/browser policy และตรวจเจ้าของ job ทุกครั้ง

## Known Security Risks

- middleware protection ทั่วไปถูก disable ด้วยเงื่อนไข `false`; API สำคัญต้องตรวจ auth เอง
- export และ restore routes เดิมต้อง audit เรื่อง auth/RLS
- `database/schema.sql` เป็น destructive และห้ามใช้ production
