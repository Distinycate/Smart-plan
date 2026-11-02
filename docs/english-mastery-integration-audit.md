# English Mastery integration audit — 2026-10-23

## Scope and authority
The new user directive supersedes SR as the target. Smart Plan is the single host application, identity provider, shell and deployment. Original EMH source is read-only. No production deployment, database reset, migration replay, billing change or automatic academic approval is authorized.

## Baseline inspected
- GitHub: `Distinycate/Smart-plan`, main `7eae600`; clean clone, integration branch `feature/english-mastery-integration`. The similarly named private `Distinycate/Smartplan` is an older/minimal implementation, not the V3 source matching the local documentation.
- 456 tracked files inspected by inventory; architecture, package/lockfile, auth actions, shared layout, middleware, clients, authorization, SQL migrations, test conventions and deployment records examined.
- Host: Next 14.2.35 (lock), React 18, TypeScript, Tailwind 4, npm. No Prisma. Supabase cookie SSR clients, `auth.getUser()`, `profiles` role `user|admin`; shared `requireUser()` authorization. Browser/API use PostgREST. APIs are excluded from middleware and must authorize independently.
- Existing domains: legacy LessonPlans/UnitPlans, evaluations/AI, Smart Plan V3 relational domain and final snapshots. Do not merge EMH Lesson/Attempt/Progress with similarly named host entities.
- GitHub source has server/client/tsconfig files missing from the previously inspected desktop copy. GitHub is authoritative; do not synchronize that incomplete desktop copy over this checkout.
- Baseline TypeScript passed. Baseline build compiled but failed at page-data collection: existing admin singleton requires Supabase environment variables. Next 14 also rejects top-level outputFileTracingIncludes. Baseline lint/test results are recorded separately as executed, not presumed passing.
- Existing security audit flags live legacy RLS and SECURITY DEFINER grants/identity checks as unverified. Historical local tests and preview smoke do not establish current production security. Vercel MCP returns 403 for the documented project/team; no live linkage/settings/usage claim is made.

## EMH compatibility assessment
- Reference: Next 16 / React 19 / Prisma 7 / Zod / pnpm. Do not upgrade the host's framework merely to copy it.
- The original EMH runtime repository is in-memory; its currentUser only supports an explicitly local fallback and returns null otherwise. Some unit JSON contains block labels rather than full lesson text. These are implementation gaps, not production-ready features to blindly preserve.
- Reuse domain requirements, IDs, canonical source and validated content derivation; replace runtime persistence/auth with host-compatible adapters.
- Prior SR work contains a lossless canonical-source-backed 0.6 structured derivative. Import both original 0.5 packages and this separately versioned derivative, verifying original source checksums. Do not reuse Firebase infrastructure/auth or declare 0.6 academically checked.

## Decision / ADR-EMH-001
Use a native module `lib/english-mastery`, route namespace `/english` and `/api/english`, shared host layout and login. Retain React18 and the host's conventions. Supabase/PostgREST repository with additive `emh_*` tables and narrowly scoped transaction RPCs; no second ORM, app, identity table or Supabase project. Use JSONB immutable payloads plus indexed relational identity, owner, version and reference columns. Mutable attempts use optimistic revisions and atomic commits. No client mutation of trusted results/content/permissions.

## ADR-EMH-002 — security-driven framework compatibility update

The baseline Next14 runtime has critical advisories. Upgrade to Next15.5.28, not to the reference project's Next16/React19 stack. Official advisory: https://nextjs.org/blog/nextjs-security-update-october-14-2026 . Apply the official async-request codemod; manually finish aliased route types and await the existing server Supabase cookie factory at all call sites. There are no bundled Next docs in either installed 14 or 15, so the official v15 upgrade guide was used. Host business rules are unchanged. Next tracing config moves to stable top-level keys. PostCSS/xmldom receive narrow overrides; SheetJS uses its official patched 0.20.3 tarball (https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), not an unmaintained third-party fork. Re-run host tests, browser tests and build after these changes.

## Identity / permission decision
Reuse host `requireUser()` and auth.users UUID. Explicit EMH grants and reviewer assignments are module-scoped; host admin does not automatically become an academic reviewer/publisher. No roles from cookies or editable user metadata. Membership makes the module invite-only even though host registration exists. First administrator grant is an operator-controlled staging setup step, never automatic on signup.

## Governance / snapshots
All six pilots remain PRE_HUMAN_CONTENT_COMPLETE. Preview requires explicit permission; no preview evidence becomes calibrated readiness. Immutable payload + checksum and append-only version-bound review records; publication requires eight applicable review types and real named attestation, additional audio checks when produced audio is present. Assessment pool validation remains separately gated. Freeze item payloads, blueprint, rubric, scoring/readiness policy and optional exam profile before responses; CAS guards autosave/final submission.

## Risks and rollout
Shared DB quotas/auth/security are still shared infrastructure. Audit deployed host policies before admitting EMH learners. Preview must not silently bind production DB. Separate staging credentials and backups required before applying SQL. Private EMH audio bucket, authenticated ownership and deletion workflow; no default invented retention schedule. AI disabled. Source-derived text is preview-only pending human checks/audio QC. Preserve existing navigation/style; additive entry only. Run host regressions as well as domain/SQL/RLS/browser/accessibility checks. Vercel access and actual Supabase staging validation remain external gates, not excuses to stop local implementation.
