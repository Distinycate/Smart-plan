import { spawnSync } from "node:child_process";
// Compile-only placeholders, not credentials and never a production deployment.
const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54401",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "offline-build-anon",
      SUPABASE_SERVICE_ROLE_KEY: "offline-build-service",
      EMH_ENABLED: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
process.exitCode = result.status ?? 1;
