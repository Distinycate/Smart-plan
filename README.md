# Smart Plan × English Mastery Hub

Existing Smart Plan application with a native English Mastery module at `/english`. Uses the same Supabase identity, application shell and Vercel deployment. Original EMH/SR projects are not modified. No AI scoring, automatic publication or official CEFR certification.

## Development

Node24, npm and Chromium for browser tests:

```sh
npm ci
npx playwright install chromium
# Fully local, ephemeral TEST FIXTURES only; no external credentials:
npm run dev:english:local
```

Open `http://127.0.0.1:3188/login`. Test users: `learner@example.test`, `author@example.test`, `reviewer@example.test`; password `local-fixture-password`. These are local fixtures only, not real accounts or Supabase verification. Ctrl+C stops both servers; test data is discarded. Do not upload personal data.

For real staging development, securely configure `.env.local` using `.env.example`, perform the staging runbook, then `npm run dev`. There is no production fallback login or in-memory production database.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:a11y
npm run content:validate
npm run content:import -- --dry-run
npm run content:verify
npm run db:validate
npm run build:offline
npm run test:release
npm audit --omit=dev
```

`build:offline` is compilation with deliberately invalid local credentials, not provider verification. `npm run build && npm start` uses configured real environment variables. `test:release` includes the full safe local suite; live AI, real migration and provider-auth tests are excluded until an explicitly approved staging environment exists. No tests write production data.

GitHub Actions runs the same release suite for the integration branch and pull requests to main. It installs Chromium for both PDF regression and browser tests; no Supabase or Vercel secrets are needed for this local contract suite.

## Migrations / content / staging

See [migration runbook](docs/english-mastery-migration-plan.md) for `db:migrate -- --apply --ack-backup`, content import/verify `--remote`/`--commit`, and one-time `emh:bootstrap -- --commit`. Default commands are dry-run/local. Remote commands require explicit same-project staging configuration. Never replay old host migrations.

Deployment remains gated: [Vercel runbook](docs/english-mastery-vercel.md). Integration-branch automatic deploy is disabled until preview variables and database isolation are verified. No production promotion is included.

The Supabase CLI has also been initialized locally. Use `npx --yes supabase@2.122.0 login`, then `npx --yes supabase@2.122.0 link --project-ref tfvlkfmayxsgneyajhrl` when inspection of the user-selected SmartLessonPlan project is needed. That project's main branch is production, not an approved staging target. Linking alone does not migrate the database. CLI `.temp` metadata and login tokens must remain outside Git; the reviewed module migration stays under `database/migrations/20_english_mastery.sql` and is not automatically replayed by local CLI setup.

## Documentation

- [Audit and security-driven upgrade](docs/english-mastery-integration-audit.md)
- [Architecture and ADRs](docs/english-mastery-architecture.md)
- [Data mapping](docs/english-mastery-data-mapping.md)
- [Role mapping](docs/english-mastery-role-mapping.md)
- [Supabase / real-provider checks](docs/english-mastery-supabase.md)
- [Verification and remaining release gates](docs/english-mastery-integration-verification.md)
- [Live access, staging isolation and reviewed RPC candidate](docs/english-mastery-live-readiness.md)
