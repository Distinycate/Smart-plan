import { spawnSync } from "node:child_process";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const file = "database/migrations/20_english_mastery.sql";
if (!process.argv.includes("--apply")) {
  console.log(
    `DRY RUN: apply only ${file}; no legacy migrations replayed. Requires --apply --ack-backup and approved staging configuration.`,
  );
} else {
  const {
    EMH_ENV,
    EMH_STAGING_DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL,
    EMH_STAGING_SUPABASE_URL,
  } = process.env;
  if (
    EMH_ENV !== "staging" ||
    !EMH_STAGING_DATABASE_URL ||
    !NEXT_PUBLIC_SUPABASE_URL ||
    NEXT_PUBLIC_SUPABASE_URL !== EMH_STAGING_SUPABASE_URL ||
    !process.argv.includes("--ack-backup")
  )
    throw Error("EXPLICIT_STAGING_AND_BACKUP_ACK_REQUIRED");
  const db = new URL(EMH_STAGING_DATABASE_URL),
    api = new URL(NEXT_PUBLIC_SUPABASE_URL),
    ref = api.hostname.split(".")[0];
  if (
    api.protocol !== "https:" ||
    !api.hostname.endsWith(".supabase.co") ||
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    (!db.hostname.includes(ref) &&
      !decodeURIComponent(db.username).endsWith(`.${ref}`))
  )
    throw Error("STAGING_PROJECT_REFERENCE_MISMATCH");
  if (
    !["verify-full", "verify-ca", "require"].includes(
      db.searchParams.get("sslmode") || "",
    )
  )
    throw Error("TLS_CONNECTION_REQUIRED");
  // Pass connection secret via environment, not command-line arguments or logs.
  const result = spawnSync(
    "psql",
    ["-X", "-v", "ON_ERROR_STOP=1", "-f", file],
    {
      stdio: "inherit",
      env: { ...process.env, PGDATABASE: EMH_STAGING_DATABASE_URL },
    },
  );
  if (result.error)
    console.error("psql unavailable; install PostgreSQL client tools.");
  process.exitCode = result.status ?? 1;
}
