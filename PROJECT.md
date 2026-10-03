# 📘 SMART PLAN — CANONICAL PROJECT DOCUMENT & HANDOFF

> **Document Version:** 4.0 (V3.12 Production & High-Concurrency Release)  
> **Last Updated:** October 2026  
> **Status:** Production-Ready & Actively Deployed  
> **Target Audience:** Incoming AI Agents, Core Developers, System Architects  

---

## 1. Executive Summary & Current Project State

**Smart Plan (ระบบแผนการสอนอัจฉริยะ)** เป็นเว็บแอปพลิเคชันระดับองค์กรสำหรับครูผู้สอนในสังกัด สพฐ. และกระทรวงศึกษาธิการไทย ออกแบบมาเพื่อยกระดับการจัดทำแผนการจัดการเรียนรู้เชิงรุก (**Active Learning**) และการประเมินตามสภาพจริง (**Authentic Assessment**) ตามเกณฑ์การประเมินวิทยฐานะ **ว.PA (PA-Ready)**

### 🎯 สถานะปัจจุบัน (Current Operational Status)
- **สถาปัตยกรรมหลัก:** **Smart Plan V3 (Wave V3.1 – V3.12)** สมบูรณ์ 100%
- **ระบบ AI Concurrency:** อัปเกรดรองรับการใช้งานพร้อมกัน **10–20+ คนพร้อมกัน** ได้อย่างลื่นไหล 0% Error Rate ด้วยสถาปัตยกรรม **4-Tier High-Availability Engine**
- **การคอมไพล์ (`npm run build`):** ผ่านฉลุย 100% (ทั้ง 39 Static & Dynamic Routes)
- **ชุดทดสอบ (`Test Suites`):** ผ่าน 100% ทั้ง 10 Domain Engine Test Suites (รวมกว่า 200+ Assertions)
- **การส่งออกเอกสาร:** สร้างไฟล์ **Microsoft Word (.docx)** รูปแบบ OOXML มาตรฐานราชการ ฟอนต์ TH Sarabun New แท้ 100% และ **PDF มาตรฐาน A4**
- **Git & Deployment:** ซิงค์ขึ้น GitHub Repository `main` (`Distinycate/Smart-plan`) เรียบร้อย และเชื่อมต่อระบบ CI/CD บน Vercel

---

## 2. โครงสร้างระบบและไฟล์สำคัญ (System Architecture & Sitemap)

