# SMART PLAN V3 ARCHITECTURE & SYSTEM AUDIT INVENTORY
**Wave V3.0 System Audit, Component Inventory & V3 Target Architecture**  
*Document Version: 3.0.0 | Date: 2026-09-28*

---

## 1. Executive Summary

ระบบ **Smart Plan V3** ได้รับการยกระดับจากเดิมที่เป็น "AI Lesson Plan Generator" (เครื่องมือช่วยร่างแผน 5 Tabs) สู่ **"PA-Ready Teaching Package Builder"** ที่รองรับการสร้างแผนการจัดการเรียนรู้ 1 ชั่วโมง (60 นาที) ควบคู่กับชุดสื่อการสอน (Worksheet, Activity Sheet, Teacher Guide, Assessment Tools) และเอกสารหลักฐานสำหรับประเมินวิทยฐานะตามเกณฑ์ วPA โดยยึดหลัก:

$$\text{Objective} \longrightarrow \text{Evidence} \longrightarrow \text{Activity} \longrightarrow \text{Assessment} \longrightarrow \text{Teaching Assets}$$

**นโยบายการพัฒนา (Non-Destructive Development):**
- ไม่ลบหรือแก้ไขโครงสร้างตารางเดิมในฐานข้อมูล Supabase (`LessonPlans`, `UnitPlans` ฯลฯ)
- ไม่แก้ไขพฤติกรรมของ Production Routes เดิม (`/plan`, `/plan/new`, `/plan/[id]`, `/dashboard`)
- ฟังก์ชัน V3 จะทำงานควบคู่ (Side-by-side) ภายใต้ Routing `/plan/v3/*` ผ่านการควบคุมด้วย Feature Flag `SMART_PLAN_V3`
- ข้อมูลแผนเดิมสามารถเปิดดูและแก้ไขได้เหมือนเดิม 100%

---

## 2. Current Architecture Inventory (ระบบปัจจุบัน)

### 2.1 Technology Stack
- **Framework:** Next.js 14.2.3 (App Router, Server Components + Client Components)
- **Database & Auth:** Supabase (PostgreSQL 15, Row Level Security, Auth via SSR Cookies)
- **Styling:** Tailwind CSS V4 + Vanilla CSS Modules (`styles/globals.css`)
- **AI Engine:** Google Gemini 2.5 Flash API (Server-side via `@/lib/geminiClient.ts` และ Key Pool)
- **Icons & UI:** Lucide React, Framer Motion, React Hot Toast
- **Export Engine:** Native HTML-to-Doc (.docx) generator with TH Sarabun New styling & CSS Paged Media A4 PDF Preview

---

### 2.2 Current Database Schema & Tables Inventory

| ตาราง (Table Name) | บทบาท / หน้าที่ | โครงสร้างหลัก (Key Columns) | สถานะใน V3 |
| :--- | :--- | :--- | :--- |
| **`LessonPlans`** | ตารางเก็บแผนการสอนหลัก (Legacy) | `planId` (PK VARCHAR), `user_id` (UUID), `planStatus`, `gradeLevel`, `subjectName`, `lessonTopic`, `essentialConcept`, `objectiveK/P/A`, `learningProcess`, `measureK/P/A`, `methodK/P/A`, `toolK/P/A`, `criteriaK/P/A`, `rubricK/P/A`, `resultK/P/A`, `problems`, `solutions` | **Maintain** (อ่าน/เขียนของเดิมได้ ไม่ลบ) |
| **`profiles`** | บัญชีและบทบาทผู้ใช้งาน | `id` (PK UUID), `email`, `full_name`, `role` (`teacher` / `admin`), `school_name` | **Reuse 100%** |
| **`UnitPlans`** | แผนการจัดการเรียนรู้รายหน่วย (V2) | `unitPlanId`, `user_id`, `unitPlanStatus`, `gradeLevel`, `subjectName`, `unitName`, `indicatorIds` (JSONB) | **Reuse & Link** |
| **`UnitLessons`** | แผนย่อยในหน่วย (Sequence) | `unitLessonId`, `unitPlanId`, `lessonPlanId`, `lessonOrder`, `lessonTitle`, `estimatedHours` | **Reuse & Link** |
| **`UnitAssessments`** | ผังการประเมินประจำหน่วย | `unitAssessmentId`, `unitPlanId`, `assessmentType`, `method`, `tool`, `criteria` | **Reuse Reference** |
| **`Rubrics`** | คลังรูบริกส่วนกลาง | `rubricId`, `user_id`, `ownerScope`, `rubricName`, `criteriaJson` (JSONB) | **Reuse** |
| **`evaluation_jobs`** | คิวงานตรวจคุณภาพแผน (วPA) | `id`, `lesson_plan_id`, `user_id`, `evaluation_mode`, `status`, `final_score`, `metadata` | **Reuse & Extend** |
| **`evaluation_results`**| ผลประเมินรายตัวชี้วัด (วPA 8 ด้าน)| `id`, `job_id`, `section`, `score`, `evidence_found`, `suggestions`, `issues` | **Reuse** |
| **`lesson_plan_issues`**| ประเด็นข้อผิดพลาดของแผน | `id`, `job_id`, `lesson_plan_id`, `severity`, `issue_type`, `title`, `description` | **Reuse** |
| **`ai_training_examples`**| คลังตัวอย่างแผนสำหรับ Prompt | `id`, `example_name`, `example_content` (JSONB), `is_active` | **Reuse Prompt Context** |
| **`ai_best_practices`**| ประวัติข้อผิดพลาดในอดีต (Memory)| `id`, `category`, `title`, `solution_pattern` | **Reuse Context** |

