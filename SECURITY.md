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
- Alignment endpoint ต้องมี queue admission ที่เป็นของผู้ใช้และยังไม่หมด lease
- Prompt alignment ไม่ส่งชื่อครู โรงเรียน อีเมล หรือ secret
- Word export escape ข้อมูลครู/AI ก่อนประกอบ HTML
- Quality Platform tables เปิด RLS และให้ผู้ใช้ read เฉพาะ job/plan ของตน.
- Quality Platform ไม่มี direct client write policy; jobs/results/issues/versions/patches/cache
  ต้องเขียนผ่าน server-side service role หลังตรวจ auth และ ownership.
- `evaluation_cache` เป็น service-role only เพื่อป้องกันผลประเมินข้ามผู้ใช้รั่วไหล.
- Validation API บังคับ auth; การโหลด `lessonPlanId` ใช้ Supabase RLS และไม่คืน raw plan.
- Rule-based validation ไม่ส่งข้อมูลแผนออกไปยัง AI หรือ third party.
- Evaluation prompt ส่งเฉพาะ section data ที่ registry อนุญาต ไม่ส่งแผนทั้งฉบับ.
- Evaluation engine ไม่ส่ง metadata ครู/โรงเรียนใน section ที่ไม่เกี่ยวข้อง.
- Evaluation API key อ่านจาก server environment เท่านั้น.
- Phase 5 status/result/process/retry ตรวจ `evaluation_jobs.user_id` กับ authenticated user.
- Phase 5 โหลด LessonPlan ด้วย RLS ตอน create และตรวจ SHA-256 hash ซ้ำก่อน process.
- Cache hit ต้องสร้าง completed job ของผู้ใช้ก่อนคืนผล ห้ามคืน shared cache โดยไม่มี ownership record.

## Known Security Risks

- middleware protection ทั่วไปถูก disable ด้วยเงื่อนไข `false`; API สำคัญต้องตรวจ auth เอง
- export และ restore routes เดิมต้อง audit เรื่อง auth/RLS
- `database/schema.sql` เป็น destructive และห้ามใช้ production

## API Key Incident Note — 2026-07-06

พบ ignored local test scripts ที่เคยฝังคีย์ Gemini แบบ plaintext.
ค่าถูกนำออกแล้วและตรวจซ้ำไม่พบรูปแบบ key ใน source นอก `.env.local`.
เนื่องจาก key เคยอยู่ในไฟล์ข้อความ ควร rotate key ชุดนั้นและอัปเดต Vercel/Supabase environment
แม้การทดสอบปัจจุบันจะตอบ HTTP 200.
