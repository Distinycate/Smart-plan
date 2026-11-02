# Live release readiness — 2026-10-25

## Available without added subscription cost

An isolated persistent local runtime now runs real Supabase Auth/PostgreSQL/PostgREST/Storage, with a separate VM, synthetic accounts and loopback-only listeners. Four real-service browser flows passed, followed by a full VM stop/start and verification of browser login, previous attempts, writing history and deletion records. The prepared local app is usable without touching the main cloud database. See [operation and evidence](english-mastery-real-local.md). The full release regression also passed again: 22 SQL/domain cases, 30 host suites and eight contract-browser flows including two axe scans. The hosted staging gates below remain separate.

## Deployment access and isolation

Vercel access is restored for the existing Smart Plan project. Project/account identity, Next.js, Node24.x and deployment protection were verified. Its existing production deployment is READY; this is the old host deployment, not the new EMH integration.

Environment metadata was inspected without decryption. Existing host variables target both production and preview; no integration-branch-specific staging configuration was returned. Do not let the EMH preview inherit shared production credentials. Keep the integration branch's automatic deployment guard until a separate staging target is approved. No Vercel settings or secrets were changed.

The user-selected Supabase main branch is production, with no approved preview branch. Official CLI login and read-only metadata inspection work; the separately connected Supabase MCP account still lacks that project's grant. Provider diagnostics and detailed live findings are retained in the local delivery package, outside this public repository. No real business RPC, production migration, content import or learner/teacher data change was performed.

## Reviewed local RPC candidate — NOT applied remotely

`database/forward-migrations/20261025025057_harden_smart_plan_rpc_access.sql` was created with `supabase migration new`, then deliberately retained outside the CLI's automatic push directory. The EMH migration20 command does not run this candidate. Do not replay historical host migrations; some contain historical data deletion statements.

The candidate preserves existing lifecycle business-function bodies and binds the requested owner to the authenticated caller before privileged table access. It retains explicit trusted-server handling, fixes function search paths, limits server-only RPC grants to service_role, restricts the signup trigger helper, and keeps the current-user admin lookup required by host RLS. Authenticated SECURITY DEFINER entry points may be legitimate; eliminating every advisor warning is not the acceptance criterion.

Four disposable PostgreSQL tests exercise anonymous denial, foreign/missing JWT denial, owner finalization and frozen snapshot idempotency, trusted-server permissions, the host RLS helper, teaching/reflection lifecycle and remediation validation, search paths and reapplication without rewriting records. Synthetic IDs and stubbed server-only RPCs are used; these tests do not claim real-provider or complete host-security certification.

The full local release suite passed after the candidate: 20 SQL/domain cases, 30 host suites, eight browser workflows including two axe scans, all content checks, lint, TypeScript and optimized production compilation. Four existing host hook warnings remain.

Before applying the candidate anywhere: compare deployed definitions with reviewed source, capture and verify a recoverable backup, apply to an isolated staging target, exercise host and EMH flows, run provider advisors again and review remaining findings. A broader review of direct owner access, profile column privileges and host readiness enforcement remains part of staging sign-off. The candidate has not been applied remotely and this document does not authorize production application.

## Remaining infrastructure decision

The provider requires Pro for branching. [Supabase pricing](https://supabase.com/pricing) lists Pro from $25/month, additional compute/project charges and a Free limit of two active projects. The inspected branch dialog quotes compute at $0.01344/hour while a branch exists, before applicable tax. These are not a fixed all-inclusive bill or spending authorization.

No plan upgrade, paid project or branch was created. Obtain an approved separate staging target or have the user handle the desired plan upgrade and approve subsequent branch cost. Then configure branch-scoped Preview credentials, migrate and import there, verify real-provider flows and deploy the exact reviewed preview commit. Genuine content/audio review remains separate from automated software tests.
