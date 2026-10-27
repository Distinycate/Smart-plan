# Data mapping

All new domain tables are prefixed `public.emh_`. Existing Smart Plan LessonPlans, UnitPlans, profiles and V3 records are not repurposed. Every owner UUID references the existing `auth.users` with ON DELETE RESTRICT.

| Domain | Table suffix | Lifecycle |
| --- | --- | --- |
| Curriculum | curriculum | 96 canonical metadata records |
| Scoped membership | permissions | Explicit existing-user grants; CAS updates |
| Content + source/checksum | content_versions | Immutable versions; stable_id/version unique |
| Publication | publications | Immutable, FK to content, DB review gate |
| Human review | reviews | Append-only, FK to content, reviewer/scope checked |
| Assessment/practice session | attempts | Frozen snapshot, CAS draft, final lock, content FK |
| Writing revisions | writing_versions | Append-only attempt FK |
| Spaced retrieval | review_queue | Owner + item version + schedule |
| Lesson completion | lesson_progress | Owner + content version + lesson |
| Private media | recordings | Attempt FK; exact object path, consent/policy/expiry/status |
| Productive scoring | ratings | Append-only human rubric + attempt FK |
| Provider simulation | exam_profiles | Immutable DRAFT specification |
| Audit | audit | Append-only actions, no response text or signed URL logs |
| Abuse control | rate_limits | Per-user minute counter, CAS |

Common row envelope: id, owner_id, JSONB data, revision, created_at. Generated indexed content/attempt/version keys add relational integrity. Content's canonical JSON hash survives JSONB key reordering. Raw source and answer keys remain server/reviewer-only; learner serialization is an explicit allowlist.

Original six 0.5 source packages are preserved separately from six 0.6 full-text derivatives. Canonical Markdown source checksums are verified on import. Neither set is HUMAN_CHECKED. Legacy abbreviated 0.5 cannot be published. No real learner records were copied.

Content authoring update, 2026-10-26: ninety original course drafts extend preview coverage to all 96 units, with 106 stored versions. Existing canonical/derivative bytes are preserved. See [content handoff](english-mastery-content-2026-10-26.md).
