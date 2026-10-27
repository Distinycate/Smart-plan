import { createHash } from "node:crypto";
import { z } from "zod";
import { ensure, type Json } from "./repository";

export const PERMISSIONS = [
  "english.learn",
  "english.preview",
  "english.author",
  "english.review",
  "english.publish",
  "english.manage_curriculum",
  "english.manage_assessments",
  "english.audit_attempts",
  "english.manage_production",
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export interface Grant {
  permission: Permission;
  units: string[];
  reviewTypes: string[];
}
export interface Actor {
  id: string;
  grants: Grant[];
}
// Only the verified Smart Plan identity receives these learner permissions.
// Explicit grants (including revocations and unit scopes) override defaults.
export function accountGrants(
  rows: { data: Json }[],
  selfStudyEnabled: boolean,
): Grant[] {
  const grants = rows.filter((row) => !row.data.revokedAt).map((row) => row.data as Grant);
  if (selfStudyEnabled) {
    for (const permission of ["english.learn", "english.preview"] as const) {
      if (!rows.some((row) => row.data.permission === permission))
        grants.push({ permission, units: ["*"], reviewTypes: [] });
    }
  }
  return grants;
}
export const identifier = z
  .string()
  .min(1)
  .max(220)
  .regex(/^[A-Za-z0-9@_.:-]+$/);
export const textInput = z.string().max(30000);
export const modes = z.enum([
  "PRACTICE",
  "UNIT_MASTERY",
  "SKILLS",
  "LEVEL_READINESS",
  "WRITING",
  "SPEAKING",
  "MEDIATION",
  "ONLINE_INTERACTION",
  "EXAM_SIMULATION",
]);
export const reviewTypes = [
  "ACADEMIC",
  "LANGUAGE",
  "THAI",
  "CONSTRUCT",
  "LEVEL",
  "FAIRNESS",
  "KEY_DISTRACTOR",
  "COPYRIGHT",
  "AUDIO_TECHNICAL",
  "PRONUNCIATION_PROSODY",
] as const;
export function has(
  actor: Actor,
  permission: Permission,
  unit?: string,
  reviewType?: string,
) {
  return actor.grants.some(
    (g) =>
      g.permission === permission &&
      (!unit || g.units.includes("*") || g.units.includes(unit)) &&
      (!reviewType ||
        g.reviewTypes.includes("*") ||
        g.reviewTypes.includes(reviewType)),
  );
}
export function requirePermission(
  actor: Actor,
  permission: Permission,
  unit?: string,
  reviewType?: string,
) {
  ensure(has(actor, permission, unit, reviewType), "PERMISSION_DENIED", 403);
}
export const sha = (value: string) =>
  createHash("sha256").update(value).digest("hex");
// PostgreSQL jsonb reorders keys. Canonical serialization is required across storage round trips.
export function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const hash = (value: unknown) => sha(canonical(value));
export function learnerItem(item: Json) {
  return {
    stableId: item.stableId,
    version: item.version,
    prompt: item.prompt,
    responseType: item.responseType,
    skill: item.skill,
    title: item.title || null,
  };
}
export function learnerContent(p: Json) {
  return {
    unitId: p.unitId,
    version: p.version,
    title: p.title,
    level: p.level,
    canDo: p.canDo || "",
    audioStatus: p.audioStatus || "PRODUCTION_AND_QC_PENDING",
    lessons: p.lessons.map((l: Json) => ({
      id: l.id,
      title: l.title,
      blocks: l.blocks
        .filter((b: any) => b && typeof b.text === "string")
        .map((b: Json) => ({ type: b.type, text: b.text })),
    })),
    vocabulary: (p.vocabulary || []).map((v: Json) => ({
      id: v.id,
      item: v.item,
      thai: v.thai,
      example: v.example,
      type: v.type,
    })),
    grammar: (p.grammar || []).map((g: Json) => ({
      id: g.id,
      form: g.form,
      use: g.use,
      example: g.example,
    })),
    retrieval: (p.retrieval || []).map((r: Json) => ({
      id: r.id,
      prompt: r.prompt,
    })),
    practice: p.practice.map(learnerItem),
    tasks: (p.tasks || []).map(learnerItem),
  };
}
const normalized = (s: string) =>
  s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export function score(item: Json, response: string) {
  if (!response.trim())
    return {
      score: 0,
      scorerType: "RULE",
      reviewStatus: "OMITTED",
      feedback: "No response submitted.",
      errorTags: item.errorTags || [],
    };
  if (item.responseType !== "SHORT_ANSWER" || !item.acceptedAnswers?.length)
    return {
      score: null,
      scorerType: "HUMAN_REQUIRED",
      reviewStatus: "PENDING_HUMAN",
      feedback: "Awaiting a human rubric review.",
      errorTags: [],
    };
  const correct = item.acceptedAnswers.some(
    (a: string) => normalized(a) === normalized(response),
  );
  return {
    score: correct ? 1 : 0,
    scorerType: "RULE",
    reviewStatus: "SCORED",
    feedback: item.explanation,
    errorTags: correct ? [] : item.errorTags || [],
  };
}
export function publicationGate(content: Json, reviews: Json[]) {
  const required: readonly string[] =
    content.payload.audioStatus === "QC_COMPLETE"
      ? reviewTypes
      : reviewTypes.slice(0, 8);
  const latest = new Map<string, Json>();
  [...reviews]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((r) => {
      if (r.versionId === content.id && r.checksum === content.checksum)
        latest.set(r.type, r);
    });
  const missing = required.filter((type) => {
    const r = latest.get(type);
    return (
      !r ||
      r.decision !== "APPROVE" ||
      r.attestation !== true ||
      !r.reviewerId ||
      r.reviewerId === content.createdBy ||
      r.blockingFlags.length > 0
    );
  });
  const blockers = Array.from(latest.values())
    .filter((r) => r.decision !== "APPROVE" || r.blockingFlags.length)
    .flatMap((r) => [r.type, ...r.blockingFlags]);
  return {
    allowed:
      missing.length === 0 &&
      blockers.length === 0 &&
      content.sourceVerified === true &&
      Boolean(content.payload.provenance),
    missing,
    blockers,
  };
}
export function readiness() {
  return {
    status: "NOT_ENOUGH_EVIDENCE",
    policyVersion: "EMH-READINESS-UNCALIBRATED-v2",
    certification: false,
    message:
      "Internal evidence only — not an official CEFR certificate. Calibration pending.",
  };
}
