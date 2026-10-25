import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  ensure,
  insert,
  type Repository,
  type Change,
  type Json,
} from "./repository";
import { hash, sha } from "./policy";
import { unitManifest, pilotUnitIds } from "./manifest";

const schema = z
  .object({
    stableId: z.string().regex(/^UNIT-[ABC][12]-\d{2}-PILOT$/),
    unitId: z.string(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    state: z.literal("PRE_HUMAN_CONTENT_COMPLETE"),
    humanCheckRequired: z.literal(true),
    title: z.string(),
    level: z.string(),
    provenance: z.string().min(1),
    lessons: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          blocks: z.array(z.unknown()).min(1),
        }),
      )
      .min(3),
    practice: z
      .array(z.object({ stableId: z.string(), prompt: z.string() }))
      .min(1),
    rubricVersion: z.string(),
    remediation: z.array(
      z.object({ errorTag: z.string(), action: z.string() }),
    ),
  })
  .passthrough();
export function revisedPayload(raw: Json, previous: Json) {
  schema.parse(raw);
  const p = structuredClone(raw);
  ensure(
    p.stableId === previous.stableId &&
      p.unitId === previous.unitId &&
      p.level === previous.level,
    "CONTENT_IDENTITY_IMMUTABLE",
  );
  ensure(
    p.version.localeCompare(previous.version, undefined, { numeric: true }) > 0,
    "NEW_VERSION_REQUIRED",
  );
  ensure(
    p.provenance === previous.provenance &&
      p.sourceText === previous.sourceText &&
      hash(p.derivation) === hash(previous.derivation),
    "SOURCE_PROVENANCE_IMMUTABLE",
  );
  ensure(
    p.practice.length >= 20 &&
      p.tasks?.length === 4 &&
      p.vocabulary?.length >= 30,
    "INCOMPLETE_CONTENT",
  );
  ensure(
    p.lessons.every((l: Json) =>
      l.blocks.every((b: Json) => typeof b.text === "string" && b.text.trim()),
    ),
    "EMPTY_LESSON",
  );
  ensure(
    p.rubric &&
      Array.isArray(p.rubric.dimensions) &&
      p.rubric.dimensions.length > 0,
    "RUBRIC_REQUIRED",
  );
  if (hash(p.rubric) !== hash(previous.rubric))
    ensure(
      p.rubricVersion !== previous.rubricVersion,
      "NEW_RUBRIC_VERSION_REQUIRED",
    );
  const ids = [
    ...p.lessons.map((l: Json) => l.id),
    ...p.practice.map((i: Json) => i.stableId),
    ...p.tasks.map((i: Json) => i.stableId),
  ];
  ensure(new Set(ids).size === ids.length, "DUPLICATE_CONTENT_ID");
  for (const item of [...p.practice, ...p.tasks]) {
    ensure(
      typeof item.prompt === "string" &&
        item.prompt.trim() &&
        ["SHORT_ANSWER", "OPEN_RESPONSE", "RECORDING"].includes(
          item.responseType,
        ),
      "INVALID_ITEM",
    );
    item.version = p.version;
    item.poolState = "DRAFT_ITEM";
  }
  // Editorial revisions never inherit review, audio QC or pool validation claims.
  delete p.checksum;
  p.audioStatus = "PRODUCTION_AND_QC_PENDING";
  return p;
}
export async function loadPackages(root = process.cwd()) {
  const packages: Json[] = [];
  for (const kind of ["legacy", "complete"]) {
    const folder = path.join(root, "content/english-mastery", kind);
    const names = (await readdir(folder))
      .filter((n) => n.endsWith(".json"))
      .sort();
    ensure(names.length === 6, "SIX_PILOTS_REQUIRED");
    for (const name of names) {
      const raw = JSON.parse(await readFile(path.join(folder, name), "utf8"));
      schema.parse(raw);
      ensure(pilotUnitIds.has(raw.unitId), "UNKNOWN_UNIT");
      const sourceFile =
        raw.derivation?.sourceFile ||
        raw.provenance.replace("Canonical v0.5 pilot: ", "").split(";")[0];
      ensure(
        !sourceFile.includes("/") && sourceFile.endsWith(".md"),
        "INVALID_PROVENANCE",
      );
      const source = await readFile(
        path.join(root, "content/english-mastery/canonical", sourceFile),
        "utf8",
      );
      if (kind === "complete") {
        const { checksum, ...payload } = raw;
        ensure(
          checksum === sha(JSON.stringify(payload)) &&
            raw.derivation.sourceChecksum === sha(source) &&
            raw.sourceText === source,
          "SOURCE_CHECKSUM_CONFLICT",
        );
        ensure(
          raw.version === "0.6.0" &&
            raw.practice.length >= 20 &&
            raw.tasks.length === 4 &&
            raw.vocabulary.length >= 30,
          "INCOMPLETE_CONTENT",
        );
        ensure(
          raw.lessons.every((l: Json) =>
            l.blocks.every(
              (b: Json) => typeof b.text === "string" && b.text.trim(),
            ),
          ),
          "EMPTY_LESSON",
        );
      } else ensure(raw.version === "0.5.0", "LEGACY_VERSION_CHANGED");
      const ids = [
        ...raw.lessons.map((l: Json) => l.id),
        ...raw.practice.map((i: Json) => i.stableId),
        ...(raw.tasks || []).map((i: Json) => i.stableId),
      ];
      ensure(new Set(ids).size === ids.length, "DUPLICATE_CONTENT_ID");
      packages.push({
        id: `${raw.stableId}@${raw.version}`,
        stableId: raw.stableId,
        unitId: raw.unitId,
        version: raw.version,
        state: raw.state,
        checksum: hash(raw),
        sourceChecksum: sha(source),
        sourceVerified: true,
        payload: raw,
      });
    }
  }
  ensure(
    unitManifest.length === 96 &&
      new Set(unitManifest.map((u) => u.id)).size === 96,
    "CURRICULUM_INVALID",
  );
  return packages;
}
export async function importPackages(
  repo: Repository,
  actorId: string,
  dryRun = true,
) {
  const content = await loadPackages();
  const changes: Change[] = [];
  for (const unit of unitManifest) {
    const existing = await repo.get("curriculum", unit.id);
    if (existing)
      ensure(hash(existing.data) === hash(unit), "CURRICULUM_CONFLICT");
    else changes.push(insert("curriculum", unit.id, null, unit));
  }
  for (const record of content) {
    const existing = await repo.get("content_versions", record.id);
    if (existing)
      ensure(
        existing.data.checksum === record.checksum,
        "IMMUTABLE_VERSION_CONFLICT",
      );
    else
      changes.push(
        insert("content_versions", record.id, actorId, {
          ...record,
          createdBy: actorId,
          createdAt: new Date().toISOString(),
        }),
      );
  }
  if (!dryRun && changes.length) await repo.commit(changes);
  return {
    dryRun,
    units: 96,
    pilots: 6,
    versions: 12,
    changes: changes.length,
    state: "PRE_HUMAN_CONTENT_COMPLETE",
  };
}
