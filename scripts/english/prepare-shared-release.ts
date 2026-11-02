// Generates reviewable SQL files only; never connects to a database.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { importPackages } from "../../lib/english-mastery/content";
import type { Change, Repository } from "../../lib/english-mastery/repository";

async function main() {
  const actor = z.string().uuid().parse(process.env.EMH_IMPORT_ACTOR_ID);
  const out = process.argv[2];
  if (!out || !path.isAbsolute(out)) throw Error("ABSOLUTE_OUTPUT_DIRECTORY_REQUIRED");
  await mkdir(out, { recursive: true, mode: 0o700 });
  let changes: Change[] = [];
  const collector: Repository = {
    async get() { return null; },
    async list() { return []; },
    async commit(batch) { changes = batch; },
  };
  const report = await importPackages(collector, actor, false);
  const migration = await readFile("database/migrations/20_english_mastery.sql", "utf8");
  await writeFile(path.join(out, "migration.sql"), migration.replace("BEGIN;",
    "BEGIN;\nSET LOCAL lock_timeout = '3s';\nSET LOCAL statement_timeout = '60s';"), { mode: 0o600 });
  const literal = JSON.stringify(changes).replaceAll("'", "''");
  const sql = `BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id='${actor}' AND role='admin')
    THEN RAISE EXCEPTION 'EXISTING_HOST_ADMIN_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM public.emh_content_versions)
    THEN RAISE EXCEPTION 'INITIAL_IMPORT_ALREADY_PRESENT'; END IF;
END $$;
SELECT public.emh_commit('${literal}'::jsonb);
COMMIT;
`;
  await writeFile(path.join(out, "content.sql"), sql, { mode: 0o600 });
  console.log(JSON.stringify({ ...report, execution: "FILES_ONLY", publications: 0 }));
}
main().catch(() => { console.error("RELEASE_PREPARATION_FAILED"); process.exitCode = 1; });
