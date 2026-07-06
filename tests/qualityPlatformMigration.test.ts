import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'database/migrations/09_lesson_plan_quality_platform.sql'
);
const sql = readFileSync(migrationPath, 'utf8');

const tables = [
  'evaluation_jobs',
  'evaluation_results',
  'lesson_plan_issues',
  'lesson_plan_versions',
  'lesson_plan_patches',
  'evaluation_cache',
];

for (const table of tables) {
  assert.match(
    sql,
    new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, 'i'),
    `missing additive table ${table}`
  );
  assert.match(
    sql,
    new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'),
    `missing RLS enablement for ${table}`
  );
}

assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN)\b/i);
assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
assert.doesNotMatch(sql, /ALTER\s+TABLE\s+public\."LessonPlans"/i);

assert.match(sql, /lesson_plan_id VARCHAR\(255\)/);
assert.match(sql, /REFERENCES public\."LessonPlans"\("planId"\)/);
assert.match(sql, /lesson_plan_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
assert.match(sql, /'lesson_plan_basic', 'wpa_w9', 'committee_4d'/);
assert.match(sql, /progress BETWEEN 0 AND 100/);
assert.match(sql, /score >= 0 AND score <= max_score/);
assert.match(sql, /UNIQUE \(lesson_plan_hash, evaluation_mode\)/);
assert.match(sql, /idx_evaluation_jobs_hash_mode/);
assert.match(sql, /idx_evaluation_results_job_section/);
assert.match(sql, /idx_lesson_plan_issues_plan_status/);
assert.match(sql, /idx_lesson_plan_versions_plan_version/);
assert.match(sql, /idx_lesson_plan_patches_plan_created/);
assert.match(sql, /idx_evaluation_cache_expires_at/);
assert.match(sql, /set_evaluation_jobs_updated_at/);
assert.match(sql, /2\.2\.0-quality-platform-phase2/);

console.log('quality platform migration static tests passed');
