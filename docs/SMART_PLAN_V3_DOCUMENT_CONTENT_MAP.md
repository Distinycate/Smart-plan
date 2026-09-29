# Smart Plan V3 — Canonical Document Content Map

## 1. Overview
เอกสารนี้เป็น Source of Truth สำหรับการแปลง **V3 Lesson Graph** ไปเป็น **Canonical Document Model** (`V3LessonDocument`) เพื่อนำไปเรนเดอร์ใน A4 Preview (Wave V3.8) รวมถึง Microsoft Word (.docx) และ PDF (Wave V3.9)

หลักการสำคัญ:
- **Single Source of Truth:** ทุก Renderer รับ Canonical Document Model เดียวกัน ไม่ query ฐานข้อมูลเอง
- **No AI Fabrication:** ห้ามใช้ AI แต่งเนื้อหาขึ้นใหม่ในขั้นตอนการสร้างเอกสาร
- **Explicit Content Auditing:** ระบุที่มาของแต่ละ Section ชัดเจนว่ามาจาก Structured Entity ใด หรือมาจากการ Derive เชิงระบบ

---

## 2. Section Content Audit Matrix

| Section No. | ชื่อส่วนเอกสาร (Canonical Title) | Source Entity | Field ใน V3 Graph | สถานะความพร้อม | วิธีการได้มา (Derivation / Direct) | Fallback Policy เมื่อไม่มีข้อมูล |
|:---:|:---|:---|:---|:---:|:---|:---|
| **1** | **ข้อมูลแผนการจัดการเรียนรู้**<br>(Lesson Information) | `lesson`<br>`curriculumLinks` | `topic`, `grade_level`, `duration_minutes`, `subject_key`, `course_code`, `unit_reference`, `teaching_date` | **มีจริง 100%** | **Direct:** ดึงจากฟิลด์หลักของ Lesson โดยตรง แปลง `subject_key` ผ่าน `getSubjectLabel()`, แปลง `duration_minutes` ผ่าน `formatDuration()` | ใช้ค่าว่างหรือค่าเริ่มต้นตามฟิลด์ |
| **2** | **มาตรฐานการเรียนรู้และตัวชี้วัด**<br>(Curriculum Standards & Indicators) | `curriculumLinks` | `standard_code`, `standard_label_snapshot`, `indicator_code`, `indicator_label_snapshot` | **มีจริง 100%** | **Direct Snapshot:** ใช้ข้อความจาก Snapshot ที่บันทึกไว้ใน `curriculumLinks` เพื่อคงความถูกต้องในอดีต (ไม่ดึง API ใหม่มาทับ) | หากไม่มีตัวชี้วัด ระบบจะถูก Block ตั้งแต่ Quality Gate |
| **3** | **สาระสำคัญ / ความคิดรวบยอด**<br>(Key Concept / Core Idea) | `lesson` | `learning_focus`, `topic` | **Derived (Deterministic)** | **Derived:** สังเคราะห์เชิง Deterministic จาก `learning_focus` (ภาษาไทย) และ `topic` เช่น "การจัดการเรียนรู้เรื่อง [topic] มุ่งเน้นการพัฒนาทักษะ [learning_focus]..." | หากไม่มี ให้สรุปจากหัวข้อและกลุ่มสาระ ห้าม AI แต่งข้อความยาวโดยไม่มีหลักฐาน |
| **4** | **จุดประสงค์การเรียนรู้**<br>(Learning Objectives) | `objectives` | `statement`, `objective_type`, `position` | **มีจริง 100%** | **Direct:** เรียงตาม `position` (ข้อ 1, 2, 3...) ไม่แสดง UUID หรือ Enum ภาษาอังกฤษ แต่แสดงข้อความ statement ที่ครูกำหนด | ห้ามข้าม Blocked หากไม่มีจุดประสงค์ |
| **5** | **สาระการเรียนรู้**<br>(Learning Contents) | `lesson` | `topic`, `learning_focus` | **Derived (Deterministic)** | **Derived:** แสดงหัวข้อหลักและประเด็นการเรียนรู้ที่สอดคล้องกับ `topic` | แสดง `topic` เป็นเนื้อหาหลัก |
| **6** | **หลักฐาน / ภาระงานของผู้เรียน**<br>(Learning Evidence / Artifacts) | `evidence`<br>`objectiveEvidenceLinks` | `evidence_type`, `description`, `position` | **มีจริง 100%** | **Direct & Cross-Referenced:** แสดงรายการภาระงาน/ชิ้นงานของผู้เรียน พร้อมระบุการเชื่อมโยงกับภาคผนวกสื่อ/ใบงาน (ถ้ามี) | ห้ามข้าม Blocked หากไม่มีหลักฐาน |
| **7** | **กระบวนการจัดการเรียนรู้**<br>(Learning Process / Activity Timeline) | `activities`<br>`activityObjectiveLinks`<br>`activityEvidenceLinks` | `phase`, `minutes`, `title`, `teacher_actions`, `student_actions`, `feedback_moment`, `assessment_moment`, `position` | **มีจริง 100%** | **Direct:** จัดเรียงตาม `position` คำนวณเวลารวมเชิง Deterministic (เช่น รวม 60 นาที) แปลงชื่อ Phase เป็นภาษาไทย | ตรวจสอบว่าเวลารวมตรงกับแผน (Blocked หากเวลาไม่ตรง) |
| **8** | **สื่อและแหล่งการเรียนรู้**<br>(Teaching Media & Resources) | `teachingAssets` | `asset_type`, `title`, `audience`, `generation_status` | **มีจริง 100%** | **Direct & Linked:** สรุปรายชื่อสื่อและแหล่งเรียนรู้ทั้งหมดในแผน พร้อมระบุรหัสอ้างอิงไปยังภาคผนวก (เช่น "ดูภาคผนวก ก") | แสดงเฉพาะสื่อที่พร้อมใช้งาน (`READY`) |
| **9** | **การวัดและประเมินผล**<br>(Measurement & Evaluation Table) | `assessments`<br>`assessmentTools`<br>`assessmentEvidenceLinks`<br>`objectiveEvidenceLinks` | `method`, `criteria`, `name`, `tool_type`, `formative` | **มีจริง 100%** | **Relational Traverse:** เชื่อมโยง Objective $\rightarrow$ Evidence $\rightarrow$ Assessment $\rightarrow$ Tool $\rightarrow$ Criteria รองรับ Many-to-Many แสดงหมายเลขจุดประสงค์แบบยุบรวม | ห้าม index matching ต้องใช้ Relation Graph จริง |
| **10** | **บันทึกหลังการจัดการเรียนรู้**<br>(Post-Teaching Reflection Placeholder) | Placeholder Template | - | **Template Placeholder** | **Deterministic Template:** แสดงกรอบแบบฟอร์มเปล่าสำหรับครูบันทึกด้วยลายมือ (ผลการจัดการเรียนรู้, ปัญหา/อุปสรรค, ข้อเสนอแนะ/แนวทางแก้ไข) | แสดงเมื่อเลือกตัวเลือก `includePostTeachingPlaceholder = true` |