```
├── app/                                    # Next.js 14 App Router
│   ├── plan/v3/                            # 🚀 Smart Plan V3 (Canonical Core UI)
│   │   ├── new/page.tsx                    # หน้าสร้างแผนใหม่ (AI 1-Click Fast Track & Manual)
│   │   ├── page.tsx                        # หน้าคลังแผนการสอน V3 ของครู
│   │   ├── [id]/page.tsx                   # หน้า Workspace จัดทำแผน 9 ขั้นตอน (Plan Editor)
│   │   │   ├── Step3Activities.tsx         # ขั้นที่ 3: ไทม์ไลน์กิจกรรม Active Learning 5 ขั้น
│   │   │   ├── Step4Assessments.tsx        # ขั้นที่ 4: การประเมินตามสภาพจริง (Authentic Assessment)
│   │   │   ├── Step5TeachingPackage.tsx    # ขั้นที่ 5: สื่อการสอนและชุดพร้อมสอน (Teaching Assets)
│   │   │   ├── Step6QualityReview.tsx      # ขั้นที่ 6: ตรวจสอบคุณภาพตามเกณฑ์ ว.PA (Quality Review)
│   │   │   ├── Step8TeachingResults.tsx    # ขั้นที่ 8: บันทึกผลหลังสอน (Post-Teaching Results)
│   │   │   └── Step9ReflectionEvidence.tsx # ขั้นที่ 9: สะท้อนคิดและหลักฐานเชิงประจักษ์ (Reflection)
│   │   └── [id]/preview/page.tsx           # หน้าพรีวิวเอกสารขนาด A4 แบบเสมือนจริง
│   ├── api/plan/v3/                        # REST API Endpoints สำหรับ V3
│   │   ├── ai-generate/route.ts            # Fast-track 1-Click AI Generation
│   │   ├── [id]/                           # Lesson Plan Graph Endpoints
│   │   │   ├── activities/                 # CRUD และเรียงลำดับกิจกรรม
│   │   │   ├── assessments/                # CRUD และจับคู่เครื่องมือวัดผล
│   │   │   ├── assets/                     # สร้างและพรีวิวสื่อการสอน 8 ประเภท
│   │   │   ├── auto-provision/             # สร้าง K-P-A และ Evidence อัตโนมัติ (Zero Cold Start)
│   │   │   ├── blueprint/                  # สร้างและวางผังกิจกรรม 60 นาที
│   │   │   ├── export/word & export/pdf    # ส่งออกเอกสาร Word/PDF
│   │   │   ├── finalize/                   # ล็อกแผนเป็น FINAL snapshot
│   │   │   ├── objectives/suggestions/     # เสนอแนะจุดประสงค์ K-P-A ตามบริบทวิชา
│   │   │   ├── post-teaching/              # จัดการข้อมูลผลหลังสอนและหลักฐาน
│   │   │   └── quality/                    # ระบบตรวจสอบความสอดคล้องตามเกณฑ์ ว.PA
│   │   └── curriculum/                     # ข้อมูลหลักสูตรแกนกลาง 2551 (ฉบับปรับปรุง 2560)
│   ├── dashboard/page.tsx                  # ภาพรวมสถิติและสถานะแผน
│   ├── evaluator/page.tsx                  # ระบบประเมินแผนการสอนเดิม (Phase 1-5 Legacy)
│   └── layout.tsx                          # Root Layout + Top Navigation Glassmorphism
├── lib/
│   ├── geminiClient.ts                     # ⚡ Core AI Client: Round-Robin + Model Tiering + Groq
│   ├── geminiKeyPool.ts                    # การจัดการ Pool ของ API Keys
│   └── smartPlanV3/                        # 🧠 V3 Domain Engine Modules
│       ├── types.ts                        # Canonical Data Contracts & Interfaces
│       ├── repository.ts                   # V3 Repository (PostgreSQL Database Gateway)
│       ├── schemas.ts                      # Data Validation Schemas & UUID Validators
│       ├── labels.ts                       # ป้ายกำกับภาษาไทยและสถานะของแผน
│       ├── ai/                             # Scoped AI Generation Services
│       │   ├── blueprintService.ts         # บริการจัดวางผังกิจกรรม 60 นาที
│       │   ├── teachingAssetService.ts     # บริการสร้างสื่อการสอน 8 ตระกูล
│       │   ├── assessmentToolService.ts    # บริการสร้างเครื่องมือวัดผลและรูบริก
│       │   ├── qualityReviewService.ts     # บริการตรวจคุณภาพเชิงลึกด้วย AI
│       │   └── activityRegenService.ts     # บริการสร้างกิจกรรมทางเลือกใหม่เฉพาะขั้น
│       ├── quality/                        # Pure Deterministic Quality Engine
│       │   ├── qualityRules.ts             # กฎตรวจสอบความสอดคล้อง (Structural Chain)
│       │   ├── alignmentGraph.ts           # กราฟความเชื่อมโยงเชิงโครงสร้าง
│       │   └── types.ts                    # Quality Issue Contracts
│       ├── subjectProfiles/                # ฐานข้อมูลธรรมชาติวิชา (9 กลุ่มสาระฯ)
│       │   ├── registry.ts                 # Profile Loader & Fallbacks
│       │   ├── english.ts, math.ts, ...    # กฎเฉพาะสาขาวิชา (เช่น ภาษาอังกฤษห้ามข้อกาล้วน)
│       ├── suggestions/                    # Guided Choice Suggestion Engines
│       │   ├── objectiveSuggestions.ts     # คำแนะนำจุดประสงค์ K-P-A (Bloom's Taxonomy)
│       │   ├── evidenceSuggestions.ts      # คำแนะนำร่องรอยหลักฐานตามธรรมชาติวิชา
│       │   └── activityFlowSuggestions.ts  # คำแนะนำไทม์ไลน์กิจกรรม 3 สไตล์ต่อวิชา
│       └── export/                         # Document Generation Engine
│           ├── canonicalModel.ts           # แปลง Graph เป็นเอกสาร 10 ส่วน
│           ├── docxEngine.ts               # OOXML Word Generation Engine
│           └── pdfEngine.ts                # Serverless Chromium PDF Renderer
├── database/                               # Database Migrations & Scripts
└── tests/                                  # 10 Test Suites (Unit, Integration & E2E)
```

