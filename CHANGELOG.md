# Changelog

## [2024-xx-xx] - 7-Agent System Upgrades
### Added
- **Restore Archived Plan**: Added frontend tab and `PATCH /api/plans/[id]/restore` to recover archived plans.
- **QA Checklist**: Added `QA_CHECKLIST.md` covering 11 testing scenarios.
- **Safe Database Migrations**: Added `database/migrations` structure to prevent destructive changes in production.
- **Security Enhancements**: Added `escapeHtml` to Word Export API (`app/api/plans/[id]/export/word/route.ts`) to prevent XSS vulnerabilities from AI/User input.

### Fixed
- Fixed potential XSS vulnerabilities in the Word document export flow.
- Improved database schema documentation and safety warnings.