---

### 2.3 Current UI / Forms Inventory

1. **`PlanForm.tsx` (Legacy 5-Tabs):**
   - **Tab 1: ข้อมูลวิชาและรายคาบ** (กลุ่มสาระ, ระดับชั้น, รหัสวิชา, หน่วย, เรื่อง, จำนวนชั่วโมง)
   - **Tab 2: สาระสำคัญและตัวชี้วัด** (สาระสำคัญ, ตัวชี้วัดระหว่างทาง/ปลายทาง, สมรรถนะ, คุณลักษณะ)
   - **Tab 3: จุดประสงค์และเนื้อหา** (K/P/A, ทักษะศตวรรษที่ 21, สาระการเรียนรู้, สื่อ, แหล่งเรียนรู้, ชิ้นงาน)
   - **Tab 4: กระบวนการและการวัดผล** (Active Learning Steps, การวัดประเมินผล K/P/A, Rubrics 5 ระดับ)
   - **Tab 5: บันทึกหลังสอน** (ผลการสอน K/P/A, ปัญหา/อุปสรรค, ข้อเสนอแนะ/แนวทางแก้ไข)
2. **`app/plan/[id]/preview/page.tsx`:**
   - หน้ารองรับการแสดงผล A4 Layout เสมือนจริง ซูมเข้า-ออกได้ พิมพ์ออกเครื่องพิมพ์หรือบันทึกเป็น PDF ได้ทันที

---

### 2.4 Current API & AI Endpoints Inventory

- **Plan CRUD:**
  - `GET /api/plans` — รายการแผนการสอนทั้งหมดของผู้ใช้ (หรือของทุกคนกรณีเป็นแอดมิน)
  - `POST /api/plans` — บันทึกแผนการสอนใหม่ พร้อมตรวจสอบ Payload
  - `GET /api/plans/[id]` — ดึงข้อมูลแผนการสอน 1 รายการ
  - `PUT /api/plans/[id]` — อัปเดตแผนการสอน
  - `DELETE /api/plans/[id]` — ลบแผนการสอน
- **Master Data:**
  - `GET /api/initial-data` — ดึงข้อมูลวิชา, หน่วย, ตัวชี้วัด, และตัวเลือกพื้นฐาน (BasicOptions)
  - `GET /api/curriculum/...` — ข้อมูลตัวชี้วัดตามระดับชั้นและกลุ่มสาระ
- **Export Routes:**
  - `GET /api/plans/[id]/export/word` — ส่งออกเป็นไฟล์ Word (.doc / .docx) มีตาราง Rubric 5 ระดับ
  - `GET /api/plans/[id]/export/pdf` — ส่งออกไฟล์ PDF ผ่าน Supabase Storage
- **AI Endpoints (Gemini 2.5):**
  - `POST /api/ai` — Autofill แผนการสอนทั้งฉบับ
  - `POST /api/ai-process` — สร้างกระบวนการเรียนรู้ Active Learning
  - `POST /api/ai-completion-k` / `-p` / `-a` — เสนอจุดประสงค์และการวัดผลรายด้าน
  - `POST /api/ai-completion-reflection` — ช่วยสรุปบันทึกหลังสอน
  - `POST /api/ai-evaluate-pa8` / `POST /api/ai-evaluate-v4` — ประเมินตามเกณฑ์ วPA

