# Integration verification — 2026-10-25

## Scope and evidence

Persistent real-service local verification is now complete in an isolated Colima/Supabase runtime: four browser workflows against real Auth/PostgreSQL/Storage, then an actual VM stop/start and browser/data persistence check. No main-system credentials or data are used by that runtime. The full regression passed again with 22 SQL/domain cases, 30 host suites and eight contract-browser workflows. See [the local runtime guide](english-mastery-real-local.md) for the exact boundary, account roles, evidence locations and remaining human/content gates.

Local working branch: `feature/english-mastery-integration`, based on Smart Plan main `7eae600`. Native module, no SR/Firebase dependency. Original EMH and SR workspaces were not changed. Local tests use synthetic users/content-review fixtures only. Synthetic approvals exist only inside disposable test databases and are explicitly labelled; they never update imported source files or external systems.

## Acceptance mapping

| Local criterion | Implementation / evidence |
| --- | --- |
| Native shell and existing auth | Shared layout/header, host login/logout, requireUser, no duplicate identity; browser regression |
| RBAC/invitation | Explicit scoped grants, independent review/publish/audit, revoke on next request; DB + browser tests |
| Safe durable database boundary | Additive migration20, SQL-backed repository/RPC, actual local PostgreSQL RLS/CAS/rollback tests |
| 96 units / six pilots | Deterministic validation: 96 metadata, six canonical sources, twelve original/derivative versions; hashes verified |
| Governance/versioning | New immutable revisions, source retention, independent version-bound reviews, service + database release gate |
| Learner / remediation / retrieval | Lesson completion, contextual practice, deterministic exact answers, human-required productive work, review queue |
| Writing / mediation / online interaction | Shared productive session, planning, serialized autosave, append-only history, frozen rubric, final lock |
| Speaking privacy | Consent/real-policy requirement, private upload/playback, owner deletion, scoped reviewer access, expiry purge |
| Assessments / exam drafts | Pre-response snapshots, no readiness inflation, profile version frozen, server timing/sequential locks |
| Reviewer/admin | Review evidence/history/comparison, human rubric ratings, grant/revoke, import, draft profiles, audit/retention controls |
| Host compatibility | 30 offline suites including V3 domain/document/PDF contracts; auth and dashboard browser regression |
| TypeScript / lint / build | Dedicated commands, optimized production compilation with offline placeholders; final result below |
| Accessibility | Axe WCAG A/AA scans, mobile overflow check, semantic labels/focus/target sizes; not a full human WCAG certification |
| Restore safety | Local PostgreSQL dump/restore preserves content checksums and frozen attempts; real staging restore still required |

## Test commands and interpretation

`npm run test:release` runs typecheck → lint → SQL/domain tests (16 original cases plus four host-RPC hardening cases) + 30 host suites → content validate/dry-run/verify → offline production build → eight browser workflows (including two axe scans). `npm run test:a11y` runs the accessibility subset separately. See README for all commands.

The browser chain is browser → host Supabase SDK/cookies → real module API → Supabase HTTP contract double → actual PostgreSQL migration/RLS/transaction logic → UI. It is intentionally not described as a verified real Supabase deployment. Live Gemini/provider tests and historical post-migration scripts are not run against unspecified databases.

Final full-suite result: PASS on 2026-10-25 after the dependency update (`npm run test:release`, exit0). TypeScript and direct ESLint passed (four existing warnings); all 16 SQL/domain tests, all 30 host suites (including 47/47 PDF/export assertions), all three content commands, optimized production compilation and all eight browser workflows passed. Both WCAG axe scans returned zero violations, and browser tests reported no captured JavaScript, hydration or React errors. Content validation confirmed 96 metadata units, six canonical pilots and twelve source/derivative versions with verified checksums; all imported versions remain PRE_HUMAN_CONTENT_COMPLETE. This is local contract verification, not live-provider verification.

## Security and residual risk

Both `npm audit --omit=dev --json` and `npm audit --json` reported zero vulnerabilities on 2026-10-25. The resumed audit found a newly reported vulnerable nested Zod in Puppeteer's BiDi dependency; updating the existing compatible Puppeteer range resolved to puppeteer-core25.16.0 / chromium-bidi157.0.8090-0 / deduplicated Zod4.6.7. See [the Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Audit results describe the registry at verification time, not a guarantee against future vulnerabilities.

