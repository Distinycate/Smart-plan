# SMART PLAN V3 — PRODUCTION RUNBOOK

**Document Version:** 1.0 (V3.11 Final Wave)  
**Date:** September 2026  
**Status:** Canonical Production Reference  

---

## 1. System Overview

Smart Plan V3 is an end-to-end curriculum-grounded lesson planning, active learning, authentic assessment, and post-teaching reflection engine.
It connects the entire instructional lifecycle:

$$\text{Draft} \longrightarrow \text{Blueprint} \longrightarrow \text{Assessment} \longrightarrow \text{Package} \longrightarrow \text{Review} \longrightarrow \text{FINAL} \longrightarrow \text{TAUGHT} \longrightarrow \text{Observed Evidence} \longrightarrow \text{REFLECTED} \longrightarrow \text{Export (DOCX/PDF)}$$

---

## 2. Environment Variables & Secrets

All production deployments on Vercel require the following environment variables:

| Variable | Scope | Description | Sensitivity |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | Supabase Project URL | Non-secret |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | Supabase Anonymous Client Key | Public safe with RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server Only** | Supabase Service Role Key for background/admin tasks | **CRITICAL SECRET** (Never expose to client/bundle) |
| `GEMINI_API_KEY` | **Server Only** | Google Gemini Generative AI Key | **CRITICAL SECRET** |
| `NODE_ENV` | Runtime | Set to `production` in production deployment | System |
| `NEXT_PUBLIC_ENABLE_SMART_PLAN_V3` | Client/Server | Feature flag controlling V3 default entry (default `true`) | Configuration |

> [!CAUTION]
> Under NO circumstances should `SUPABASE_SERVICE_ROLE_KEY` be prefixed with `NEXT_PUBLIC_` or imported in any React client component. Automated audit verifies 0 occurrences in client bundle.

---

## 3. Database & Applied Migrations

Smart Plan V3 relies on PostgreSQL migrations 15 through 19:

1. **Migration 15 (`15_v3_core_schema.sql`):** Core lesson plans table, subject profiles, version snapshots, quality reviews.
2. **Migration 16 (`16_v3_domain_graph_and_security.sql`):** Domain graph tables: objectives, evidence, activities, assessments, assessment tools, teaching assets, junction tables, and RLS policies.
3. **Migration 17 (`17_v3_curriculum_and_storage.sql`):** Curriculum version links, subject mapping, storage bucket definitions.
4. **Migration 18 (`18_v3_atomic_finalize_and_immutability.sql`):** PostgreSQL RPC `finalize_v3_lesson` with row-level locks (`SELECT ... FOR UPDATE`), snapshot immutability triggers (`UPDATE`/`DELETE` prevention on `label = 'FINAL'`), and pre-teaching child entity locks.
5. **Migration 19 (`19_v3_post_teaching_and_observed_evidence.sql`):** Post-teaching record extension, observed student evidence table (`v3_observed_student_evidence`), and child entity locking extension covering `FINAL`, `TAUGHT`, and `REFLECTED`.

### Storage Bucket:
- **`v3_student_evidence`**: Private bucket for observed student work/evidence.
  - Ownership prefix: `{user_id}/{plan_id}/{uuid}.{ext}`
  - Access control: Authenticated signed URLs (1 hour expiry) via server endpoint `/api/plan/v3/[id]/post-teaching/evidence/upload`.

---

## 4. Serverless Chromium & PDF Runtime

- Smart Plan V3 uses `@sparticuz/chromium` + `puppeteer-core` on Vercel Serverless Functions (Node.js 18+/20+).
- **Fallback mechanism:** If binary pack download is needed, the engine resolves `@sparticuz/chromium` release assets with local tarball caching.
- **Font Assurance:** Embedded base64 TH Sarabun New font ensures deterministic typography in serverless container without network font CDN roundtrips.
- **Fail-safe:** If Chromium runtime is unavailable, the system issues a controlled `503 Service Unavailable` with `PDF_ENGINE_UNAVAILABLE` rather than generating corrupted or unstyled outputs.

---

## 5. Security & Authorization Architecture

- **Server-Authoritative Lifecycle:** Lifecycle transitions (`FINAL`, `TAUGHT`, `REFLECTED`) can ONLY be executed through dedicated POST endpoints calling authoritative business logic and PostgreSQL RPCs. Direct client PATCH cannot alter status.
- **IDOR Protection:** Every child entity route verifies that the referenced entity belongs strictly to the requested `lesson_plan_id`, and that the `lesson_plan_id` is owned by the authenticated caller (`auth.uid()`).
- **Pre-teaching Immutability:** When a lesson enters `FINAL`, `TAUGHT`, or `REFLECTED`, all pre-teaching child entities (objectives, activities, assessments, tools, assets, links) are strictly read-only.
- **Student Package Redaction:** When exporting Student Packages, answer keys, expected solutions, calculation steps, teacher guides, remediation notes, and PA internal tags are stripped at the canonical document model level.

---

## 6. Cutover & Legacy Coexistence Strategy

- **Default Entry:** When `isV3Enabled()` is `true`, dashboard Primary CTAs navigate users to `/plan/v3/new`.
- **Legacy Preservation:** Existing legacy plans in `LessonPlans` table remain fully accessible.
  - Legacy create button is accessible via "สร้างแผนเดิม (Legacy)" (`/plan/new`).
  - Legacy edit and preview routes (`/plan/[id]`, `/plan/[id]/preview`) function unchanged.
- **Rollback Procedure:**
  1. Set environment variable `NEXT_PUBLIC_ENABLE_SMART_PLAN_V3=false` in Vercel.
  2. Redeploy or restart runtime.
  3. Dashboard automatically directs primary CTA to `/plan/new`.
  4. Existing V3 database records and migrations remain intact without data loss.

---

## 7. Support & Troubleshooting Checklist

| Symptom | Probable Cause | Action |
| :--- | :--- | :--- |
| `HTTP 403 LESSON_IS_LOCKED` on PATCH | Attempting to edit pre-teaching entities of a FINAL/TAUGHT/REFLECTED plan | Explain to user that finalized plans are immutable. To teach another class, use Duplicate/Branch. |
| `HTTP 403 FORBIDDEN` on asset/activity | IDOR attempt or access token expired | Verify user session matches `v3_lesson_plans.user_id`. |
| `HTTP 503 PDF_ENGINE_UNAVAILABLE` | Vercel Lambda cold start network timeout fetching Chromium pack | Check Vercel function logs. Verify Lambda memory is at least 1024MB. Retry generation. |
| `HTTP 422 VALIDATION_ERROR` on Reflect | `students_need_support > 0` but `remediation_plan` is empty | Ensure teacher fills in remediation actions for students needing support before completing reflection. |
| Evidence upload fails with `415` | Invalid file format | Only PDF, JPEG, PNG, WebP, and GIF files are allowed. |