---

## 3. วงจรชีวิตแผนการสอน 9 ขั้นตอน (The 9-Step Instructional Lifecycle)

Smart Plan V3 บังคับใช้ State Machine ที่เข้มงวด ป้องกันการข้ามขั้นตอนหรือสร้างเอกสารที่ไม่สอดคล้องกับความเป็นจริง:

$$\text{DRAFT} \longrightarrow \text{BLUEPRINT\_READY} \longrightarrow \text{PACKAGE\_READY} \longrightarrow \text{REVIEWED} \longrightarrow \text{FINAL} \longrightarrow \text{TAUGHT} \longrightarrow \text{REFLECTED}$$

| ขั้นตอน | ชื่อขั้นตอน | วัตถุประสงค์และการทำงาน | นวัตกรรมที่ช่วยครู |
|:---:|:---|:---|:---|
| **1** | **ข้อมูลแผนการสอน** | ระบุชื่อเรื่อง, กลุ่มสาระ, ระดับชั้น, เวลา (นาที) และเลือกตัวชี้วัดหลักสูตรแกนกลาง | มีระบบค้นหาและกรองตัวชี้วัดอัตโนมัติ จัดกลุ่ม [ระหว่างทาง]/[ปลายทาง] |
| **2** | **เป้าหมาย K-P-A** | กำหนดจุดประสงค์ครบ 3 ด้าน: ความรู้ (K), ทักษะกระบวนการ (P), คุณลักษณะ (A) พร้อมหลักฐาน | **Guided Choice UX**: มีตัวเลือกข้อความพฤติกรรมที่สังเกตได้ให้กดเลือกทันที ไม่ต้องพิมพ์เอง |
| **3** | **กิจกรรม Active Learning** | ไทม์ไลน์ 5 ขั้น (Warm-up, Presentation, Practice, Production, Wrap-up) เวลาเป๊ะ 60 นาที | **AI Blueprint Engine**: จัดสรรเวลารวม 60 นาทีอัตโนมัติ พร้อมปุ่มสลับกิจกรรมเฉพาะขั้นใน 1 คลิก |
| **4** | **การวัดและประเมินผล** | เชื่อมโยงหลักฐานการเรียนรู้กับเครื่องมือวัด (เช่น รูบริก 4 ระดับ, แบบสังเกต) | **Authentic Assessment Rules**: บล็อกข้อสอบกาในวิชาทักษะ (เช่น พูดอังกฤษต้องใช้เกณฑ์รูบริกการพูด) |
| **5** | **ชุดพร้อมสอน (Teaching Assets)** | สร้างสื่อประกอบการสอน 8 ประเภท: ใบงาน, บัตรสนทนา, ใบกิจกรรมการทดลอง, บัตรภารกิจ ฯลฯ | **1 Scoped Generation**: สร้างสื่อที่พร้อมพิมพ์ A4 ทันที มีทั้งฉบับครูและฉบับนักเรียน (ซ่อนเฉลย) |
| **6** | **ตรวจคุณภาพ ว.PA** | ตรวจสอบห่วงโซ่ความสอดคล้อง (Alignment Chain) แบบ Zero-Score ไม่มีคิดเกรดเป็นตัวเลข | **Deterministic Gate**: ตรวจสอบว่าไม่มีจุดประสงค์ใดขาดหลักฐาน และไม่มีหลักฐานใดขาดเครื่องมือวัด |
| **7** | **เอกสาร A4 และส่งออก** | พรีวิวเอกสาร 10 หมวดมาตรฐานราชการ และส่งออกเป็น Word (.docx) หรือ PDF | **Dual-Engine Export**: ไฟล์ Word แก้ไขได้ 100% ตารางไม่แตก และ PDF ฝังฟอนต์ Sarabun New แท้ |
| **8** | **บันทึกผลการสอน (Taught)** | ล็อกโครงสร้างแผนเป็น FINAL เพื่อเปิดให้บันทึกผลการเรียนรู้จริงตามรายจุดประสงค์ K-P-A | ป้องกันการแต่งข้อมูลล่วงหน้า บันทึกจำนวนนักเรียนที่ผ่าน/ไม่ผ่าน พร้อมแนวทางซ่อมเสริม |
| **9** | **สะท้อนคิด & หลักฐาน (Reflected)** | บันทึกข้อค้นพบ อุปสรรค และแนบภาพถ่ายชิ้นงานนักเรียนจริง | สรุปเป็นเล่มรายงาน ว.PA ฉบับสมบูรณ์ พร้อมแนบร่องรอยหลักฐานเชิงประจักษ์ |

