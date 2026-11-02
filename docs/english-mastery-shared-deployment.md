# English Mastery inside Smart Plan

The owner selected the existing SmartLessonPlan project (`tfvlkfmayxsgneyajhrl`) on 2026-10-27. Deploy English Mastery at `/english` in the existing Vercel `smart-plan` application. No additional paid project, branch, AI provider, or plan upgrade is required.

Set `EMH_ENABLED=true` and `EMH_SELF_STUDY_ENABLED=true` on the intended deployment. Verified Smart Plan users receive only learner and draft-preview access. Explicit permission scopes and revocations override these defaults. This does not grant author, reviewer, publisher, or production-manager access and does not change host roles. Draft labels, publication review gates, private owner records and answer-key filtering remain enforced.

Before applying migration 20, save private schema/data backups, verify their restore locally, and record host table fingerprints. Apply only the additive EMH migration in a transaction with a short lock timeout. Import the validated 96-unit content with the existing host administrator as provenance owner, leaving every version in `PRE_HUMAN_CONTENT_COMPLETE` and publications empty. Compare host table fingerprints and existing schema/policies after migration. Never run the host schema reset or replay older migrations.

Recording upload remains unavailable until an explicit retention policy and cleanup operation are configured. Text lessons, practice, writing, saved progress and resume remain usable. AI scoring is disabled. Content remains a self-study preview awaiting human review, not a certified assessment.

Rollback: disable the two EMH flags and redeploy the last verified application. Keep EMH records for recovery. Do not drop tables, reset Auth, or restore a shared database over newer host data.
