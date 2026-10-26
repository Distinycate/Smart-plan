import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  loadPackages,
  importPackages,
} from "../../lib/english-mastery/content";
import {
  SupabaseRepository,
  ensure,
} from "../../lib/english-mastery/repository";
import { hash } from "../../lib/english-mastery/policy";
async function main() {
  config({ path: ".env.local", quiet: true });
  const packages = await loadPackages();
  const remote =
    process.argv.includes("--commit") || process.argv.includes("--remote");
  if (!remote) {
    console.log(
      JSON.stringify(
        {
          mode: "LOCAL_VALIDATION_AND_DRY_RUN",
          units: 96,
          canonicalPilots: 6,
          availableUnits: new Set(packages.map((p) => p.unitId)).size,
          newCourseUnits: new Set(packages.filter((p) => p.stableId.endsWith("-COURSE")).map(p => p.unitId)).size,
          versions: packages.length,
          sourceChecksumsVerified: true,
          states: Array.from(new Set(packages.map((p) => p.state))),
        },
        null,
        2,
      ),
    );
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY,
    actor = process.env.EMH_IMPORT_ACTOR_ID;
  ensure(
    process.env.EMH_ENV === "staging" &&
      url &&
      url === process.env.EMH_STAGING_SUPABASE_URL &&
      key &&
      actor,
    "EXPLICIT_STAGING_CONFIGURATION_REQUIRED",
  );
  const repository = new SupabaseRepository(
    createClient(url, key, { auth: { persistSession: false } }),
  );
  if (process.argv.includes("--verify")) {
    for (const p of packages) {
      const row = await repository.get("content_versions", p.id);
      ensure(
        row?.data.checksum === p.checksum &&
          hash(row?.data.payload) === p.checksum,
        "REMOTE_CONTENT_MISMATCH",
      );
    }
    ensure(
      (await repository.list("curriculum")).length === 96,
      "REMOTE_CURRICULUM_MISMATCH",
    );
    console.log("Remote staging content verified. No publication performed.");
  } else
    console.log(
      JSON.stringify(
        await importPackages(
          repository,
          actor,
          !process.argv.includes("--commit"),
        ),
        null,
        2,
      ),
    );
}
main().catch((error) => {
  console.error(error.code || "CONTENT_CHECK_FAILED");
  process.exitCode = 1;
});
