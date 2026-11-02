# Complete text authoring: A1–C2, 26 October 2026

The curriculum now has complete preview text for all 96 units, sixteen per level. The six canonical 0.5 source packages and their six 0.6 derivatives remain unchanged. Ninety additional original course manuscripts use version 0.1.0, with four corrected units at 0.1.1. Four initial local drafts remain in `course-history/` because imports and attempts are immutable. The correction prevents lexical retrieval from matching a substring inside a different word (for example, member inside remembers). There are 106 immutable content-version records and 96 current unit drafts.

Current payload totals: **389 lessons, 1,950 practice items, 384 productive tasks and 2,954 vocabulary/phrase entries**. Vocabulary totals include deliberate spiral review; they are not unique lexeme counts. Each new unit contains four lessons, two reading inputs, two authored listening scripts, fifteen contextual target expressions plus fifteen review entries, three form/use/example models, twenty practice items, four productive tasks, a rubric, spaced retrieval and remediation.

## Reviewable sources

- [Full manuscript index](../content/english-mastery/course-manuscripts/README.md) — 96 reviewer copies, including reference answers.
- [Coverage CSV](../content/english-mastery/course-coverage.csv) — per-unit counts and version.
- [Authoring report](../content/english-mastery/course-authoring-report.json) — new-unit hashes and structural coverage.
- `content/english-mastery/authored/A1.json` through `C2.json` — original unit-specific texts, lexical senses, grammar models and comprehension references.
- `authored/level-support.json` — shared level guidance and explicitly labelled spiral review.
- `course/` — generated import payloads. Do not edit generated payloads independently of the manuscript.

`npm run content:build` deterministically regenerates the new payloads and all reviewer manuscripts. `npm run content:validate` checks complete coverage, manifest identity, source and package checksums, source-linked lexical examples, reference IDs, item identity and truthful review status. Automated checks cannot establish academic validity or CEFR alignment.

## Instruction and assessment status

All content remains `PRE_HUMAN_CONTENT_COMPLETE`. New inputs are AI-assisted original fictional classroom materials. CEFR serves as framework orientation; no external validation, calibration, named human review or learner pilot is claimed. This round completes text authoring at the user's explicit request; it does not bypass the separate human-review/publication gate.

Listening scripts are authored, but recorded assets and audio QC are pending. Teacher/partner reading can support practice. Transcript comprehension is labelled text-supported reading and must not be counted as independent listening evidence. Free responses and productive tasks need actual human judgement; reference answers are examples rather than exact-match keys. The twelve lexical retrieval items in each new unit have explicit exact-expression keys.

The reviewer should check language, Thai explanations, source fidelity, item ambiguity, target-level appropriateness, construct validity, fairness and rights. Audio and pronunciation review follows audio production. Record actual reviewer identity, version and date. A complete manuscript is not an approved course or a CEFR certificate.

## Isolated operation

Use the existing real local runtime at `http://127.0.0.1:3190/login`. `npm run content:local` refuses a cloud-linked or non-loopback runtime, imports only missing versions, verifies every stored payload and checks that pre-existing versions, attempts, writing history, reviews and publications remain unchanged. It does not create accounts, change permissions, publish content or change schemas. Credentials remain in the private local-runtime folder.

There are no new paid resources, cloud migrations, production imports, deployments or UX/UI redesigns in this content round. Only factual coverage copy and content support are updated in the interface. The app's draft preview permission still applies to all units.

## Verification completed

On 26 October 2026, guarded import verified 106 source/current/historical versions and preserved every existing content row, attempt, writing-history row, review and publication. Real local browser verification passed five workflows, including resolving all 96 unit IDs to complete preview payloads, rendering a representative new unit at each of six levels, and scoring a new A1 lexical item. The original practice, writing, private Storage and access-control workflows also passed. No reviews or publications were manufactured.

The automated domain suite passes 28 cases, including complete coverage, source tampering, fabricated review status, missing listening inputs, unsupported answer keys, duplicate IDs and full-word lexical extraction. The source checksum and content checksum are separate from educational validation. The four historical course drafts are retained for traceability; the learner route selects their corrected 0.1.1 versions.

Final `npm run test:release` passed (exit 0): TypeScript, lint, 28 domain/SQL checks, 30 host suites including 47/47 PDF/export assertions, content validation/import dry-run/verification, optimized build and eight browser workflows including two axe scans. Four pre-existing React hook warnings remain.
