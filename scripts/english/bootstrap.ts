import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  SupabaseRepository,
  ensure,
  insert,
} from "../../lib/english-mastery/repository";
async function main() {
  config({ path: ".env.local", quiet: true });
  const userId = z.string().uuid().parse(process.env.EMH_BOOTSTRAP_USER_ID);
  const commit = process.argv.includes("--commit");
  const permissions = ["english.learn", "english.manage_production"];
  if (!commit) {
    console.log(
      JSON.stringify({
        dryRun: true,
        userId,
        permissions,
        notice:
          "No identity creation, host role change, preview, reviewer or publisher grant.",
      }),
    );
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  ensure(
    process.env.EMH_ENV === "staging" &&
      url &&
      url === process.env.EMH_STAGING_SUPABASE_URL &&
      key,
    "EXPLICIT_STAGING_CONFIGURATION_REQUIRED",
  );
  const client = createClient(url, key, { auth: { persistSession: false } }),
    repo = new SupabaseRepository(client);
  const { data, error } = await client.auth.admin.getUserById(userId);
  ensure(!error && data.user?.id === userId, "EXISTING_HOST_USER_REQUIRED");
  ensure(
    !(await repo.list("permissions")).some(
      (r) => r.data.permission === "english.manage_production",
    ),
    "BOOTSTRAP_ALREADY_COMPLETE",
  );
  const changes = permissions.map((permission) =>
    insert("permissions", `${userId}:${permission}`, userId, {
      permission,
      units: ["*"],
      reviewTypes: [],
    }),
  );
  changes.push(
    insert("audit", randomUUID(), userId, {
      action: "OPERATOR_BOOTSTRAP",
      target: userId,
      createdAt: new Date().toISOString(),
    }),
  );
  await repo.commit(changes);
  console.log(
    "Staging operator provisioned. No content published; use scoped grants for other existing users.",
  );
}
main().catch((e) => {
  console.error(e.code || "BOOTSTRAP_FAILED");
  process.exitCode = 1;
});