---

## 3. Reusable vs. Legacy Components Analysis

| Component / Asset | หมวดหมู่ | แนวทางการจัดการใน V3 | เหตุผลทางสถาปัตยกรรม |
| :--- | :---: | :--- | :--- |
| `lib/subjectStandardsData.ts` | **Master Data** | **Reuse 100%** | ข้อมูลมาตรฐานและตัวชี้วัดของ สพฐ. สมบูรณ์อยู่แล้ว ห้ามให้ AI คิดเอง |
| `lib/geminiClient.ts` | **Infrastructure** | **Reuse 100%** | มีระบบ Retry, Fallback, Key Rotation และ Timeout Handling พร้อมใช้งาน |
| `utils/supabase/*` | **Auth & Database** | **Reuse 100%** | Middleware, Server/Client SSR Session รองรับการใช้งานอย่างปลอดภัย |
| `lib/activeLearningFramework.ts` | **Domain Logic** | **Reuse & Extend** | มีเทมเพลตกระบวนการเรียนรู้ 5 ขั้น, 2W3P, Inquiry-based นำมาแปลงเป็น 60-Min Timeline ได้ |
| `app/api/plans/[id]/export/word` | **Export Engine** | **Reuse Logic** | มีโค้ดจัดหน้า Sarabun New, 2 คอลัมน์ และตาราง Rubric ที่เสถียร |
| `app/plan/PlanForm.tsx` (5 Tabs) | **Legacy Form** | **Keep Legacy / Create V3 Separately** | ไม่แก้ไฟล์นี้โดยตรง เพื่อให้ครูที่คุ้นเคยกับฟอร์มเดิมใช้งานต่อได้โดยไม่มีสะดุด |
| Flat Columns (`measureK`, `toolK`) | **Legacy Schema** | **Adapter Pattern** | ใน V3 จะใช้ Relational Entities แต่จะมี Data Adapter แปลงกลับลง Flat Columns เพื่อความเข้ากันได้ |

---

## 4. Technical Debt & Identified Risks

1. **Flat Schema Limitation:** ตาราง `LessonPlans` เดิมเก็บ `objectiveK`, `measureK`, `rubricK` เป็น Text ก้อนเดียว ทำให้ยากต่อการ cross-reference แบบ 1:1 ระหว่าง Objective $\leftrightarrow$ Evidence $\leftrightarrow$ Assessment
2. **AI Free-form Output Risk:** Endpoint AI เดิมบางตัวคืนค่าเป็นข้อความ Markdown แบบยาว เสี่ยงต่อการ Parse ผิดพลาดในบางจังหวะ
3. **Time Calculation Integrity:** ระบบเดิมให้ครูกรอกจำนวนชั่วโมง แต่ไม่ได้บังคับคำนวณเวลากิจกรรมย่อย (เช่น 5 + 15 + 25 + 10 + 5 = 60 นาที) แบบเรียลไทม์
4. **Single-Lesson Packaging Gap:** ขาดการจัดชุดเอกสารคู่ขนาน (Teacher Package vs Student Package) เช่น ใบงานไม่มี Answer Key แยกชุด

---

## 5. V3 Architecture & Migration Strategy

### 5.1 The 7-Step Workflow Architecture (V3 UI)
```text
Step 1: Setup (กลุ่มสาระ, ระดับชั้น, วิชา, หน่วย, เรื่อง, ความยาว 60 นาที)
   ↓
Step 2: Learning Goals (ตัวชี้วัดจริง สพฐ. → 2-3 Objectives → Observable Evidence)
   ↓
Step 3: Learning Design (Lesson Blueprint 60 นาที: Warm-up, Learn, Practice, Production, Wrap-up)
   ↓
Step 4: Assessment Engine (Objective → Evidence → Method → Tool → Observable Rubric Criteria)
   ↓
Step 5: Teaching Package (Worksheet, Task Card, Teacher Guide, Answer Key)
   ↓
Step 6: Quality Review (Layer 1 Rule Engine ตรวจความครบถ้วน + Layer 2 AI Qualitative Review)
   ↓
Step 7: Documents & Export (Unified Document Model → A4 Print Preview / Word / PDF Export)
   ↓
[Post-Teaching Workflow]: Mark as Taught → บันทึกผลจริงตามสภาพจริง → Student Evidence
```

