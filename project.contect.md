# 🤖 AI Agent Communication Hub
# ไฟล์สื่อสารระหว่าง AI Agent — Smart Plan System
# อัปเดตทุกครั้งที่ทำงาน และอ่านก่อนเริ่มงานเสมอ

---

## 📋 PROTOCOL — กฎการใช้ไฟล์นี้

1. **อ่านก่อนทำงานทุกครั้ง** — ดู CURRENT STATE และ PENDING TASKS
2. **เขียนหลังทำงานเสร็จ** — อัปเดต CHANGELOG และ CURRENT STATE
3. **ห้ามเขียนทับงานกัน** — ตรวจ `LOCKED_BY` ก่อนเริ่ม
4. **ใช้ timestamp** — รูปแบบ `YYYY-MM-DD HH:MM` เวลาไทย (UTC+7)

---

## 🔒 LOCK STATUS

```
LOCKED_BY   : NONE
LOCKED_AT   : —
LOCKED_TASK : —
```
> เมื่อเริ่มงาน ให้เขียน LOCKED_BY = ชื่อ AI ของคุณ แล้วล้างออกเมื่อเสร็จ

---

## 🌐 SYSTEM OVERVIEW (อ่านครั้งเดียว)

| รายการ | ค่า |
|--------|-----|
| Project | Smart Plan — ระบบช่วยจัดทำแผนการสอน |
| Stack | Next.js 14 (App Router) + TypeScript + Supabase |
| AI Integration | Gemini 2.5 Flash API |
| Git Branch | `main` → GitHub: `Distinycate/Smart-plan` |
| Local URL | http://localhost:3000 |
| DB | Supabase project: `tfvlkfmayxsgneyajhrl` |

---

## 📁 KEY FILES MAP (ไฟล์สำคัญ)

```
app/
  page.tsx                          ← Dashboard หน้าหลัก (ปรับปรุงล่าสุด)
  layout.tsx                        ← App shell + Header
  plan/
    PlanForm.tsx                    ← Form กรอกข้อมูลแผน (5 Tabs)
    new/page.tsx                    ← หน้าสร้างแผนใหม่
    [id]/page.tsx                   ← หน้าแก้ไขแผน
    [id]/preview/page.tsx           ← หน้า PDF Preview (A4)
  api/
    plans/route.ts                  ← GET all / POST new plan
    plans/[id]/route.ts             ← GET / PUT / DELETE single plan
    plans/[id]/export/word/route.ts ← Word export
    plans/[id]/export/pdf/route.ts  ← PDF export (Supabase storage)
    ai/route.ts                     ← Gemini AI autofill endpoint
    initial-data/route.ts           ← Load subjects/units/indicators/options

styles/globals.css                  ← Design system (CSS variables + classes)
database/
  alter_table.js                    ← DB migration helper (ใช้แล้ว)
  add_rubric_columns.js             ← เพิ่ม rubricK/P/A columns
  check_rubric_columns.js           ← ตรวจสอบ columns
```

---

## 🗄️ DATABASE SCHEMA — LessonPlans Table

### ✅ Confirmed Columns (มีอยู่แน่นอน)
```
planId, planStatus, teacherName, schoolName, organization
headerLearningArea, headerGradeLevel
subjectId, subjectName, subjectCode, learningArea, gradeLevel
semester, academicYear, totalHours
unitId, unitName, topicId, lessonTopic
learningStandard, indicatorDuring, indicatorFinal, indicatorSelectedIds
essentialConcept, objectiveK, objectiveP, objectiveA
learningContent, competencies, desiredAttributes, skills21
learningProcess
measureK, methodK, toolK, criteriaK
measureP, methodP, toolP, criteriaP
measureA, methodA, toolA, criteriaA
learningMedia, learningSources, tasks
resultK, resultP, resultA, problems, solutions
createdAt, updatedAt
```

### ⚠️ CRITICAL — คอลัมน์ที่ต้องเพิ่มใน Supabase
```sql
-- ต้องรันใน Supabase SQL Editor: 
-- https://supabase.com/dashboard/project/tfvlkfmayxsgneyajhrl/sql/new
ALTER TABLE "LessonPlans"
ADD COLUMN IF NOT EXISTS "rubricK" TEXT,
ADD COLUMN IF NOT EXISTS "rubricP" TEXT,
ADD COLUMN IF NOT EXISTS "rubricA" TEXT;
```
> **STATUS**: ⏳ รอผู้ใช้รันใน Supabase Dashboard (ไม่สามารถรันผ่าน script อัตโนมัติได้)

---

## 📐 DOCUMENT FORMAT RULES (มาตรฐานเอกสาร)