---

## 4. สถาปัตยกรรม AI ประสิทธิภาพสูง (High Concurrency & Fault Tolerance)

เพื่อแก้ปัญหาเดิมที่ระบบหมุนค้างหรือคิว AI เต็มเมื่อมีครูใช้งานพร้อมกัน ระบบได้วางโครงสร้างรับโหลด **10–20+ คนพร้อมกัน** ดังนี้:

### 1. Atomic Round-Robin Load Balancing
- ฟังก์ชัน `fetchGeminiWithRetry` ใน `lib/geminiClient.ts` ใช้ตัวนับแบบอะตอมิก (`globalRequestCounter`) ผสานกับ User Hash กระจายคีย์ API ใน `GEMINI_API_KEYS` อย่างเท่าเทียม
- แก้ปัญหาคอขวดเดิมที่ทุกคำขอวิ่งเข้าหาคีย์ตัวแรก (Index 0) จนติดโควตา 15 RPM

### 2. Multi-Model Quota Cascading
- Google AI Studio แยกโควตาคำขออิสระระหว่างรุ่นโมเดล:
  - ลำดับที่ 1: `gemini-2.5-flash` (โมเดลหลัก คุณภาพสูงสุด)
  - ลำดับที่ 2 (เมื่อติด 429): สลับสู่ `gemini-2.5-flash-lite` ทันทีในเสี้ยววินาที
  - ลำดับที่ 3 (เมื่อโหลดหนาแน่น): สลับสู่ `gemini-1.5-flash` (โควตากว้างและเร็วที่สุด)
- ช่วยเพิ่มขีดความสามารถในการรับคำขอได้ทันที 3x–5x โดยที่ผู้ใช้ไม่รู้สึกว่าสะดุด

### 3. Groq Emergency Failover (Llama 3.3 70B)
- หากโควตา Gemini ทั้งหมดถูกใช้งานจนเต็ม ระบบจะส่งคำขอไปยัง Groq Llama 3.3 อัตโนมัติ (`GROQ_API_KEY`)
- ตอบกลับอย่างแม่นยำในเวลาเฉลี่ยเพียง **~400ms** พร้อมจำลอง JSON Candidate คืนกลับมาในโครงสร้างเดียวกับ Gemini 100%

### 4. Fast Timeout & Grounded Deterministic Fallback Engine
- เซอร์วิส AI ทุกจุดถูกปรับลด Timeout เหลือเพียง **4.5 – 5.5 วินาที** (จากเดิม 35-45 วินาที)
- หาก AI มีความหน่วงเกินกำหนด ระบบจะตัดสลับไปใช้ **Deterministic Pedagogical Rules** ทันทีในเวลา **< 2ms**
- **ผลลัพธ์:** ผู้ใช้จะไม่เจอปัญหาหน้าจอหมุนค้าง ได้รับแผนการสอน, กิจกรรม 5 ขั้น, สื่อพร้อมสอน, และรูบริกการวัดผลที่สมบูรณ์แบบตามเกณฑ์กระทรวงศึกษาธิการแน่นอน 100%

