# Supabase integration and release checks

Uses existing Smart Plan SSR browser/server clients and a lazy server-only service client. Public URL + anon key are client configuration; SERVICE_ROLE_KEY is server-only, never NEXT_PUBLIC_. No DB project was created or production migration executed during implementation.

Migration `20_english_mastery.sql` adds 14 emh tables, FKs/indexes, immutable guards, serialized review/publication guards, owner RLS, private bucket and restrictive storage policy. `emh_commit` is SECURITY INVOKER with empty search_path, allowlisted table names and atomic expected-revision writes. PUBLIC/anon/authenticated cannot execute it. Authenticated users can read only their safe owner records; all domain mutation runs through verified server auth and permission checks. The storage restriction also defeats legacy permissive policies for this bucket.

Local SQL tests execute real PostgreSQL via PGlite with auth/storage schema fixtures. Browser tests exercise the real Supabase SDK against a test-only HTTP contract provider backed by that SQL database. This is NOT real GoTrue, deployed PostgREST, production Storage or provider integration verification.

Required real staging evidence:

1. Confirm project ref, approved region, quotas, owner and isolation from production; inspect all existing RLS and RPC grants first.
2. Apply only migration20 after a verified backup/restore drill; existing migrations are not replayed.
3. Verify real login/logout/session refresh, revoked user handling and expired JWT rejection through Smart Plan.
4. Use two real test users to attempt cross-owner reads/writes, direct RPC calls, metadata-role escalation and forged owner IDs.
5. Verify raw answer keys/content/review notes never reach learner or unauthenticated requests.
6. Verify private bucket direct object URLs fail, signed URLs expire, reviewer scope works and deletion physically removes objects.
7. Configure an approved recording notice/retention policy and assign expiry cleanup execution. Do not invent a legal retention period.
8. Import/verify all 96 units and 106 versions (six original + six pilot derivatives + ninety current course drafts + four retained initial drafts). Zero publications unless humans actually review them.

No claim that free-tier capacity is sufficient indefinitely. No billing changes were made.
