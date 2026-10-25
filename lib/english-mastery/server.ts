import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/authorization";
import { SupabaseRepository, ensure } from "./repository";
import type { Actor, Grant } from "./policy";
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  ensure(url && key, "EMH_CONFIGURATION_REQUIRED", 503);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function context() {
  ensure(process.env.EMH_ENABLED === "true", "MODULE_NOT_ENABLED", 404);
  const host = await requireUser();
  const client = serviceClient();
  const repository = new SupabaseRepository(client);
  const rows = await repository.list("permissions", host.user.id);
  const actor: Actor = {
    id: host.user.id,
    grants: rows
      .filter((row) => !row.data.revokedAt)
      .map((row) => row.data as Grant),
  };
  ensure(actor.grants.length > 0, "EMH_INVITATION_REQUIRED", 403);
  return { actor, repository, client };
}