---

## 3. Appendices Structure & Deterministic Order

| ภาคผนวก | หมวดหมู่ (Category) | Source Entities | ข้อกำหนดความปลอดภัยและการแสดงผล |
|:---:|:---|:---|:---|
| **ภาคผนวก ก** | ใบงาน / ภาระงาน / สื่อสำหรับนักเรียน<br>(Student Assets) | `teachingAssets` (ประเภท Worksheet, Problem Set, Speaking Card, Experiment Sheet, Task Card, Flashcard, Exit Ticket) | **Student-Safe:** ห้ามมีเฉลย, คำตอบที่คาดหวัง, หรือ Teacher Tips ปะปนในหน้านี้ |
| **ภาคผนวก ข** | เฉลย / แนวคำตอบ<br>(Answer Keys / Solution Guides) | `teachingAssets` (ประเภท Answer Key) หรือเฉลยแนบท้ายสื่อ | **New Page Enforcement:** ต้องเริ่มต้นหน้าใหม่เสมอ เพื่อแยกออกจากใบงานนักเรียน |
| **ภาคผนวก ค** | เครื่องมือวัดและประเมินผล<br>(Assessment Tools) | `assessmentTools` (Rubric, Checklist, Scoring Guide, Observation Form) | แสดงตารางเกณฑ์ประเมิน (Rubric Matrix) หรือข้อรายการสังเกตอย่างสมบูรณ์ |
| **ภาคผนวก ง** | คู่มือครู / เอกสารประกอบเพิ่มเติม<br>(Teacher Guide / Timeline) | `teachingAssets` (ประเภท Teacher Guide) | **Optional:** แสดงเฉพาะเมื่อเปิดออปชัน `includeTeacherGuide = true` |
| **ภาคผนวก จ** | ผลการตรวจความสอดคล้องตามเกณฑ์<br>(PA Readiness Summary) | `v3_plan_reviews` (ประเภท `PA_READINESS`) | **Optional with Disclaimer:** แสดงเฉพาะเมื่อเปิดออปชัน และต้องมีข้อความระบุว่าไม่ใช่ผลการประเมินวิทยฐานะทางการ |

---

## 4. Dynamic Lettering Rule
ระบบกำหนดลำดับอักษรภาคผนวกภาษาไทยแบบไดนามิก:
`['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ']`
หากภาคผนวกหมวดใดไม่มีเนื้อหาจริง ลำดับอักษรของภาคผนวกถัดไปจะถูกร่นขึ้นมาเรียงลำดับต่อเนื่องทันที (ห้ามข้ามตัวอักษร)
