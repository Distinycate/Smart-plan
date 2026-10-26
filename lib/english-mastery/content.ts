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
import { lexicalIndex } from "./lexical";
import { hash, sha } from "./policy";
import { unitManifest, pilotUnitIds } from "./manifest";

const schema = z
  .object({
    stableId: z.string().regex(/^UNIT-[ABC][12]-\d{2}-(PILOT|COURSE)$/),
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
  const releases = JSON.parse(await readFile(path.join(root, "content/english-mastery/course-releases.json"), "utf8"));
  for (const kind of ["legacy", "complete", "course", "course-history"]) {
    const course = kind.startsWith("course");
    const folder = path.join(root, "content/english-mastery", kind);
    const names = (await readdir(folder))
      .filter((n) => n.endsWith(".json"))
      .sort();
    ensure(names.length === (kind === "course-history" ? releases.history.length : kind === "course" ? 90 : 6), "CONTENT_COVERAGE_REQUIRED");
    if (kind === "course-history") ensure(hash(names) === hash([...releases.history].sort()), "HISTORY_COVERAGE_REQUIRED");
    const units = new Set<string>();
    for (const name of names) {
      const raw = JSON.parse(await readFile(path.join(folder, name), "utf8"));
      schema.parse(raw);
      const meta = unitManifest.find((unit) => unit.id === raw.unitId);
      ensure(meta && (course ? !pilotUnitIds.has(raw.unitId) : pilotUnitIds.has(raw.unitId)), "UNKNOWN_UNIT");
      ensure(raw.level === meta.level && raw.title === meta.title, "UNIT_METADATA_CONFLICT");
      ensure(!units.has(raw.unitId), "DUPLICATE_UNIT");
      units.add(raw.unitId);
      if (course) {
        ensure(raw.version === (kind === "course-history" ? "0.1.0" : releases.unitVersions[raw.unitId] || releases.defaultVersion), "COURSE_VERSION_CONFLICT");
        ensure(raw.derivation?.sourceFile === `${meta.level}.json`, "INVALID_PROVENANCE");
        const sources = JSON.parse(await readFile(path.join(root, "content/english-mastery/authored", `${meta.level}.json`), "utf8"));
        const matches = sources.filter((unit: Json) => unit.id === raw.unitId);
        ensure(matches.length === 1, "SOURCE_UNIT_REQUIRED");
        const source = JSON.stringify(matches[0], null, 2) + "\n";
        validateCourseSource(raw, source, kind === "course-history");
        packages.push({ id: `${raw.stableId}@${raw.version}`, stableId: raw.stableId,
          unitId: raw.unitId, version: raw.version, state: raw.state,
          checksum: hash(raw), sourceChecksum: sha(source), sourceVerified: true, payload: raw });
        continue;
      }
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

export function validateCourseSource(raw: Json, source: string, historical = false) {
  schema.parse(raw);
  const { checksum, ...payload } = raw;
  ensure(checksum === sha(JSON.stringify(payload)) && raw.sourceText === source &&
    raw.derivation?.sourceChecksum === sha(source), "SOURCE_CHECKSUM_CONFLICT");
  ensure(raw.stableId === `UNIT-${raw.unitId}-COURSE` && /^0\.1\.[01]$/.test(raw.version) &&
    raw.derivation.sourceUnitId === raw.unitId, "COURSE_IDENTITY_CONFLICT");
  ensure(raw.lessons.length >= 3 && raw.lessons.length <= 6 && raw.practice.length >= 20 &&
    raw.tasks?.length === 4 && raw.vocabulary?.length >= 30 && raw.grammar?.length >= 3 &&
    raw.inputs?.filter((i: Json) => i.kind === "READING").length === 2 &&
    raw.inputs?.filter((i: Json) => i.kind === "LISTENING_SCRIPT").length === 2,
    "INCOMPLETE_CONTENT");
  ensure(raw.lessons.every((l: Json) => l.blocks.every((b: Json) =>
    typeof b.text === "string" && b.text.trim())) &&
    raw.inputs.every((i: Json) => typeof i.text === "string" && i.text.trim()), "EMPTY_LESSON");
  const ids = [...raw.lessons.map((l: Json) => l.id), ...raw.inputs.map((i: Json) => i.id),
    ...raw.practice.map((i: Json) => i.stableId), ...raw.tasks.map((i: Json) => i.stableId)];
  ensure(new Set(ids).size === ids.length, "DUPLICATE_CONTENT_ID");
  ensure(raw.reviewLog?.reviewers?.length === 0 &&
    Object.entries(raw.reviewLog).every(([key, value]) => key === "reviewers" ||
      value === (key === "learnerPilot" ? "NOT_RUN" : "PENDING")) &&
    raw.audioStatus === "PRODUCTION_AND_QC_PENDING", "UNVERIFIED_REVIEW_CLAIM");
  const normalise = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'");
  const targets = raw.vocabulary.filter((v: Json) => v.learningRole === "UNIT_TARGET");
  ensure(targets.length === 15 && new Set(raw.vocabulary.map((v: Json) => normalise(v.item))).size === raw.vocabulary.length,
    "VOCABULARY_COVERAGE_REQUIRED");
  for (const v of targets) {
    ensure(raw.inputs.some((i: Json) => i.text.includes(v.example)) &&
      normalise(v.example).includes(normalise(v.item)), "VOCABULARY_SOURCE_CONFLICT");
    if (!historical) ensure(lexicalIndex(v.example, v.item) >= 0, "PARTIAL_LEXICAL_MATCH");
  }
  for (const item of [...raw.practice, ...raw.tasks]) {
    ensure(item.prompt?.trim() && item.expected?.trim() &&
      ["SHORT_ANSWER", "OPEN_RESPONSE", "RECORDING"].includes(item.responseType), "INVALID_ITEM");
    if (item.sourceId) ensure(raw.inputs.some((i: Json) => i.id === item.sourceId), "UNKNOWN_INPUT");
    if (item.responseType === "SHORT_ANSWER") ensure(item.acceptedAnswers?.length > 0 &&
      item.acceptedAnswers.every((answer: string) => targets.some((v: Json) => v.item === answer &&
        item.explanation.includes(v.example))), "ANSWER_SOURCE_CONFLICT");
  }
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
    availableUnits: new Set(content.map((p) => p.unitId)).size,
    versions: content.length,
    changes: changes.length,
    state: "PRE_HUMAN_CONTENT_COMPLETE",
  };
}
