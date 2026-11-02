import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
// Explicit offline selection. Live/migration/Gemini tests are never auto-executed.
const files = readdirSync("tests").filter(
  (f) =>
    /Contracts\.test\.mjs$/.test(f) ||
    /^test-v3.*\.js$/.test(f) ||
    /\.test\.ts$/.test(f) ||
    [
      "patchEngine.test.mjs",
      "phase2AndEvaluationUiRegression.test.mjs",
    ].includes(f),
);
let failures = 0;
for (const file of files) {
  console.log(`HOST ${file}`);
  const result = spawnSync(
    process.execPath,
    [...(file.endsWith(".ts") ? ["--import", "tsx"] : []), `tests/${file}`],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        GEMINI_API_KEY: "",
        GEMINI_API_KEYS: "",
        GEMINI_PAID_API_KEY: "",
        GEMINI_FREE_API_KEY: "",
      },
    },
  );
  if (result.status !== 0) failures++;
}
console.log(
  JSON.stringify({ hostSuites: files.length, failures, liveTests: "NOT_RUN" }),
);
process.exitCode = failures ? 1 : 0;
