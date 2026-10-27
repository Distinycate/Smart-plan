# Auth and role mapping (ADR-EMH-007)

Use Smart Plan `requireUser()` → Supabase `auth.getUser()` → existing profiles role. Do not use body.userId, unverified JWT claims, editable metadata, or a second identity. Existing host admin/user roles stay unchanged and confer no automatic EMH academic rights.

| Permission | Authority |
| --- | --- |
| english.learn | Allowed published content and own learning records |
| english.preview | Explicit pre-human access; never validated evidence |
| english.author | Scoped source-bound new content versions |
| english.review | Assigned units and review types; no self-review |
| english.publish | Only DB/service-gated eligible versions |
| english.manage_curriculum | Validate/import canonical packages, no publication |
| english.manage_assessments | Source-referenced draft exam profiles |
| english.audit_attempts | Scoped submitted attempt/rubric and audited audio access |
| english.manage_production | Existing-user grants, operational audit and retention |

Every grant has unit IDs or `*`; review grants also have review types. Self-grant and self-rating are denied. Membership is invite-only even though the host has public signup. Bootstrap grants only learn + manage_production to one explicitly approved existing UUID; it does not grant preview/academic/publisher powers. Have that operator invite independently assigned users through Administration. Removing access is done by an operator updating/revoking the scoped grant under the same audit process; no host identity deletion.

Before admitting learners, audit host-wide RLS because both modules share auth and database infrastructure. Module RLS cannot cure a pre-existing permissive policy on another host table.
