# Staging migration and rollback runbook

## Preparation

Use a clean clone of the integration branch, Node24 and `npm ci`. Configure `.env.local` from `.env.example` using secure local editing, never paste secrets into chat or commit them. Confirm `EMH_ENV=staging`, `NEXT_PUBLIC_SUPABASE_URL=EMH_STAGING_SUPABASE_URL`, server key, same-project TLS `EMH_STAGING_DATABASE_URL`, approved existing `EMH_IMPORT_ACTOR_ID` and `EMH_BOOTSTRAP_USER_ID`. Host schema/auth must already exist.

Backup existing schema/data/roles and storage inventory; record counts/hashes of existing host tables. Restore into an isolated disposable staging target and verify counts plus host login/plans/export before proceeding. Keep backup secrets/data outside Git and logs. The local PGlite restore test verifies only the EMH migration fixture, not a Supabase production backup.

## Exact commands

```sh
npm ci
npm run db:validate
npm run db:migrate
# Only after target and backup are explicitly approved:
npm run db:migrate -- --apply --ack-backup
npm run content:validate
npm run content:import -- --remote --dry-run
npm run content:import -- --commit
npm run content:verify -- --remote
npm run emh:bootstrap
npm run emh:bootstrap -- --commit
```

`psql` must be installed for the apply command. The migration is intentionally apply-once: it fails if domain tables/bucket already exist, preventing silent schema overwrite. Never delete/recreate a database to make it pass. Investigate existing state and create a separately reviewed forward migration instead. Import is idempotent and fails on same-version content differences. Bootstrap refuses when an operator already exists.

## Rollback

Set EMH_ENABLED=false on the affected environment and redeploy the previous verified application commit. Preserve emh data and existing host tables. Do not DROP tables, replay old migrations, reset auth, or restore a full shared database over current learner/teacher data. A data restore is a separately approved incident operation with exact target and backup validation. For content corrections, create a new immutable version; never rewrite frozen attempt evidence.
