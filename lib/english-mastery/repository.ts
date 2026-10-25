import type { SupabaseClient } from "@supabase/supabase-js";

export const TABLES = [
  "curriculum",
  "permissions",
  "content_versions",
  "publications",
  "reviews",
  "attempts",
  "writing_versions",
  "review_queue",
  "lesson_progress",
  "recordings",
  "ratings",
  "exam_profiles",
  "audit",
  "rate_limits",
] as const;
export type Table = (typeof TABLES)[number];
export type Json = Record<string, any>;
export interface Row {
  id: string;
  owner_id: string | null;
  data: Json;
  revision: number;
}
export interface Change {
  table: Table;
  id: string;
  owner: string | null;
  data: Json;
  expected: number;
}
export interface Repository {
  get(table: Table, id: string): Promise<Row | null>;
  list(table: Table, owner?: string): Promise<Row[]>;
  commit(changes: Change[]): Promise<void>;
}
export class DomainError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function ensure(
  condition: unknown,
  code: string,
  status = 400,
): asserts condition {
  if (!condition) throw new DomainError(code, status);
}
export const insert = (
  table: Table,
  id: string,
  owner: string | null,
  data: Json,
): Change => ({ table, id, owner, data, expected: -1 });
export const update = (table: Table, row: Row, data: Json): Change => ({
  table,
  id: row.id,
  owner: row.owner_id,
  data,
  expected: row.revision,
});

export class SupabaseRepository implements Repository {
  constructor(private db: SupabaseClient) {}
  async get(table: Table, id: string) {
    const { data, error } = await this.db
      .from(`emh_${table}`)
      .select("id,owner_id,data,revision")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new DomainError("DATABASE_UNAVAILABLE", 503);
    return data as Row | null;
  }
  async list(table: Table, owner?: string) {
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = this.db
        .from(`emh_${table}`)
        .select("id,owner_id,data,revision")
        .order("id")
        .range(offset, offset + 499);
      if (owner) query = query.eq("owner_id", owner);
      const { data, error } = await query;
      if (error) throw new DomainError("DATABASE_UNAVAILABLE", 503);
      rows.push(...(data as Row[]));
      if (data.length < 500) return rows;
      ensure(rows.length < 10000, "RESULT_LIMIT_USE_ARCHIVE", 413);
    }
  }
  async commit(changes: Change[]) {
    const { error } = await this.db.rpc("emh_commit", { changes });
    if (error) {
      if (
        error.code === "23505" ||
        error.message?.includes("EMH_REVISION_CONFLICT")
      )
        throw new DomainError("REVISION_CONFLICT", 409);
      throw new DomainError("DATABASE_WRITE_REJECTED", 503);
    }
  }
}
