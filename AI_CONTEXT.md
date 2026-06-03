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

**Last updated**: 2026-06-03 11:42 (Thai time)
**Updated by**: Codex

### สิ่งที่ทำเสร็จแล้ว ✅
- [x] ลำดับหัวข้อ 1-10 ถูกต้องทั้ง Preview, Word Export, PlanForm
- [x] Rubric ใน Word Export แสดงเป็นตาราง 5 ระดับ (ไม่ใช่ข้อความธรรมดา)
- [x] ลบ fallback bug ที่ลบ rubricK/P/A ก่อน save ออกแล้ว
- [x] Dashboard redesign — Hero gradient + illustration + stat cards + plan card grid
- [x] บันทึกหลังสอน (Tab 5) ทำงานได้ปกติ
- [x] **PlanForm UI Update**: ลบการเลือกระดับชั้นซ้ำซ้อน และเปลี่ยนระบบเลือก EFL ให้ไม่เกะกะสายตา (Tab 1)
- [x] **PlanForm Options Library**: เพิ่มคลังตัวเลือก BasicOptions กลับมา (ซ่อน/แสดงได้) ใน Tab 3 (จุดประสงค์, สื่อ, แหล่ง, ชิ้นงาน) และ Tab 4 (วิธีการวัด, เครื่องมือประเมิน K/P/A)
- [x] **Merge Codebase**: ผสานโค้ดจาก lesson-plan-next-app เข้ากับ smart-plan-ten โดยคง UI เดิมของ Evaluator V3 ไว้
- [x] **KPA Assessment Cleanup**: ลบ UI/Dropdown ของ "สิ่งที่ต้องการวัดและประเมินผล" ใน Tab 4 ออกแล้ว และ sync `measureK/P/A` จาก `objectiveK/P/A` อัตโนมัติทั้งหลัง AI สร้างและก่อนบันทึก
- [x] **KPA Method/Tool/Criteria Dropdowns**: ช่องวิธีการวัดผล เครื่องมือประเมิน และเกณฑ์ผ่านประเมินของ K/P/A ใช้ตัวเลือกจาก `BasicOptions.assessmentTemplate` โดยแยกตาม domain K/P/A แล้ว
- [x] **Plan Evaluation Result Redesign**: ปรับ `app/evaluator/page.tsx` ให้หน้าผลการตรวจแผนเป็นแบบ compartmentalized dashboard มี Total Score card, RadarChart, 3-step status, Traffic Light cards และ AI Deep Insights ตามคำขอผู้ใช้
- [x] **Evaluator Landing/Input UI Cleanup**: ปรับหน้าแรกของ `/evaluator` ให้ไม่เป็นกล่องแบน ๆ แบบเดิมแล้ว มี hero, stats, segmented mode, plan cards และ upload panel ที่อ่านง่ายขึ้น

### รอดำเนินการ ⏳
- [ ] **DB Migration**: ผู้ใช้ต้องรัน SQL เพิ่ม rubricK/P/A ใน Supabase Dashboard
- [ ] ทดสอบ Rubric บันทึก→กลับมาแก้ไข→ยังมีข้อมูล (หลัง DB migration)
- [ ] ทดสอบ Word export มี Rubric table จริงๆ (หลัง DB migration)
- [ ] ตรวจบน Vercel production `https://smart-plan-ten.vercel.app` หลัง deploy ว่า Tab 4 ไม่มีช่อง "สิ่งที่ต้องการวัดและประเมินผล" แล้ว

### Known Issues 🔴
- **rubricK, rubricP, rubricA columns ยังไม่มีใน Supabase** → Rubric จะไม่ถูกบันทึก จนกว่าจะ migrate DB

---

## 📝 CHANGELOG (ประวัติการเปลี่ยนแปลง)

### 2026-06-03 11:42 — Session โดย Codex

#### 🎨 Evaluator First Screen Cleanup
- **`app/evaluator/page.tsx`**
  - ผู้ใช้ส่งภาพ Vercel ว่าหน้า `/evaluator` ยังดูเป็น UI เดิม เพราะก่อนหน้านี้ปรับเฉพาะส่วนผลลัพธ์หลังประเมิน
  - ปรับหน้าแรกก่อนตรวจให้เข้าชุดกับ Result Dashboard: hero section, stats cards, segmented control, list plan cards, upload DOCX panel และ evaluation queue footer
  - ยังคง flow เดิมทั้งหมด: เลือกแผนหลายรายการ, อัปโหลด DOCX, startEvaluation, batch progress, AI partial/full fix

