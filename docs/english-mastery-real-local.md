# Persistent isolated local testing

The prepared local runtime uses real Supabase Auth, PostgreSQL, PostgREST and private Storage. It has its own Colima VM (`emh-testing`), Docker socket, credentials, synthetic accounts and persistent volumes. It does not use the HTTP contract double and never connects to the linked cloud project. No paid resource is provisioned. Internet access is needed for initial dependency/image installation; the prepared app and database subsequently run locally.

The prepared runtime is a separate source copy, with `project_id = "smart-plan-emh-local"`, API `127.0.0.1:55321`, PostgreSQL `127.0.0.1:55322`, local mail viewer `127.0.0.1:55324` and app `127.0.0.1:3190`. A visible local environment banner distinguishes it. The dedicated Docker daemon defaults and bridge defaults bind published ports to loopback. Startup checks the actual macOS listeners, container project/workdir labels and daemon identity. It never changes the active Docker context.

## Operation on the prepared machine

Use the delivered start/stop `.command` files, or run these in the prepared runtime directory:

```sh
npm run local:start
npm run local:stop
```

Stopping preserves database and Storage volumes. Starting reuses them and does not replay schema or seed accounts. The runtime is not registered as an automatic login service. Keep the runtime folder and the `emh-testing` VM; deleting either can destroy local data. Closing a browser tab leaves the server running; use the stop command to release the VM's memory.

Local account credentials are in `.emh-local/บัญชีทดสอบ.md`, mode 0600. `learner` has learn/preview permission; `author` manages content but cannot review; `reviewer` can review but is not the creator; `other` has learn permission without preview. All host roles remain ordinary users. These are synthetic accounts, unrelated to production identities.

## Guarded initialization and verification

The setup scripts are for an explicitly provisioned isolated runtime, not a fresh clone or a cloud-linked checkout. They require the dedicated profile, matching labels, a private status file and local-only listeners. `local-schema.mjs` accepts no URL or project-ref argument and refuses an unrecognized nonempty database. The historical destructive baseline is used once only in the empty local database; each subsequent source migration is atomic and its hash recorded privately for safe resumption. Never replay this baseline against an existing system. Missing host RLS is enabled locally with no permissive replacement policies. Source reference teacher/school defaults are replaced with `LOCAL TEST`; no production export or user data is copied.

`local-accounts.ts` provisions real local Auth accounts, imports the checksum-verified 96-unit manifest and 12 original/derivative preview versions, and writes only local keys into `.env.local`. Service keys and credentials remain in private ignored files. The launcher rejects cloud links, unexpected ports, alternate Docker daemons, a mock-provider setting and AI credentials in local settings. It clears inherited Supabase/EMH/Gemini environment values before starting the app. No cloud deployment or production migration is part of this workflow.

```sh
npm run test:local:real
# After actually stopping and starting the prepared runtime:
node --import tsx scripts/english/local-persistence.ts
```

The four browser tests exercise real password login, lesson progress/practice, writing autosave/history/final lock, private Storage upload/signed playback/direct-access denial/delete, real JWT row isolation and forbidden RPC/publishing. They create only synthetic test data. The persistence check verifies the IDs recorded by the browser test, logs in again and finds the earlier attempt in the app. Evidence is stored privately under `.emh-local`; it is not published to this public repository.

## Content and recording limits

All 96 units now have complete preview text: six preserved pilot derivatives and ninety original course drafts. All 106 imported source/derivative/course versions remain `PRE_HUMAN_CONTENT_COMPLETE`. See [the content handoff](english-mastery-content-2026-10-26.md) for scope and pending human/audio review. There are no fabricated human reviews, publications, audio QC or CEFR certificates. Objective practice can score against its configured answer key; productive tasks await actual human review and AI scoring remains disabled.

Recordings use the explicitly labelled `LOCAL-TEST-ONLY` policy and one-day expiry for synthetic audio. This is not an approved institution-wide retention policy. Learners must consent and can delete immediately. The existing operator retention action must be run to remove expired files; elapsed time alone does not delete objects. Do not enter real learner data or voice until the real operator has approved the relevant policy and access model.

This local runtime makes isolated testing available without adding a subscription. A shared/public deployment remains a separate release requiring an isolated hosted database, appropriate credentials, human content review and an approved rollout. The primary cloud database and deployment are unchanged.
