// Local-only baseline reconstruction. Never accepts a URL, project ref or cloud link.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { localRuntime } from './local-guard.mjs';
const r = localRuntime();
const progressFile = path.join(r.state, 'schema-progress.json');
const files = ['schema.sql', ...[
  '001_add_rubric_columns', '002_future_safe_template', '01_auth_roles', '02_update_profiles',
  '03_feedbacks', '04_ai_enhancements', '05_unit_planning_v2_foundation', '06_ai_jobs_concurrency_queue',
  '07_unit_lesson_sequence', '08_ai_evaluation_jobs', '09_lesson_plan_quality_platform',
  '10_patch_jobs_and_enhancements', '11_evaluation_schema_sync',
  '12_security_identity_authorization_foundation', '13_canonical_ai_request_admission',
  '14_lessonplans_rls_defense_in_depth', '15_smart_plan_v3_domain_foundation',
  '16_smart_plan_v3_curriculum_links', '17_smart_plan_v3_assessment_activity_links',
  '18_smart_plan_v3_finalization_hardening', '19_smart_plan_v3_post_teaching_evidence',
  '20_english_mastery'].map(n => `migrations/${n}.sql`),
  'forward-migrations/20261025025057_harden_smart_plan_rpc_access.sql'];
let progress = existsSync(progressFile) ? JSON.parse(readFileSync(progressFile, 'utf8')) : {};
if (!Object.keys(progress).length && r.sql("select count(*) from pg_tables where schemaname='public';").trim() !== '0')
  throw Error('EMPTY_LOCAL_DATABASE_REQUIRED');
for (const file of files) {
  const source = readFileSync(path.join(r.root, 'database', file), 'utf8');
  const hash = createHash('sha256').update(source).digest('hex');
  if (progress[file]) {
    if (progress[file] !== hash) throw Error(`SOURCE_CHANGED:${file}`);
    continue;
  }
  // Each source file is atomic. Remove only standalone outer transaction delimiters.
  const body = source.replace(/^(?:BEGIN|COMMIT);\s*$/gm, '');
  r.sql(`BEGIN; SET LOCAL search_path=public,extensions;\n${body}\nCOMMIT;`);
  progress[file] = hash;
  writeFileSync(progressFile, JSON.stringify(progress, null, 2), { mode: 0o600 });
  console.log(`Local schema applied: ${file}`);
}
// Local baseline contains reference defaults, never production account records.
r.sql(`BEGIN;
UPDATE public."AppConfig" SET "configValue"='' WHERE "configKey" ~* '(key|token|secret|password)';
UPDATE public."AppConfig" SET "configValue"='LOCAL TEST' WHERE "configKey" IN ('teacherName','schoolName','organization');
DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables
  WHERE schemaname='public' AND NOT rowsecurity LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename);
END LOOP; END $$;
NOTIFY pgrst, 'reload schema'; COMMIT;`);
console.log('Local schema ready; cloud databases were not contacted.');