### ลำดับหัวข้อในแผนการสอน (1-10)
```
1.  สาระสำคัญ (Concept)
2.  มาตรฐานการเรียนรู้และตัวชี้วัด
3.  สมรรถนะสำคัญของผู้เรียน
4.  คุณลักษณะอันพึงประสงค์
5.  จุดประสงค์การเรียนรู้ (K/P/A)
5.1 ทักษะในศตวรรษที่ 21
6.  เนื้อหาสาระ
7.  สื่อและแหล่งการเรียนรู้ (1)สื่อ 2)แหล่ง 3)ชิ้นงาน)
8.  วิธีการดำเนินกิจกรรม ตามแนวคิด Active Learning
9.  การวัดและการประเมินผล (ตาราง 4 คอลัมน์ K/P/A)
9.1 เกณฑ์การประเมิน Rubrics (ตาราง 5 ระดับคะแนน)
10. บันทึกหลังการจัดกระบวนการเรียนรู้
```

### PlanForm.tsx — 5 Tabs
```
Tab 1: ข้อมูลวิชาและรายคาบ
Tab 2: สาระสำคัญและตัวชี้วัด (ข้อ 1-4)
Tab 3: จุดประสงค์และเนื้อหา (ข้อ 5-7)
Tab 4: กระบวนการและการวัดผล (ข้อ 8-9) ← มี Rubric K/P/A
Tab 5: บันทึกหลังสอน (ข้อ 10)
```

---

## ✅ CURRENT STATE (สถานะปัจจุบัน)

**Last updated**: 2026-06-03 06:26 (Thai time)  
**Updated by**: Antigravity (AI Agent 1)

### สิ่งที่ทำเสร็จแล้ว ✅
- [x] ลำดับหัวข้อ 1-10 ถูกต้องทั้ง Preview, Word Export, PlanForm
- [x] Rubric ใน Word Export แสดงเป็นตาราง 5 ระดับ (ไม่ใช่ข้อความธรรมดา)
- [x] ลบ fallback bug ที่ลบ rubricK/P/A ก่อน save ออกแล้ว
- [x] Dashboard redesign — Hero gradient + illustration + stat cards + plan card grid
- [x] บันทึกหลังสอน (Tab 5) ทำงานได้ปกติ
- [x] **PlanForm UI Update**: ลบการเลือกระดับชั้นซ้ำซ้อน และเปลี่ยนระบบเลือก EFL ให้ไม่เกะกะสายตา (Tab 1)
- [x] **PlanForm Options Library**: เพิ่มคลังตัวเลือก BasicOptions กลับมา (ซ่อน/แสดงได้) ใน Tab 3 (จุดประสงค์, สื่อ, แหล่ง, ชิ้นงาน) และ Tab 4 (วิธีการวัด, เครื่องมือประเมิน K/P/A)

### รอดำเนินการ ⏳
- [ ] **DB Migration**: ผู้ใช้ต้องรัน SQL เพิ่ม rubricK/P/A ใน Supabase Dashboard
- [ ] ทดสอบ Rubric บันทึก→กลับมาแก้ไข→ยังมีข้อมูล (หลัง DB migration)
- [ ] ทดสอบ Word export มี Rubric table จริงๆ (หลัง DB migration)

### Known Issues 🔴
- **rubricK, rubricP, rubricA columns ยังไม่มีใน Supabase** → Rubric จะไม่ถูกบันทึก จนกว่าจะ migrate DB

---

## 📝 CHANGELOG (ประวัติการเปลี่ยนแปลง)

### 2026-06-03 — Session โดย Antigravity (AI Agent 1)

#### 🎨 UI Changes
- **`app/plan/PlanForm.tsx`**: ปรับปรุงหน้ากรอกข้อมูล
  - Tab 1: ลบการแสดงผลระดับชั้นที่ซ้ำซ้อน และเปลี่ยน dropdown เมนูย่อย EFL ออก โดยให้ผู้ใช้งานค้นหาผ่านการเลือกหน่วย (Unit) แทน เพื่อความสะอาดตา
  - Tab 3: เพิ่มปุ่มคลังซ่อน/แสดง (Collapsible Library) กลับเข้ามาในส่วนของ: จุดประสงค์ K/P/A, สื่อการเรียนรู้, แหล่งเรียนรู้, ชิ้นงาน/ภาระงาน
  - Tab 4: เพิ่มปุ่มคลังซ่อน/แสดง กลับเข้ามาในส่วนของ: วิธีการวัดผล (method) และเครื่องมือประเมิน (tool) สำหรับด้าน K, P, A

### 2026-06-02 — Session โดย Antigravity (AI Agent 1)

