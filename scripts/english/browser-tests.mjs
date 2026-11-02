import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
const env = {
  ...process.env,
  EMH_TEST_BUILD: "true",
  EMH_TEST_PROVIDER: "local-contract-only",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54401",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-test-anon",
  SUPABASE_SERVICE_ROLE_KEY: "local-test-service",
  EMH_ENABLED: "true",
  EMH_ENV: "development",
  EMH_RECORDING_POLICY_VERSION: "TEST-ONLY-NOT-PRODUCTION",
  EMH_RECORDING_RETENTION_DAYS: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};
const children = [];
function start(args, file) {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = createWriteStream(file);
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  children.push(child);
  return child;
}
async function ready(url) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error(`Local server not ready: ${url}`);
}
try {
  // Fail on occupied ports; never attach to an unknown live test or development server.
  for (const port of [54401, 3188]) {
    let occupied = false;
    try {
      await fetch(`http://127.0.0.1:${port}`);
      occupied = true;
    } catch {}
    if (occupied) throw Error(`Port ${port} is already in use`);
  }
  start(
    ["--import", "tsx", "tests/english/provider.ts"],
    "/tmp/emh-test-provider.log",
  );
  await ready("http://127.0.0.1:54401/health");
  start(
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3188",
    ],
    "/tmp/emh-test-next.log",
  );
  await ready("http://127.0.0.1:3188/login");
  if (process.argv.includes("--serve")) {
    console.log(
      "LOCAL TEST FIXTURES ONLY: http://127.0.0.1:3188/login — learner@example.test / local-fixture-password. Data is ephemeral; no real Supabase or academic approval. Ctrl+C to stop.",
    );
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
  } else {
    const test = spawn(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "--config=playwright.english.config.ts",
        ...process.argv.slice(2),
      ],
      { env, stdio: "inherit" },
    );
    process.exitCode = await new Promise((resolve) =>
      test.on("exit", (code) => resolve(code ?? 1)),
    );
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  for (const child of children.reverse()) child.kill("SIGTERM");
}
