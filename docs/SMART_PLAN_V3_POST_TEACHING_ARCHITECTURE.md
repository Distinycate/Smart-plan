# SMART PLAN V3.10 — POST TEACHING & STUDENT EVIDENCE ARCHITECTURE
**Wave V3.10 Post-Teaching Lifecycle, Immutable Snapshot Overlay & Student Evidence Architecture**
*Document Version: 3.10.0 | Date: 2026-09-29*

---

## 1. Executive Summary & Core Philosophy

Smart Plan V3.10 transforms Smart Plan from a pre-teaching preparation tool into a complete reflective teaching cycle:

$$\text{วางแผน (Plan)} \longrightarrow \text{สอนจริง (Teach)} \longrightarrow \text{เก็บหลักฐานจริง (Evidence)} \longrightarrow \text{วิเคราะห์ผล (Analyze)} \longrightarrow \text{ช่วยเหลือ/ซ่อมเสริม (Remediation)} \longrightarrow \text{สะท้อนคิด (Reflection)}$$

### 1.1 Core Lifecycle States
- **`REVIEWED`**: Pre-teaching plan has completed Quality Review. Ready to finalize.
- **`FINAL`**: Immutable Pre-Teaching Truth. All pre-teaching entities (`objectives`, `activities`, `assessments`, `tools`, `evidence`) are locked.
- **`TAUGHT`**: Teaching session has occurred in reality. Teaching date, duration, student attendance, assessed counts, passed, and needs-support counts are recorded and validated.
- **`REFLECTED`**: Complete post-teaching reflection recorded, including teacher reflection, what worked, problems found, adjustments made, actual feedback given, next-lesson adjustments, and mandatory remediation plan (if any students needed support).

---

## 2. Planned Evidence vs Observed Student Evidence

Smart Plan V3.10 enforces a strict semantic and architectural boundary between planned intention and classroom reality:

| Dimension | Planned Evidence (`v3_learning_evidence`) | Observed Student Evidence (`v3_observed_student_evidence`) |
| :--- | :--- | :--- |
| **Lifecycle Stage** | Pre-Teaching (Before class) | Post-Teaching (During/After class) |
| **Status** | `PLANNED` | `OBSERVED`, `PARTIALLY_OBSERVED`, `NOT_OBSERVED` |
| **Entity Table** | `public.v3_learning_evidence` | `public.v3_observed_student_evidence` |
| **Content** | Expected artifacts (Worksheet, Exit ticket, Rubric) | Actual student work samples, aggregate scores, photos, observation notes |
| **Mutated by Teaching?** | **NEVER** — remains unchanged | Independent entities linked via `planned_evidence_id` (nullable) |
| **Unplanned Evidence** | N/A | Supported (spontaneous classroom discoveries) |

---

## 3. Immutable FINAL Snapshot & Document Overlay Architecture

### 3.1 Immutability of Pre-Teaching Truth
- The row in `v3_plan_versions` with `version_type = 'FINAL'` represents the immutable truth before entering the classroom.
- Post-teaching actions (`TAUGHT`, `REFLECTED`) **MUST NEVER** overwrite, alter, or regenerate the `FINAL` snapshot in `v3_plan_versions`.
- Pre-teaching child entities remain locked: The database trigger `prevent_final_lesson_mutation()` guards `v_plan_status IN ('FINAL', 'TAUGHT', 'REFLECTED')`.

### 3.2 PostTeachingDocumentOverlay Architecture
All exports (Word DOCX, A4 PDF Preview) and document builders use the overlay pattern:

$$\text{Immutable FINAL Snapshot} + \text{Post-Teaching Record} + \text{Observed Evidence} = \text{PostTeachingDocumentView}$$

- **`FINAL` View**: Displays full pre-teaching plan + blank handwriting boxes for manual post-teaching notes.
- **`TAUGHT` View**: Displays immutable pre-teaching plan + teaching date/time + student count reconciliation + teaching notes + observed evidence summary + blank reflection placeholder.
- **`REFLECTED` View**: Displays immutable pre-teaching plan + teaching results + observed evidence + teacher reflection + what worked + problems + actual feedback + adjustments + remediation plan + next lesson adjustments.

### 3.3 Dual Provenance Hash Strategy
Documents retain full audit provenance with two separate hashes:
- `baseFinalHash`: SHA-256 hash of the immutable pre-teaching FINAL snapshot (`documentSourceHash`).
- `postTeachingSourceHash`: SHA-256 hash of the post-teaching record and observed student evidence.

---

## 4. Teaching Session Reconciliation & Deterministic Rule Engine

All transitions are gated by deterministic server-side rules (`lib/smartPlanV3/rules/postTeachingRules.ts`) and PostgreSQL atomic RPCs (`record_v3_teaching`, `record_v3_reflection`).

### 4.1 Student Reconciliation Rules
$$\text{students\_present} + \text{students\_absent} = \text{students\_total}$$
$$\text{students\_assessed} \le \text{students\_present}$$
$$\text{students\_passed} + \text{students\_need\_support} \le \text{students\_assessed}$$
$$\text{students\_total} > 0, \quad \text{all counts} \ge 0$$

### 4.2 Remediation Gate
If $\text{students\_need\_support} > 0$, transition to `REFLECTED` is **strictly blocked** unless a non-empty `remediation_plan` is documented. Every student requiring support must have a remedial action plan.

### 4.3 AI Boundaries
- AI is strictly restricted to drafting reflections, summarizing teacher notes, and suggesting remediation wording.
- AI **CANNOT** invent student scores, fabricate observations, mark evidence as observed, or change lifecycle states. State transitions require explicit teacher confirmation.

---

## 5. Security & Privacy

### 5.1 Student Privacy
- No student PII (Personal Identifiable Information) such as national IDs, student IDs, or full names is collected or stored.
- Aggregate metrics, anonymous samples (e.g. "Sample A", "Sample B"), and grouped counts are used by default.

### 5.2 Storage Security
- Binary files (images, PDFs) are never stored in PostgreSQL columns.
- Supabase Storage bucket `v3_student_evidence` is strictly private (`public = false`).
- Row Level Security (RLS) on storage restricts uploads and reads to the lesson owner (`auth.uid() = folder`).
- Signed URLs with short expiration are generated for preview/download.

### 5.3 Export Package Boundary
- **Student Package**: Strictly excludes teacher reflections, remediation notes, assessment rubrics, and internal observations.
- **Teacher Package**: Includes all teaching session results, observed evidence, reflections, and remedial notes.