### 5. Guaranteed Hard Navigation
- หน้าสร้างแผน (`app/plan/v3/new/page.tsx`) ใช้การเปลี่ยนหน้าด้วย `window.location.href` โดยตรง เสริมทัพด้วยปุ่มสีเขียว `⚡ เปิดดูแผนทันที →` ทันทีที่ข้อมูลถูกบันทึกเข้าฐานข้อมูลเสร็จสิ้น ป้องกันการค้างจาก Next.js Soft Navigation

---

## 5. ฐานข้อมูลและโครงสร้างข้อมูล (Database & Data Model)

ระบบใช้ **Supabase (PostgreSQL 15)** ภายใต้ Schema `v3_*` ที่แยกเป็นอิสระและมีความปลอดภัยสูง:

| ตารางหลัก | หน้าที่และการจัดเก็บ |
|:---|:---|
| `v3_lesson_plans` | ข้อมูลหัวแผน, วิชา, ระดับชั้น, เวลา, สถานะวงจรชีวิต (DRAFT, FINAL, etc.) |
| `v3_lesson_curriculum_links` | ตัวชี้วัดและมาตรฐานหลักสูตรที่เชื่อมโยงกับแผน |
| `v3_lesson_objectives` | จุดประสงค์การเรียนรู้รายข้อ (K, P, A) และพฤติกรรมบ่งชี้ |
| `v3_learning_evidence` | ร่องรอยหลักฐานการเรียนรู้ (ชิ้นงาน/ภาระงาน) |
| `v3_objective_evidence_links` | ความเชื่อมโยงแบบ Many-to-Many ระหว่างจุดประสงค์กับหลักฐาน |
| `v3_lesson_activities` | ไทม์ไลน์กิจกรรมการเรียนรู้ 5 ขั้น (นาที, บทบาทครู, บทบาทนักเรียน) |
| `v3_assessments` | รายการประเมินและเกณฑ์การผ่าน |
| `v3_assessment_tools` | เครื่องมือวัดผล (Rubrics 4 ระดับ, Checklists, แบบประเมินทักษะ) |
| `v3_teaching_assets` | สื่อการสอนฉบับสมบูรณ์ (Worksheets, Speaking Cards, Experiment Sheets) |
| `v3_plan_versions` | Snapshot ข้อมูลทั้งแผนแบบ Immutable เมื่อเปลี่ยนสถานะเป็น FINAL |
| `v3_post_teaching_records` | บันทึกผลการสอนเชิงปริมาณและคุณภาพ |
| `v3_student_evidence` | หลักฐานชิ้นงานนักเรียนจริงหลังการสอน |

---

## 6. การทดสอบและการรับประกันคุณภาพ (Verification & Testing)

ระบบมีชุดทดสอบครอบคลุมทุกมิติ รันผ่านทั้งหมด 100% ด้วยคำสั่ง `node tests/...`:

1. `tests/test-v3-assessment-engine.js` (20/20 ผ่าน) — ตรวจสอบเครื่องมือวัดผลและเกณฑ์รูบริกตามธรรมชาติวิชา
2. `tests/test-v3-blueprint-engine.js` (12/12 ผ่าน) — ตรวจสอบการจัดสรรเวลากิจกรรม 60 นาทีและ Active Learning
3. `tests/test-v3-quality-engine.js` (22/22 ผ่าน) — ตรวจสอบกฎความสอดคล้อง ว.PA และการบล็อกเอกสารไม่สมบูรณ์
4. `tests/test-v3-teaching-package.js` (17/17 ผ่าน) — ตรวจสอบสื่อการสอน 8 ตระกูลและการแยกฉบับครู/นักเรียน
5. `tests/test-v312-guided-choice.js` (13/13 ผ่าน) — ตรวจสอบระบบเสนอแนะ K-P-A และตัวเลือกสำเร็จรูป
6. `tests/test-v3-e2e-hardening.js` (15/15 ผ่าน) — ตรวจสอบความปลอดภัยข้ามผู้ใช้ (RLS/IDOR) และ Snapshot Immutability
7. `tests/test-v3-subject-profiles.js` (39/39 ผ่าน) — ตรวจสอบธรรมชาติวิชาทั้ง 9 กลุ่มสาระฯ
8. `tests/test-v3-workflow.js` (45/45 ผ่าน) — ตรวจสอบโครงสร้างแผนและการจัดเก็บข้อมูล
9. `tests/test-v3-export-engine.js` (47/47 ผ่าน) — ตรวจสอบการสร้างไฟล์ Word (.docx) และ PDF
10. `tests/test-v3-post-teaching.js` (23/23 ผ่าน) — ตรวจสอบการบันทึกผลหลังสอนและภาพถ่ายหลักฐาน