### 5.2 Additive Data Model (Target V3 Schema via Migration 15+)
ใน Wave V3.1 จะสร้างตารางเสริมแบบ 1:N (ไม่ลบและไม่แก้ `LessonPlans`):
- `v3_lesson_objectives` (`id`, `plan_id`, `code`, `statement`, `type`, `observable_behavior`)
- `v3_learning_evidence` (`id`, `objective_id`, `evidence_type`, `description`)
- `v3_lesson_activities` (`id`, `plan_id`, `phase`, `minutes`, `teacher_action`, `student_action`, `linked_objective_ids`)
- `v3_assessments` (`id`, `evidence_id`, `method`, `tool_type`, `criteria_type`, `rubric_id`)
- `v3_teaching_assets` (`id`, `plan_id`, `asset_type`, `title`, `content_json`, `target_audience`)
- `v3_post_teaching_records` (`id`, `plan_id`, `students_total`, `students_passed`, `reflection`)

### 5.3 Compatibility & Backward Compatibility Layer
- แผนการสอนเดิมที่เปิดใน V3 จะถูกอ่านผ่าน **Legacy Adapter** เพื่อจำลองโครงสร้าง V3 ในโหมดอ่าน
- แผนที่สร้างใน V3 สามารถซิงก์สรุปผลกลับลงตาราง `LessonPlans` ได้ ทำให้หน้า Dashboard เดิมและ Export เดิมยังทำงานได้

---

## 6. Dependency & Routing Map

```
/ (Landing Page)
├── /dashboard (Dashboard เดิม - แสดงรายการแผน)
├── /plan
│   ├── /new (Legacy 5-Tab Form)
│   ├── /[id] (Legacy Edit Form)
│   └── /[id]/preview (Legacy Preview)
└── /plan/v3 [NEW V3 ROUTE]
    ├── page.tsx (V3 Hub & Overview)
    ├── /new (7-Step Teaching Package Creator Shell)
    └── /[id] (V3 Teaching Package Editor View)
```

---

## 7. Acceptance Verification for Wave V3.0

- [x] ตรวจสอบ Inventory ระบบเดิมครบถ้วน (Schema, APIs, Form, AI Endpoints, Export, Preview, Auth)
- [x] สร้าง Feature Flag `lib/featureFlags.ts` ควบคุม `SMART_PLAN_V3`
- [x] สร้าง Routes ใหม่ของ V3: `/plan/v3`, `/plan/v3/new`, `/plan/v3/[id]` โดยไม่กระทบ Route เดิม
- [x] สร้างเอกสาร `docs/SMART_PLAN_V3_ARCHITECTURE.md`
- [x] ตรวจสอบความถูกต้องของ TypeScript, Build, และ Lint

---

## 8. V3.1 Actual Database Model

ใน Wave V3.1 ระบบได้สร้าง Schema ใหม่ที่รองรับ Domain Graph:
$$\text{Objective} \xleftrightarrow{\text{M:N}} \text{Evidence} \xleftrightarrow{\text{M:N}} \text{Assessment}$$
และ
$$\text{Activity} \xleftrightarrow{\text{M:N}} \text{Objective} \quad \text{and} \quad \text{Activity} \xleftrightarrow{\text{M:N}} \text{Evidence}$$