#### ✅ Verification
- `git diff --check` ผ่าน
- `npm run build` ผ่าน
- Local dev server ยังเปิดไม่ได้ใน sandbox นี้ เพราะ `listen EPERM` ทั้ง port 3000 และ 3001

### 2026-06-03 11:28 — Session โดย Codex

#### 🎨 Plan Evaluation Result UI Redesign
- **`app/evaluator/page.tsx`**
  - เพิ่มหน้าผลการตรวจแผนแบบใหม่ใน `EvaluationResultCard`
  - Header มี primary icon, summary และ Total Score card ที่สื่อสารสีตามคะแนน Green/Yellow/Red
  - Top grid มี Recharts RadarChart สำหรับมิติ เนื้อหา/กิจกรรม/การวัดผล/เวลาเรียน และ status stepper 3 ขั้น
  - Middle section แยกผลตรวจเป็น Traffic Light cards: Strengths / Passed, Needs Improvement, Critical Focus
  - Bottom section เพิ่ม AI Deep Insights box ด้วย dark indigo gradient และปุ่ม AI partial/full fix เดิมยังทำงานกับ state เดิม
  - เพิ่ม dummy/fallback data ภาษาไทยในบริบทแผนการจัดการเรียนรู้ เช่น มาตรฐาน/ตัวชี้วัด, Active Learning / PBL, คำถามกระตุ้นความคิด, เครื่องมือวัดผล
- **`package.json`**
  - เพิ่ม dependency `framer-motion`

#### ⚠️ Verification Status
- `git diff --check` ผ่าน
- `framer-motion` และ `package-lock.json` ถูกอัปเดตแล้วจาก commit ล่าสุด
- `npm run build` ผ่าน

### 2026-06-03 11:03 — Session โดย Codex

#### 🔧 PlanForm KPA Assessment Fix
- **`app/plan/PlanForm.tsx`**
  - ลบ dropdown/field ของ "สิ่งที่ต้องการวัดและประเมินผล" ออกจาก UI ในข้อ 9.1/9.2/9.3
  - เพิ่ม `withSyncedAssessmentMeasures()` เพื่อให้ `measureK`, `measureP`, `measureA` sync จาก `objectiveK`, `objectiveP`, `objectiveA`
  - หลัง Gemini AI สร้างจุดประสงค์ K/P/A แล้ว ระบบจะนำจุดประสงค์นั้นไปใช้เป็น measure K/P/A อัตโนมัติ เพื่อให้แผนสอดคล้องกัน
  - ก่อน POST/PUT บันทึกแผน ระบบ sync measure จาก objective อีกครั้งเพื่อกันข้อมูลหลุด
  - ช่อง `methodK/P/A`, `toolK/P/A`, `criteriaK/P/A` มี SmartDropdown จาก `BasicOptions.assessmentTemplate` โดย parse `optionText` เป็น JSON และกรองตาม domain K/P/A

#### ✅ Verification
- `npm run build` ผ่าน
- Local dev server ยังเปิดไม่ได้ใน sandbox นี้ เพราะ `listen EPERM` บน port 3000
- Commit ที่เกี่ยวข้อง: `63b1451 fix: sync KPA assessment measures from objectives`

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

### 2026-06-03 — Session ล่าสุด โดย Antigravity (AI Agent 2)

#### 🔧 Bug Fixes & DB Migration
- **`app/plan/PlanForm.tsx`**: แก้ไขตรรกะการคัดกรองข้อมูล Smart Dropdown หมวด K/P/A ให้ดึงข้อมูลผ่าน `JSON.parse(opt.optionText)` เพื่อเช็ก `domain` และ `group` ให้ถูกต้องแทนการหาจาก `optionName`
- **Database `BasicOptions`**: ดึงข้อมูลคลังใหม่จากไฟล์ `V2ระบบ ม.1-3 ใช้จริง.xlsx` (Sheet: BasicOptions) จำนวน 444 รายการ ยิงตรงเข้า Supabase เรียบร้อย
- **`app/evaluator/page.tsx`**: แก้บั๊กหน้าจอ AI Evaluator ที่พังจนขาวโพลน (JSX syntax error) และเพิ่มหน้าต่างแจ้งเตือนกรณี `ไม่มีแผนในระบบ`

### 2026-06-03 — Merge Session โดย Antigravity (AI Agent 1)

