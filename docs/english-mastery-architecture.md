# Native Smart Plan × English Mastery

## Boundaries / ADR-EMH-003

`Smart Plan layout + login → /english → /api/english/[operation] → requireUser + explicit grants → EnglishService → SupabaseRepository → emh_commit → emh_*`

One Next application, one deployment, existing Supabase project and auth.users identity. No Firebase, second login, iframe, new ORM, or runtime in-memory store. `/english/author`, `/english/reviewer` and `/english/admin` are separate permission-checked workbenches, not separate apps. The test provider exists only under tests and is never imported into application code.

## Version / transaction design (ADR-EMH-004)

Content and exam profiles are append-only. Editorial revisions retain canonical source/provenance, increase semantic version, reset item-pool/audio validation, and require fresh reviews. Publication requires applicable review types, checksum match, independent named attestation and no blockers. PostgreSQL locks the content row while adding reviews or publishing, preventing stale approval races. Published records cannot be rewritten. Revisions do not change old attempts.

Before the first response, attempts freeze content checksum, item IDs/versions/prompts, blueprint/support mode, level-specific rubric, exact-match-or-human scoring policy, readiness policy and optional versioned exam profile. CAS revisions and atomic RPC commits prevent lost saves and partial final submission. Submitted attempts are immutable. Writing history is append-only. Sequential exam tasks lock previous/future answers server-side. Deadlines reject late saves; browser expiry submits the last server-saved response, with an explicit warning about unsaved text.

## Progress / academic limits (ADR-EMH-005)

Course completion, preview activity, skill evidence and readiness are separate. Retrieval schedules use mistakes, repetitions and confidence; remediation is attached to incorrect/omitted answers and human critical errors. Open productive work is PENDING_HUMAN, never auto-scored by word count. Preview attempts are never calibrated evidence. Readiness is NOT_ENOUGH_EVIDENCE until a real validation process exists. Provider profiles are versioned drafts; stored provider links are not proof of official endorsement. Listening audio and replay-limit validation remain release-gated pending real audio production/QC. No AI or official CEFR certification.

## Privacy (ADR-EMH-006)

Private bucket, 3 MB upload cap, MIME magic-byte validation, explicit consent and operator-approved retention policy. Owner or scoped human reviewer only; reviewer access is audited. Signed links expire after 60 seconds. Owner deletion and approved-expiry deletion disable access before object removal and are retry-safe. Expired objects cannot obtain new links. Admin retention batches delete at most 100 expired objects; a real operational schedule must be assigned before recording rollout. Own-data export includes attempts, writing history, progress, queue, ratings and recording metadata, not object paths or other users' records.

## Known scale boundary

Repository list operations page in 500-row batches and fail closed above 10,000 rows. Suitable for controlled pilot staging; replace broad lists with indexed scoped queries before larger rollout. This is not a performance/scalability validation claim.