### 8.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    v3_lesson_plans ||--o{ v3_lesson_objectives : "has"
    v3_lesson_plans ||--o{ v3_learning_evidence : "has"
    v3_lesson_plans ||--o{ v3_lesson_activities : "has"
    v3_lesson_plans ||--o{ v3_assessments : "has"
    v3_lesson_plans ||--o{ v3_teaching_assets : "has"
    v3_lesson_plans ||--o{ v3_plan_reviews : "has"
    v3_lesson_plans ||--o{ v3_plan_versions : "has"
    v3_lesson_plans ||--o| v3_post_teaching_records : "has"

    v3_lesson_objectives ||--o{ v3_objective_evidence_links : "links"
    v3_learning_evidence ||--o{ v3_objective_evidence_links : "links"

    v3_lesson_activities ||--o{ v3_activity_objective_links : "links"
    v3_lesson_objectives ||--o{ v3_activity_objective_links : "links"

    v3_lesson_activities ||--o{ v3_activity_evidence_links : "links"
    v3_learning_evidence ||--o{ v3_activity_evidence_links : "links"

    v3_assessments ||--o{ v3_assessment_evidence_links : "links"
    v3_learning_evidence ||--o{ v3_assessment_evidence_links : "links"

    v3_assessments ||--o{ v3_assessment_tools : "specifies"

    v3_teaching_assets ||--o{ v3_asset_objective_links : "links"
    v3_lesson_objectives ||--o{ v3_asset_objective_links : "links"

    v3_teaching_assets ||--o{ v3_asset_activity_links : "links"
    v3_lesson_activities ||--o{ v3_asset_activity_links : "links"

    v3_teaching_assets ||--o{ v3_asset_evidence_links : "links"
    v3_learning_evidence ||--o{ v3_asset_evidence_links : "links"

    v3_lesson_plans {
        uuid id PK
        uuid user_id FK
        text title
        text topic
        text course_code
        text course_name
        text subject_key
        text grade_level
        int duration_minutes
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    v3_lesson_objectives {
        uuid id PK
        uuid lesson_plan_id FK
        int position
        text statement
        text objective_type
        text observable_behavior
        text source
    }

    v3_learning_evidence {
        uuid id PK
        uuid lesson_plan_id FK
        int position
        text evidence_type
        text description
        text source
    }

    v3_lesson_activities {
        uuid id PK
        uuid lesson_plan_id FK
        int position
        text phase
        int minutes
        text teacher_actions
        text student_actions
        text source
    }

    v3_assessments {
        uuid id PK
        uuid lesson_plan_id FK
        int position
        text name
        text assessment_type
        text method
        text criteria_type
        numeric criteria_value
        text criteria_text
        boolean formative
    }

    v3_assessment_tools {
        uuid id PK
        uuid assessment_id FK
        text tool_type
        text title
        jsonb content
    }
```

### 8.2 Isolation & Non-Destructive Invariants
1. **Isolated Namespace**: ทุกตารางใช้ prefix `v3_` โดยไม่ไปแตะต้อง `LessonPlans`, `UnitPlans`, `Rubrics`
2. **Cascade Behavior**: เมื่อลบ Objective จะลบเฉพาะ junction link `v3_objective_evidence_links` ไม่ลบ Evidence ที่แชร์กับ Objective อื่น
3. **Owner-Only RLS**: ทุก child table ตรวจสิทธิ์ผ่าน `v3_lesson_plans.user_id = auth.uid()` ป้องกันการเข้าถึงข้ามบัญชี 100%

---

## 9. WAVE V3.2 — Curriculum Engine & Subject Profile Engine

*Added: 2026-09-28 | AI CALLS: 0*

### 9.1 Design Goals

Wave V3.2 แยก 2 เรื่องออกจากกันชัดเจน:

| Engine | ตอบคำถาม | Source |
| :--- | :--- | :--- |
| **Curriculum Engine** | หลักสูตรอะไร / วิชาอะไร / ชั้นไหน / มาตรฐาน/ตัวชี้วัดใด | Static Master Data (`subjectStandardsData.ts`) ผ่าน Adapter |
| **Subject Profile Engine** | วิชานี้ควรออกแบบการเรียนรู้แบบใด / หลักฐานแบบใด / ประเมินอย่างไร | Deterministic TypeScript Configuration (ไม่มี AI) |

### 9.2 Module Structure

```text
lib/smartPlanV3/
├── curriculum/
│   ├── types.ts              — CurriculumProvider interface + data shapes
│   ├── legacyDataAdapter.ts  — implements CurriculumProvider from subjectStandardsData.ts
│   ├── provider.ts           — singleton + cached index (Subject → Grade → Standards → Indicators)
│   └── index.ts              — public exports
│
└── subjectProfiles/
    ├── types.ts              — SubjectProfile, LearningFocusConfig, RecommendationTier
    ├── english.ts
    ├── thai.ts
    ├── mathematics.ts
    ├── science.ts
    ├── socialStudies.ts
    ├── health.ts
    ├── physicalEducation.ts
    ├── art.ts
    ├── career.ts
    ├── registry.ts           — PROFILE_REGISTRY + helper functions + validateAllProfiles()
    └── index.ts
```

### 9.3 Curriculum Data Coverage

| ข้อมูล | ปัจจุบัน |
| :--- | :--- |
| Curriculum Version | OBEC-2551-REV60 (หลักสูตร 2551 ปรับปรุง 2560) |
| Subject-Grade entries | 84 |
| Standards (`{ code: }`) | ~489 |
| Indicators groups | ~84+ |
| Missing | มัธยมปลาย (ม.4–6) ไม่สมบูรณ์บางวิชา |

### 9.4 Subject Profiles Implemented

| Profile Key | วิชา | Learning Focuses |
| :--- | :--- | :--- |
| `ENGLISH` | ภาษาต่างประเทศ | SPEAKING, LISTENING, READING, WRITING, LANGUAGE_USE, INTEGRATED |
| `THAI` | ภาษาไทย | READING, WRITING, LISTENING_VIEWING, SPEAKING, LANGUAGE, LITERATURE |
| `MATHEMATICS` | คณิตศาสตร์ | CALCULATION, PROBLEM_SOLVING, CONCEPT, REASONING, MATHEMATICAL_COMMUNICATION |
| `SCIENCE` | วิทยาศาสตร์ | CONCEPT, INQUIRY, EXPERIMENT, DATA_ANALYSIS, SCIENTIFIC_EXPLANATION, ENGINEERING_DESIGN |
| `SOCIAL_STUDIES` | สังคมศึกษาฯ | HISTORY, RELIGION_ETHICS, CIVICS, ECONOMICS, GEOGRAPHY |
| `HEALTH` | สุขศึกษา | HEALTH_KNOWLEDGE, DECISION_MAKING, LIFE_SKILLS, HEALTH_BEHAVIOR |
| `PHYSICAL_EDUCATION` | พลศึกษา | MOVEMENT_SKILL, SPORT_SKILL, PHYSICAL_FITNESS, TEAM_PLAY |
| `ART` | ศิลปะ | VISUAL_ART, MUSIC, PERFORMING_ARTS |
| `CAREER` | การงานอาชีพ | WORK_PROCESS, PRACTICAL_SKILL, DESIGN_MAKING, CAREER_EXPLORATION |

### 9.5 Recommendation Flow

```mermaid
graph TD
    A[Curriculum Master Data\nsubjectStandardsData.ts] -->|LegacyCurriculumAdapter| B[CurriculumProvider Interface]
    B --> C[Subject]
    C --> D[Grade Level]
    D --> E[Standards]
    E --> F[Indicators]

    G[SubjectProfileRegistry] --> H{getSubjectProfile\nsubjectKey}
    H --> I[SubjectProfile]
    I --> J{Learning Focus\nSPEAKING / EXPERIMENT / etc.}
    J --> K[Evidence Recommendation\npreferred / supported / notRecommended]
    J --> L[Assessment Recommendation\npreferred / supported / notRecommended]
    J --> M[Asset Recommendation\npreferred / supported / notRecommended]
    J --> N[Objective Guidance\nobservable verbs]

    F --> O[v3_lesson_plans\nsubject_key + curriculum_version]
    I --> O
```

### 9.6 API Routes (Read-Only)

```text
GET /api/plan/v3/curriculum/versions
GET /api/plan/v3/curriculum/subjects?curriculumVersion=...
GET /api/plan/v3/curriculum/standards?subject=...&grade=...
GET /api/plan/v3/curriculum/indicators?subject=...&grade=...&standard=...

GET /api/plan/v3/subject-profiles
GET /api/plan/v3/subject-profiles/[key]?focus=SPEAKING
```

### 9.7 Deterministic Rule Examples

| Subject + Focus | Evidence (preferred) | Assessment (preferred) | Anti-pattern |
| :--- | :--- | :--- | :--- |
| English + SPEAKING | SPEAKING, PERFORMANCE | PERFORMANCE_RUBRIC, OBSERVATION | ANSWER_KEY เป็น primary |
| Math + CALCULATION | WORKSHEET, QUIZ | ANSWER_KEY, SCORING_GUIDE | PERFORMANCE_RUBRIC |
| Math + PROBLEM_SOLVING | WRITTEN_SOLUTION, PROBLEM_SET | SCORING_GUIDE, ANALYTIC_RUBRIC | SIMPLE_ANSWER_KEY |
| Science + EXPERIMENT | EXPERIMENT, OBSERVATION, DATA_TABLE | CHECKLIST, RUBRIC | ANSWER_KEY |
| PE + SPORT_SKILL | PERFORMANCE, OBSERVATION | PERFORMANCE_RUBRIC, CHECKLIST | WRITTEN_EXAM |
| Social Studies + HISTORY | HISTORICAL_INQUIRY_REPORT, TIMELINE | ANALYTIC_RUBRIC | ROTE_MEMORIZATION |
| Social Studies + RELIGION_ETHICS | CASE_STUDY_REFLECTION, BEHAVIORAL_OBSERVATION | BEHAVIORAL_CHECKLIST | HISTORICAL_TIMELINE |

---

## 10. Wave V3.4 — 60-Minute Lesson Blueprint & Activity Engine

### 10.1 Core Architecture & Principle
Smart Plan V3 แปลงจากระบบเดิมที่สั่ง AI เขียนความเรียงยาวๆ มาเป็นระบบ **Structured Lesson Blueprint & Activity Engine** ที่รับประกันความสอดคล้องตามลำดับชั้น:

```text
Curriculum → Indicators → Subject Profile → Learning Focus → Objectives → Evidence → Activity Nodes
```

```mermaid
graph TD
    A[Lesson Context\nIndicators, Objectives, Evidence] --> B[Subject Profile Guidance\nPatterns & Avoid Rules]
    B --> C[Blueprint AI Prompt\nSystem + Context + Output Contract]
    C --> D[Structured JSON\n4-7 Activity Nodes = 60 Min]
    D --> E[Schema Validation\nNon-empty actions, valid refs]
    E --> F[Rule Validation\nDuration, Objective & Evidence coverage]
    F --> G[Teacher Preview\nReview, Edit, Normalize time]
    G --> H[Apply to Database]
    H --> I[v3_lesson_activities]
    I --> J[v3_activity_objective_links\nv3_activity_evidence_links]
```

### 10.2 Privacy & Data Minimization
- ห้ามส่งข้อมูลครู (user UUID, email) หรือข้อมูลนักเรียนไปยัง Gemini API
- ใช้ Temporary Token Mapping (เช่น `O1`, `O2`... สำหรับ Objectives และ `E1`, `E2`... สำหรับ Evidence) ในระหว่างเรียก AI
- ฝั่ง Server แปลง Tokens กลับเป็น Database UUID จริงอย่างปลอดภัย พร้อมตัด/ตรวจจับ Hallucinated References (เช่น `O99`)

### 10.3 Extensible Phase Model
รองรับเฟสกิจกรรมที่ยืดหยุ่นตามธรรมชาติวิชา:
`ENGAGE`, `EXPLORE`, `LEARN`, `MODEL`, `PRACTICE`, `APPLY`, `PERFORM`, `DISCUSS`, `INVESTIGATE`, `CREATE`, `ASSESS`, `REFLECT`, `SUMMARIZE`, `OTHER`

### 10.4 Deterministic Time & Rule Engine
- **Time Engine:** คำนวณ `sum(minutes)` เทียบกับเวลาคาบ (เช่น 60 นาที) พร้อมฟังก์ชัน `suggestTimeNormalization` ที่เสนอการปรับเวลาในกิจกรรมหลักโดยไม่ต้องเรียก AI ซ้ำ
- **Coverage Rules:** ตรวจสอบว่าทุก Objective ถูกครอบคลุมด้วยกิจกรรมอย่างน้อย 1 กิจกรรม และหลักฐานสำคัญถูกฝึกหรือสังเกต
- **Workflow Status Derivation:** ยกระดับสถานะแผนเป็น `BLUEPRINT_READY` อัตโนมัติเมื่อครบ 60/60 นาที กิจกรรม > 0 และครอบคลุมทุกจุดประสงค์ หากครูลดเวลาหรือลบกิจกรรมจะ Downgrade กลับเป็น `DRAFT` อย่างแม่นยำ

### 10.5 Activity CRUD & Partial Regeneration
- รองรับการสร้าง Manual, แก้ไข (PATCH), ลบ (DELETE), และสลับตำแหน่ง (Reorder Up/Down)
- รองรับ **Partial Regeneration:** ร้องขอแนวทางกิจกรรมใหม่เฉพาะจุด (1 กิจกรรม) โดยส่งบริบทกิจกรรมก่อนหน้าและถัดไป เพื่อให้ครูเลือกเปรียบเทียบก่อน Apply โดยไม่รื้อกิจกรรมทั้งคาบ