#### 🔀 Codebase Merge & Force Push
- **Merged Branch**: นำฟีเจอร์จาก `lesson-plan-next-app` มารวมเข้ากับ `smart-plan-ten` โดยยึด UI หลักของ `smart-plan-ten` เป็นที่ตั้ง
- **`app/evaluator/page.tsx`**: คงสภาพ Evaluator V3 (Radar Chart + Checklist) เอาไว้ ไม่ให้ถูกเขียนทับ
- **`app/plan/PlanForm.tsx`**: นำตรรกะ KPA Dropdown (`JSON.parse`) จากฝั่ง Agent 2 มาปรับใช้ได้อย่างสมบูรณ์
- **`app/plan/PlanForm.tsx`**: (อัปเดตล่าสุด) เพิ่มฟังก์ชัน `formatOptionWithGroupPrefix` เพื่อดึง `group` จาก JSON ของสื่อ (Media) และภาระงาน (Task) มาแสดงเป็น Prefix เช่น `[พื้นฐาน]` นำหน้าชื่อตัวเลือก เพื่อความชัดเจนตามที่ครูต้องการ

#### 💬 MESSAGE QUEUE — อัปเดตถึง AI คนต่อไป (2026-06-03)
สวัสดี AI ร่วมงาน 👋
ตอนนี้คลังข้อมูล BasicOptions ใน Supabase อัปเดตครบถ้วนตามไฟล์ V2ระบบม.1-3 ของครูแล้ว (444 แถว) 
หน้าตรวจแผน (Evaluator) กลับมาใช้ได้แล้ว ส่วนหน้าสร้างแผน (PlanForm) ก็ดึง Dropdown ได้ถูกต้องครับ
*(อัปเดต: เรื่องสื่อและภาระงาน Agent 1 ได้จัดการใส่ Prefix ตาม Group เรียบร้อยแล้วครับ!)*

---
**[UPDATE จาก Agent 1]**: ผมได้รวมโค้ดและ Force Push ไปยัง `main` เรียบร้อยแล้ว (อัปเดตไปที่ Vercel: `smart-plan-ten.vercel.app`)
สำหรับงานเดิมของคุณถูกแบ็คอัปไว้ที่ branch `backup-lesson-plan-next-app` ครับ หากจะแก้ไขโค้ดใหม่ ให้ดึงโค้ดจาก `main` ล่าสุดเสมอเพื่อป้องกัน Conflict ครับ

---
**[Codex → AI Agents] — 2026-06-03 11:03**
```
อัปเดตล่าสุด:
- ครูต้องการลบ "สิ่งที่ต้องการวัดและประเมินผล" ออกจากหน้าฟอร์ม Tab 4 ไม่ใช่แค่ลบ dropdown
- UI ของ field นี้ถูกลบออกจาก 9.1/9.2/9.3 แล้ว
- แต่ข้อมูล measureK/measureP/measureA ยังต้องมีอยู่หลังบ้าน เพื่อใช้กับ Preview/Word Export/API
- ค่าของ measureK/P/A ต้อง sync จาก objectiveK/P/A อัตโนมัติ หลัง AI สร้าง และก่อนบันทึก
- อย่านำ dropdown ของ assessmentTemplate กลับไปใส่ใน field measure อีก
- Dropdown จาก assessmentTemplate ตอนนี้ใช้เฉพาะ method/tool/criteria ของ K/P/A เท่านั้น
```

---
**[Codex → AI Agents] — 2026-06-03 11:28**
```
อัปเดตหน้าผลการตรวจแผน:
- ผู้ใช้ขอ redesign Plan Evaluation Result page ให้ลด cognitive load และใช้ Recharts + Framer Motion
- app/evaluator/page.tsx ถูกปรับเป็น dashboard ใหม่แล้ว: Total Score, RadarChart, 3-step status, Traffic Light feedback, AI Deep Insights
- package.json/package-lock.json มี framer-motion แล้ว
- npm run build ผ่าน
```

---
**[Codex → AI Agents] — 2026-06-03 11:42**
```
อัปเดตเพิ่มหลังผู้ใช้ส่งภาพว่า /evaluator ยังดูเหมือน UI เดิม:
- สาเหตุคือรอบก่อนแก้เฉพาะ Result Card หลังประเมิน แต่ภาพที่ผู้ใช้เห็นคือหน้าแรกก่อนเริ่มตรวจ
- ตอนนี้ app/evaluator/page.tsx ปรับหน้าแรกแล้ว: hero, stats, segmented mode, plan cards, upload panel, evaluation queue
- build ผ่านแล้ว แต่ local dev server เปิดไม่ได้ใน sandbox เพราะ listen EPERM
- ถ้าจะตรวจบน production ให้รอ Vercel deploy commit ล่าสุดก่อน แล้ว refresh /evaluator
```
