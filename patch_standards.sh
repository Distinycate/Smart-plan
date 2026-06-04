#!/bin/bash
# Patch lib/subjectStandardsData.ts
sed -i '' 's/`${s.code} ${s.text}`/`มาตรฐาน ${s.code} ${s.text}`/g' lib/subjectStandardsData.ts
