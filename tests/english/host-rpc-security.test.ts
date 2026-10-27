import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const lesson = "00000000-0000-4000-8000-000000000003";
const migration = "database/forward-migrations/20261025025057_harden_smart_plan_rpc_access.sql";

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
    CREATE TABLE public.v3_lesson_plans(id uuid PRIMARY KEY,user_id uuid,status text,updated_at timestamptz);
    CREATE TABLE public.v3_plan_versions(id uuid DEFAULT gen_random_uuid(),lesson_plan_id uuid,
      version_number integer,label text,snapshot jsonb,created_by uuid,created_at timestamptz);
    CREATE TABLE public.v3_post_teaching_records(id uuid DEFAULT gen_random_uuid(),lesson_plan_id uuid UNIQUE,
      taught_at timestamptz,actual_duration_minutes integer,students_total integer,
      students_present integer,students_absent integer,students_assessed integer,students_passed integer,
      students_need_support integer,actual_teaching_notes text,session_metadata jsonb,
      reflection text,remediation_plan text,problems text,adjustments_made text,feedback_given text,
      what_worked text,next_lesson_adjustment text,created_at timestamptz,updated_at timestamptz);
    CREATE FUNCTION public.admit_canonical_ai_request(uuid,text,integer,integer,integer) RETURNS integer
      LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;
    CREATE FUNCTION public.claim_ai_job(uuid,integer,integer) RETURNS integer
      LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;
    CREATE FUNCTION public.reorder_unit_lessons(varchar,uuid,text[]) RETURNS integer
      LANGUAGE sql SECURITY DEFINER AS $$ SELECT 1 $$;
    CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
    CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;
    CREATE FUNCTION public.prevent_final_version_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
    CREATE FUNCTION public.prevent_final_lesson_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon,authenticated;
  `);
  await db.query("INSERT INTO v3_lesson_plans VALUES($1,$2,'REVIEWED',now())", [lesson, owner]);
  await db.exec(await readFile(migration, "utf8"));
  return db;
}

async function caller(db: PGlite, role: string, uid = "") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [uid]);
  assert.ok(["anon", "authenticated", "service_role"].includes(role));
  await db.exec(`SET ROLE ${role}`);
}

test("host RPC hardening denies anonymous and foreign-owner finalization before mutation", async () => {
  const db = await fixture();
  try {
    const sql = "SELECT public.finalize_v3_lesson($1,$2,'{}'::jsonb)";
    await caller(db, "anon");
    await assert.rejects(db.query(sql, [lesson, owner]), (e: any) => e.code === "42501");
    await caller(db, "authenticated", other);
    for (const name of ["finalize_v3_lesson", "record_v3_teaching", "record_v3_reflection"])
      await assert.rejects(db.query(`SELECT public.${name}($1,$2,'{}'::jsonb)`, [lesson, owner]),
        (e: any) => e.code === "42501" && e.message.includes("RPC_ACTOR_MISMATCH"));
    await caller(db, "authenticated");
    await assert.rejects(db.query(sql, [lesson, owner]), (e: any) => e.code === "42501");
    await db.exec("RESET ROLE");
    assert.equal((await db.query<any>("SELECT status FROM v3_lesson_plans")).rows[0].status, "REVIEWED");
    assert.equal((await db.query<any>("SELECT count(*)::integer AS n FROM v3_plan_versions")).rows[0].n, 0);
  } finally { await db.close(); }
});

test("authenticated owner retains atomic finalization and idempotent frozen snapshot", async () => {
  const db = await fixture();
  try {
    await caller(db, "authenticated", owner);
    const sql = "SELECT public.finalize_v3_lesson($1,$2,'{\"documentSourceHash\":\"test-only\"}'::jsonb) AS result";
    const first = (await db.query<any>(sql, [lesson, owner])).rows[0].result;
    const second = (await db.query<any>(sql, [lesson, owner])).rows[0].result;
    assert.equal(first.success, true);
    assert.equal(first.isDuplicate, false);
    assert.equal(second.isDuplicate, true);
    assert.equal(first.version_id, second.version_id);
    await db.exec("RESET ROLE");
    assert.equal((await db.query<any>("SELECT count(*)::integer AS n FROM v3_plan_versions")).rows[0].n, 1);
  } finally { await db.close(); }
});

test("service RPCs reject both browser roles while trusted server and host RLS helper work", async () => {
  const db = await fixture();
  try {
    const calls = [
      "SELECT public.admit_canonical_ai_request($1,'TEST',1,1,75)",
      "SELECT public.claim_ai_job($1,1,75)",
      "SELECT public.reorder_unit_lessons('TEST',$1,ARRAY['TEST']::text[])",
    ];
    for (const role of ["anon", "authenticated"]) {
      await caller(db, role, owner);
      for (const sql of calls)
        await assert.rejects(db.query(sql, [owner]), (e: any) => e.code === "42501");
    }
    await caller(db, "service_role");
    for (const sql of calls) assert.equal((await db.query(sql, [owner])).rows.length, 1);
    const result = await db.query<any>("SELECT public.finalize_v3_lesson($1,$2,'{}'::jsonb) AS result", [lesson, owner]);
    assert.equal(result.rows[0].result.success, true);
    await caller(db, "authenticated", owner);
    assert.equal((await db.query<any>("SELECT public.is_admin() AS admin")).rows[0].admin, false);
    await db.exec("RESET ROLE");
    const rows = (await db.query<any>("SELECT proname,proconfig FROM pg_proc WHERE proname IN ('finalize_v3_lesson','record_v3_teaching','record_v3_reflection','prevent_final_version_mutation','prevent_final_lesson_mutation')")).rows;
    assert.equal(rows.length, 5);
    for (const r of rows) assert.match(r.proconfig.join(" "), /search_path=pg_catalog, public, pg_temp/);
    await db.exec(await readFile(migration, "utf8")); // Safe to reapply; never rewrite teacher data.
    assert.equal((await db.query<any>("SELECT count(*)::integer AS n FROM v3_plan_versions")).rows[0].n, 1);
  } finally { await db.close(); }
});

test("owner teaching and reflection retain lifecycle and remediation validation", async () => {
  const db = await fixture();
  try {
    await caller(db, "authenticated", owner);
    await db.query("SELECT public.finalize_v3_lesson($1,$2,'{}'::jsonb)", [lesson, owner]);
    const teaching = {students_total: 2, students_passed: 1, students_need_support: 1,
      students_present: 2, students_absent: 0, students_assessed: 2, actual_duration_minutes: 60};
    const taught = (await db.query<any>("SELECT public.record_v3_teaching($1,$2,$3::jsonb) AS result",
      [lesson, owner, JSON.stringify(teaching)])).rows[0].result;
    assert.equal(taught.status, "TAUGHT");
    await assert.rejects(db.query("SELECT public.record_v3_reflection($1,$2,$3::jsonb)",
      [lesson, owner, JSON.stringify({reflection: "TEST ONLY", remediation_plan: ""})]),
      (e: any) => e.code === "22000");
    const reflected = (await db.query<any>("SELECT public.record_v3_reflection($1,$2,$3::jsonb) AS result",
      [lesson, owner, JSON.stringify({reflection: "TEST ONLY", remediation_plan: "TEST ONLY: targeted support"})])).rows[0].result;
    assert.equal(reflected.status, "REFLECTED");
    await db.exec("RESET ROLE");
    assert.equal((await db.query<any>("SELECT status FROM v3_lesson_plans")).rows[0].status, "REFLECTED");
    assert.equal((await db.query<any>("SELECT count(*)::integer AS n FROM v3_post_teaching_records")).rows[0].n, 1);
  } finally { await db.close(); }
});