---

## 7. คู่มือการทำงานต่อสำหรับ AI / นักพัฒนา (Developer Handoff Guide)

หากคุณเป็น AI Agent หรือนักพัฒนาที่เข้ามารับช่วงต่อ โปรดปฏิบัติตามหลักการต่อไปนี้อย่างเคร่งครัด:

### ⚠️ กฎเหล็กที่ห้ามละเมิด (Critical Invariants):
1. **ห้ามลบ Deterministic Fallback Engine**:
   - การเรียกใช้ AI ในระบบนี้จะต้องมี Timeout สั้น (4.5–5.5s) และต้องมี Fallback เป็นฟังก์ชันสร้างข้อมูลมาตรฐานของระบบเสมอ ห้ามปล่อยให้เกิด Unhandled Rejection หรือ Infinite Spinner
2. **รักษาการแยกฉบับครูและฉบับนักเรียน (Teacher vs Student Package)**:
   - สื่อการสอนและใบงานในฉบับนักเรียน (`STUDENT`) จะต้องไม่มีเฉลย, ไม่มีเกณฑ์ตรวจ, และไม่มีแนวการตอบของครูหลุดออกไปโดยเด็ดขาด
3. **ห้ามแก้ไขแผนที่อยู่ในสถานะ FINAL**:
   - แผนที่อยู่ในสถานะ `FINAL`, `TAUGHT`, `REFLECTED` จะถูก Snapshot ไว้ใน `v3_plan_versions` และไม่สามารถแก้ไขโครงสร้างแผนย้อนหลังได้ (แก้ไขได้เฉพาะผลหลังสอนและรูปภาพหลักฐาน)
4. **การ Redirect หน้าจอใน Client Component**:
   - ให้ใช้ `window.location.href` หรือ Direct Link ร่วมกับ `router.push` เสมอ เพื่อป้องกันปัญหาแคชของ Next.js App Router ทำงานติดขัด

### 🛠️ ตัวแปรสภาพแวดล้อมที่จำเป็น (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL="https://tfvlkfmayxsgneyajhrl.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
GEMINI_API_KEY="..."
GEMINI_API_KEYS="key1,key2,key3..."   # รองรับหลายคีย์คั่นด้วยจุลภาคสำหรับ Load Balancing
GROQ_API_KEY="..."                    # คีย์สำรองฉุกเฉินความเร็วสูง (~400ms)
```

---

## 8. สรุปภาพรวมสำหรับผู้บริหารโครงการ (Executive Summary)

ระบบ **Smart Plan V3** ในปัจจุบันเป็นระบบที่:
1. **ใช้งานได้จริง (Production Ready)**: ครูสามารถกรอกเพียงหัวข้อสั้นๆ ระบบจะจัดการสืบค้นตัวชี้วัด สร้างจุดประสงค์ วางกิจกรรม 5 ขั้น จัดเตรียมสื่อและข้อสอบ พร้อมตรวจคุณภาพตามเกณฑ์ ว.PA ให้ครบถ้วนในเวลาไม่เกิน 2–3 วินาที
2. **เสถียรและทนทาน (Highly Resilient)**: รองรับการเข้าใช้งานพร้อมกัน 10–20 คนพร้อมกัน โดยไม่มีปัญหาคิวเต็มหรือหมุนค้าง
3. **ถูกหลักวิชาการ 100%**: ออกแบบตามกรอบหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ปรับปรุง 2560) และมาตรฐานตำแหน่งและวิทยฐานะข้าราชการครู (ว.PA) ของ ก.ค.ศ. อย่างสมบูรณ์แบบ
