# Smart Plan System QA Checklist

## 1. Environment Test
- [ ] `npm install`
- [ ] `npm run dev`
- [ ] `npm run build`
- [ ] check localhost:3000
- [ ] check environment variables

## 2. Dashboard Test
- [ ] load dashboard
- [ ] search plan
- [ ] filter by grade
- [ ] filter by subject
- [ ] filter by semester
- [ ] filter by status
- [ ] clear filter
- [ ] open existing plan
- [ ] create new plan
- [ ] archive plan
- [ ] restore archived plan if implemented

## 3. Create Plan Test
- [ ] create draft with minimum required fields
- [ ] create complete plan with all required fields
- [ ] verify validation messages
- [ ] verify default teacher/school data
- [ ] verify subject/unit/topic dropdowns
- [ ] verify EFL supplemental topics

## 4. Edit Plan Test
- [ ] open existing plan
- [ ] edit K/P/A objectives
- [ ] edit learning process
- [ ] edit assessment
- [ ] edit rubric K/P/A
- [ ] save changes
- [ ] reopen plan and verify data remains

## 5. AI Autofill Test
- [ ] use Gemini Magic Autofill
- [ ] verify 35 fields are generated
- [ ] verify K/P/A data
- [ ] verify learning process
- [ ] verify assessment
- [ ] verify rubric
- [ ] check error handling when AI fails

## 6. Preview Test
- [ ] open A4 preview
- [ ] test zoom 75%, 90%, 100%, 125%, 150%
- [ ] verify TH Sarabun New
- [ ] verify header format
- [ ] verify section order 1-10
- [ ] verify assessment table
- [ ] verify rubric table
- [ ] verify signature page break

## 7. Word Export Test
- [ ] export Word
- [ ] open file in Microsoft Word or compatible editor
- [ ] verify font
- [ ] verify layout
- [ ] verify Thai text
- [ ] verify table formatting
- [ ] verify rubric appears as table

## 8. PDF Export / Print Test
- [ ] open preview
- [ ] click print
- [ ] save as PDF
- [ ] verify A4 layout
- [ ] verify page breaks
- [ ] verify signature section

## 9. Archive / Backup Test
- [ ] archive a plan
- [ ] verify planStatus = archived
- [ ] verify backup created in LessonPlan_Backup
- [ ] verify archived plan is hidden
- [ ] verify restore if implemented

## 10. Security Test
- [ ] input HTML tags in text fields
- [ ] input script tag
- [ ] check preview page
- [ ] check Word export
- [ ] verify content is escaped or sanitized
- [ ] verify no script executes

## 11. Regression Test
- [ ] existing save still works
- [ ] existing edit still works
- [ ] existing export still works
- [ ] existing AI still works
- [ ] existing dashboard still works