Four pre-existing host React hook warnings remain (dashboard, evaluator, Step9ReflectionEvidence, V3 editor). Lint exits successfully and new module code has no lint findings. No rule/type checking was weakened to hide failures. Existing stale document model test assertions were corrected to match the host's actual 13-section/KPA model, then all host suites were rerun.

Lint now invokes ESLint directly because `next lint` is deprecated. `.github/workflows/english-mastery.yml` repeats the local release suite on integration-branch pushes and main pull requests with Node24 and installed Chromium. It uses disposable local fixtures and no deployment credentials. The checked-in workflow is not evidence that a hosted CI run has passed; record that separately after GitHub executes it.

`typecheck` generates Next route types before invoking TypeScript, so a clean checkout does not depend on a previous local dev/build directory. Canonical Markdown is preserved byte-for-byte, including intentional trailing spaces used for Markdown line breaks; whitespace checks exclude only these source packages to preserve their checksums.

Hosted Linux verification passed on application commit `a00ff67af136cd5fa6fef5fc58cbee79cde3eb7a`: [GitHub Actions run40154735847](https://github.com/Distinycate/Smart-plan/actions/runs/40154735847). The first hosted run caught a WCAG target-size failure when the sticky host header obscured a scrolled mobile navigation link. The header now scrolls normally on mobile and remains sticky from the desktop breakpoint. The mobile regression explicitly scrolls the exam link and checks it is clear of the header before running the full axe scan; no accessibility rule was disabled. The full local release suite also passed again after this fix.

Follow-up local release verification also passed after adding the separately reviewed host-RPC candidate: 20/20 SQL/domain tests, 30/30 host suites, eight browser flows, content commands, lint, typecheck and build. The candidate remains unapplied remotely; see live readiness notes. Hosted CI for the follow-up is tracked on the PR.

## External release gates — NOT completed

- Vercel project/team access is now verified; Node24.x and existing production deployment protection were inspected. Integration-branch-specific Preview credentials are absent; existing Supabase/Gemini credentials target production and preview together. Do not reuse them for isolated EMH staging. Git linkage/root directory and exact preview release still require confirmation. See [live readiness findings and the local RPC patch](english-mastery-live-readiness.md).
- Provide/approve isolated Smart Plan Supabase staging configuration; audit existing host RLS/RPCs before new learner access.
- Supabase CLI2.122.0 login/init/link completed against the exact user-supplied project `tfvlkfmayxsgneyajhrl` (`SmartLessonPlan`, Distinycate's Org, Tokyo, ACTIVE_HEALTHY). The original connector lacks this project's grant, so the explicitly requested official CLI login was used. Inspection found 54 public tables with RLS enabled, no `emh_*` tables and no preview branches. The dashboard labels its main branch PRODUCTION. Only schema metadata was read; no domain migration, content import or learner-data write was performed. CLI tokens and `.temp` link metadata are excluded from Git.
- Isolated Supabase branching is not yet provisioned: the dashboard requires a Pro upgrade and quotes branch compute at $0.01344/hour while the branch exists (excluding applicable taxes). No upgrade, new paid project or branch was created. The user's chosen production project is linked for inspection, not relabelled as staging.
- Execute backed-up migration20, real login/session refresh, RLS, Storage and backup/restore verification, then content import/verify and least-privilege bootstrap.
- Deploy and smoke-test that exact preview commit. No live URL, production promotion or external migration is claimed.
- Obtain genuine academic/Thai/construct/level/fairness/key/copyright review, real audio production and technical/pronunciation QC, learner pilots and calibration/psychometric validation. None can be replaced by automated tests.
- Approve recording notice/retention and assign an operational cleanup schedule. Admin expiry deletion exists, but no external scheduler has been activated.
- Validate provider specifications and listening/replay behavior with approved audio before calling an exam profile ready. Current profiles remain DRAFT and all preview attempts remain ineligible for calibrated readiness.

The source content remains PRE_HUMAN_CONTENT_COMPLETE, AI is OFF and official CEFR certification is never claimed. The full migration is not complete until the real staging gates pass.
