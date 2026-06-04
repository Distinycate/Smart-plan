# 🧠 AGENT CONTEXT & SYSTEM ARCHITECTURE
*(เอกสารสำหรับ AI อ่านทบทวนก่อนเริ่มทำงานต่อ เพื่อความเข้าใจระบบอย่างลึกซึ้ง)*

## 1. Project Overview
*   **Project Name:** ระบบสร้างแผนการจัดการเรียนรู้อัจฉริยะ (AI Lesson Plan Generator)
*   **Goal:** ระบบที่ให้ครูเลือกวิชา ระดับชั้น และตัวชี้วัด แล้วให้ Gemini AI เจนแผนการสอนแบบ Active Learning 5 ขั้นตอน พร้อมเกณฑ์การประเมิน (Rubric) ที่สอดคล้องกับจุดประสงค์การเรียนรู้
*   **Tech Stack:** Next.js 14 (App Router), React, TailwindCSS, Supabase (PostgreSQL), Google Gemini API (gemini-flash-latest).

## 2. Database Schema (Supabase)
*   **Indicators Table:** เก็บตัวชี้วัดทั้งหมด 1,252 รายการ (ดึงข้อมูลตรงจากตารางในไฟล์ Word สะอาดและไม่ซ้ำซ้อน)
    *   *Columns:* `indicatorId`, `learningArea` (กลุ่มสาระ), `gradeLevel` (ชั้น), `standardCode`, `standardText`, `indicatorType` (`during` หรือ `final`), `indicatorCode`, `indicatorText`, `isActive`.
*   **Subjects & Units Table:** เก็บข้อมูลรายวิชาและหน่วยการเรียนรู้
*   **Plans Table:** เก็บแผนการสอนที่บันทึกแล้ว

## 3. Core Components & Logic
### 3.1 Frontend (`app/plan/PlanForm.tsx`)
*   ฟอร์มหลักที่ใช้สร้างและแก้ไขแผนการสอน
*   **CRITICAL LOGIC:** การกรองตัวชี้วัด (Indicators Dropdown) ต้องกรองด้วย **`gradeLevel` (ระดับชั้น) ควบคู่กับ `learningArea` (กลุ่มสาระ)** เท่านั้น เพื่อป้องกันตัวชี้วัดข้ามวิชามาปะปนกัน (เพราะ Database ปัจจุบันเก็บรวมทุกวิชา)
*   มีการแบ่งการเรียก AI ออกเป็น 2 Phase (`handleAIPhase1`, `handleAIPhase2`).

### 3.2 Backend - AI Phase 1 (`app/api/ai-process/route.ts`)
*   **หน้าที่:** ออกแบบโครงสร้างหลักและกระบวนการเรียนรู้
*   **Data Fetching:** API จะไป Query ข้อมูลมาตรฐานและตัวชี้วัดจากตาราง `Indicators` บน Supabase โดยตรง (ใช้ `gradeLevel` และ `learningArea` เป็นตัวกรอง)
*   **AI Prompt Rules:** 
    *   ต้องสร้างแค่ 8 ส่วนแรก: สาระสำคัญ, มาตรฐาน, ตัวชี้วัด, จุดประสงค์ (K, P, A), สมรรถนะ, คุณลักษณะ, กระบวนการเรียนรู้
    *   **กระบวนการเรียนรู้:** บังคับใช้ **Active Learning 5 ขั้นตอน** (1. ขั้นนำ 2. ขั้นสอน 3. ขั้นฝึก 4. ขั้นประยุกต์ 5. ขั้นสรุป) ต้องระบุว่า "ใคร ทำอะไร อย่างไร" ชัดเจน

### 3.3 Backend - AI Phase 2 (`app/api/ai-completion/route.ts`)
*   **หน้าที่:** ออกแบบการวัดและประเมินผล
*   **AI Prompt Rules:**
    *   รับข้อมูลที่ได้จาก Phase 1 (กระบวนการเรียนรู้ และ จุดประสงค์ K,P,A) ไปวิเคราะห์ต่อ
    *   **การประเมินผลต้องสอดคล้องแบบ 1-to-1** กับจุดประสงค์ K, P, A
    *   ต้องสร้างเกณฑ์ Rubric 5 ระดับ (5, 4, 3, 2, 1) ที่สอดคล้องและวัดผลได้จริง

## 4. Past Critical Bugs Resolved (Do Not Repeat)
1.  **Indicator Duplication/Corrupted Text:** เคยพยายามสกัดข้อมูลจาก PDF/Excel แล้วตัวหนังสือซ้อนทับกัน *วิธีแก้:* เปลี่ยนไปเขียนสคริปต์ (`scratch_docx/parse_logic_v2.js`) ดึงตารางจากเอกสาร Word (`.docx`) โดยตรง ได้ข้อมูลสมบูรณ์ 100%
2.  **Indicator Filtering Bug:** ใน `PlanForm.tsx` เคยกรองตัวชี้วัดแค่ชั้นเรียน ทำให้วิชาปนกัน *วิธีแก้:* เพิ่มการกรอง `learningArea` ควบคู่ด้วยแล้ว
3.  **Hardcoded Data vs DB:** `/api/ai-process` เคยดึงตัวชี้วัดจากตัวแปร Hardcoded ใน `lib/subjectStandardsData.ts` ซึ่งล้าสมัย *วิธีแก้:* ปรับให้ไป Fetch จากตาราง `Indicators` ใน Supabase แทนแล้ว

## 5. Next Actions / Pending Tasks
*(เว้นว่างไว้สำหรับระบุงานในอนาคต หากมีงานใหม่ให้มาต่อยอดจากจุดนี้)*
- [ ] รอรับ Requirement ใหม่จาก User

---
**📍 คำแนะนำสำหรับ AI ใน Session ถัดไป:** 
เมื่อเริ่มบทสนทนาใหม่ ให้อ่านไฟล์นี้ก่อนเป็นอันดับแรก เพื่อทำความเข้าใจบริบท สถาปัตยกรรม และข้อควรระวังต่างๆ ก่อนทำการรันคำสั่งแก้ไขโค้ดใดๆ
