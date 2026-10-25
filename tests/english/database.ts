import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  DomainError,
  TABLES,
  type Table,
  type Change,
  type Repository,
  type Row,
} from "../../lib/english-mastery/repository";
export const USERS = {
  learner: "00000000-0000-4000-8000-000000000001",
  other: "00000000-0000-4000-8000-000000000002",
  author: "00000000-0000-4000-8000-000000000003",
  reviewer: "00000000-0000-4000-8000-000000000004",
};
export async function database() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    CREATE SCHEMA storage; GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id text PRIMARY KEY,bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON storage.objects TO anon,authenticated,service_role;
    CREATE POLICY legacy_permissive ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
    CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text);
    CREATE TABLE public.\"LessonPlans\"(id text PRIMARY KEY,body text); INSERT INTO public.\"LessonPlans\" VALUES('untouched','existing host data');`);
  for (const id of Object.values(USERS))
    await db.query("INSERT INTO auth.users VALUES($1)", [id]);
  await db.exec(
    await readFile("database/migrations/20_english_mastery.sql", "utf8"),
  );
  return db;
}
export class SqlRepository implements Repository {
  constructor(public db: PGlite) {}
  async get(table: Table, id: string) {
    if (!TABLES.includes(table)) throw Error("TABLE");
    return (
      (
        await this.db.query<Row>(
          `SELECT id,owner_id,data,revision FROM emh_${table} WHERE id=$1`,
          [id],
        )
      ).rows[0] || null
    );
  }
  async list(table: Table, owner?: string) {
    if (!TABLES.includes(table)) throw Error("TABLE");
    return (
      await this.db.query<Row>(
        `SELECT id,owner_id,data,revision FROM emh_${table}${owner ? " WHERE owner_id=$1" : ""} ORDER BY id`,
        owner ? [owner] : [],
      )
    ).rows;
  }
  async commit(changes: Change[]) {
    try {
      await this.db.query("SELECT emh_commit($1::jsonb)", [
        JSON.stringify(changes),
      ]);
    } catch (e: any) {
      if (e.code === "23505" || e.message.includes("REVISION_CONFLICT"))
        throw new DomainError("REVISION_CONFLICT", 409);
      throw e;
    }
  }
}