#### 🔧 Bug Fixes
- **`app/api/plans/[id]/route.ts`**: ลบ fallback block ที่ลบ rubricK/P/A ออกจาก payload ก่อน update — นี่คือสาเหตุที่ Rubric หายหลังบันทึก
- **`app/api/plans/[id]/export/word/route.ts`**: Section 9.1 เปลี่ยนจาก `cleanSubContentWord()` → `renderRubricTableWord()` เพื่อให้แสดงตาราง Rubric 5 ระดับใน Word

#### 🎨 UI Changes  
- **`app/page.tsx`**: Redesign Dashboard ทั้งหมด
  - Hero section: gradient indigo/purple + hero illustration + mini-stats bar
  - 4 Stat cards: gradient สี (น้ำเงิน/เขียว/ทอง/ม่วง) แทน cards สีขาวเดิม
  - Plan list: เปลี่ยนจาก `<table>` → Card Grid (plan-cards-grid) แสดงข้อมูลครบ
  - Filter: search bar + 4 dropdowns (ระดับชั้น/วิชา/ภาคเรียน/สถานะ) + clear filter
  
#### 📁 New Files
- `public/hero-illustration.png`: รูปประกอบ Hero section
- `database/add_rubric_columns.js`: script เพิ่ม columns (ใช้ไม่ได้อัตโนมัติ)
- `database/check_rubric_columns.js`: script ตรวจสอบ columns

#### 🔒 Commits
```
3dd56d5  feat: premium dashboard v2 with hero illustration, gradient stat cards, plan card grid layout
6665856  fix: rubric columns in word export, remove rubric fallback delete bug, redesign dashboard UI
a555c8f  fix: reorder plan form tabs, separate rubrics into section 9.1 and number fields
```

---

## 🚦 NEXT TASKS — งานที่ควรทำต่อ

หากมีงานใหม่จาก user ให้เขียนที่นี่:

```
PRIORITY | TASK                                              | ASSIGNED TO | STATUS
---------|---------------------------------------------------|-------------|--------
HIGH     | ทดสอบ Rubric หลัง DB migration                   | —           | BLOCKED (รอ DB)
MEDIUM   | เพิ่ม feature อื่นๆ ตามที่ user ต้องการ          | —           | OPEN
LOW      | Refactor globals.css ให้ organize ดีขึ้น          | —           | OPEN
```

---

## 🛑 DO NOT TOUCH (ห้ามแก้ไขโดยไม่แจ้ง)

- `styles/globals.css` — Design system หลัก แก้แล้วกระทบทุกหน้า
- `app/api/plans/route.ts` — POST/GET plans API หลัก
- `lib/supabase.ts` — Supabase client configuration
- `app/layout.tsx` — Root layout + Global header

---

## 💬 MESSAGE QUEUE — ข้อความจาก AI ถึง AI

### [Antigravity → AI Agent 2] — 2026-06-02 21:28
```
สวัสดี AI ร่วมงาน 👋

สถานะปัจจุบัน:
- ระบบทำงานปกติที่ localhost:3000
- Bug หลัก 2 อย่างได้รับการแก้ไขแล้ว (rubric save + word export)
- DB ยังขาด rubricK/P/A columns — ต้องแจ้ง user ให้รัน SQL ก่อน
- Dashboard redesign เสร็จแล้ว (อาจต้องปรับอีกตาม feedback user)

หากคุณแก้ไขไฟล์ใด กรุณา:
1. อัปเดต CHANGELOG ด้านบน
2. อัปเดต CURRENT STATE
3. เพิ่มข้อความใน MESSAGE QUEUE

โชคดีในการทำงานครับ!
— Antigravity
```

---

*ไฟล์นี้อัปเดตโดย AI Agent อัตโนมัติ — อย่าลบหรือเปลี่ยนโครงสร้างหลัก*

## Update: AI Evaluator V3 (Partial Fix & UI Overhaul)
**Date**: 2024-06 (Current)
- **Framework Changes**: Added Tailwind CSS v4 support via PostCSS (`tailwindcss`, `@tailwindcss/postcss`) to support UI class rendering. Added `recharts` for Data Visualization.
- **AI Evaluator Page (`app/evaluator/page.tsx`)**: Completely redesigned to International Standards.
  - Implemented a clean List Layout for batch selecting plans.
  - Added Radar Chart using Recharts to visualize Plan Balance.
  - Added Modular Dashboard layout for Pros/Cons and Checklist breakdown.
- **Partial Auto-Fix Capabilities**:
  - Added a "✨ ให้ AI แก้จุดนี้" button for specific recommendations.
  - UI now supports chaining fixes sequentially by updating `originalPlanData` in state after a successful partial fix.
  - `app/api/ai-fix/route.ts` updated to accept `isPartial` flag. If true, it uses `partialFixPromptTemplate` to update ONLY the specific section.
  - Always creates a new `planId` draft in Supabase upon fixing to preserve the original.
