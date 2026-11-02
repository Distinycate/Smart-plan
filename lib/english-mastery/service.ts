import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ensure,
  insert,
  update,
  type Repository,
  type Row,
  type Json,
  type Change,
} from "./repository";
import {
  has,
  requirePermission,
  identifier,
  textInput,
  modes,
  reviewTypes,
  hash,
  learnerContent,
  learnerItem,
  publicationGate,
  score,
  readiness,
  PERMISSIONS,
  type Actor,
} from "./policy";
import { importPackages, revisedPayload } from "./content";

const stamp = () => new Date().toISOString();
const parse = <T extends z.ZodRawShape>(shape: T, data: unknown) =>
  z.object(shape).strict().parse(data);
const packed = (row: Row) => ({
  id: row.id,
  ...row.data,
  revision: row.revision,
});
const audit = (actor: Actor, action: string, target: string) =>
  insert("audit", randomUUID(), actor.id, {
    actorId: actor.id,
    action,
    target,
    createdAt: stamp(),
  });
export class EnglishService {
  constructor(
    public repo: Repository,
    public actor: Actor,
  ) {}
  async own(table: "attempts" | "recordings", id: string) {
    const row = await this.repo.get(table, id);
    ensure(row && row.owner_id === this.actor.id, "NOT_FOUND", 404);
    return row;
  }
  async content(id: string) {
    const row = await this.repo.get("content_versions", id);
    ensure(row, "NOT_FOUND", 404);
    const publication = await this.repo.get("publications", id);
    const preview = publication?.data.state !== "PUBLISHED";
    requirePermission(this.actor, "english.learn", row.data.unitId);
    if (preview)
      requirePermission(this.actor, "english.preview", row.data.unitId);
    return { row, preview };
  }
  async rateLimit() {
    const minute = Math.floor(Date.now() / 60000),
      id = this.actor.id;
    for (let retry = 0; retry < 4; retry++) {
      const row = await this.repo.get("rate_limits", id);
      const count = row?.data.minute === minute ? row.data.count : 0;
      ensure(count < 120, "RATE_LIMITED", 429);
      try {
        await this.repo.commit([
          row
            ? update("rate_limits", row, { minute, count: count + 1 })
            : insert("rate_limits", id, id, { minute, count: 1 }),
        ]);
        return;
      } catch (error) {
        if (retry === 3) throw error;
      }
    }
  }
  async run(operation: string, raw: unknown): Promise<any> {
    const actor = this.actor,
      repo = this.repo;
    if (operation === "mediaPolicy") {
      parse({}, raw);
      requirePermission(actor, "english.learn");
      const days = Number(process.env.EMH_RECORDING_RETENTION_DAYS),
        version = process.env.EMH_RECORDING_POLICY_VERSION;
      return {
        configured: Boolean(
          version && Number.isInteger(days) && days > 0 && days <= 3650,
        ),
        version: version || null,
        retentionDays: Number.isInteger(days) && days > 0 ? days : null,
      };
    }
    if (operation === "catalog") {
      parse({}, raw);
      requirePermission(actor, "english.learn");
      const [units, versions, publications] = await Promise.all([
        repo.list("curriculum"),
        repo.list("content_versions"),
        repo.list("publications"),
      ]);
      return {
        permissions: actor.grants.map((g) => g.permission),
        units: units.map((u) => ({
          ...u.data,
          available: versions.some(
            (v) =>
              v.data.unitId === u.id &&
              v.data.version !== "0.5.0" &&
              (has(actor, "english.preview", u.id) ||
                publications.some(
                  (p) => p.id === v.id && p.data.state === "PUBLISHED",
                )),
          ),
        })),
        aiEnabled: false,
      };
    }
    if (operation === "content") {
      const { unitId } = parse({ unitId: identifier }, raw);
      requirePermission(actor, "english.learn", unitId);
      const versions = (await repo.list("content_versions"))
        .filter((v) => v.data.unitId === unitId && v.data.version !== "0.5.0")
        .sort((a, b) =>
          b.data.version.localeCompare(a.data.version, undefined, {
            numeric: true,
          }),
        );
      for (const row of versions) {
        const release = await repo.get("publications", row.id),
          preview = release?.data.state !== "PUBLISHED";
        if (preview && !has(actor, "english.preview", unitId)) continue;
        return {
          ...learnerContent(row.data.payload),
          id: row.id,
          preview,
          state: preview ? row.data.state : "PUBLISHED",
        };
      }
      ensure(false, "CONTENT_NOT_AVAILABLE", 403);
    }
    if (operation === "start") {
      const input = parse(
        {
          contentVersionId: identifier,
          mode: modes,
          requestId: z.string().uuid(),
          itemId: identifier.optional(),
          examProfileId: identifier.optional(),
        },
        raw,
      );
      const { row: version, preview } = await this.content(
          input.contentVersionId,
        ),
        p = version.data.payload;
      const all = [...p.practice, ...(p.tasks || [])];
      let items: Json[] =
        input.mode === "PRACTICE"
          ? all.filter(
              (i) => i.stableId === (input.itemId || p.practice[0].stableId),
            )
          : ["WRITING", "SPEAKING", "MEDIATION", "ONLINE_INTERACTION"].includes(
                input.mode,
              )
            ? (p.tasks || []).filter((i: Json) => i.skill === input.mode)
            : all;
      ensure(items.length > 0, "NO_ELIGIBLE_ITEMS");
      let profile: Json | null = null;
      if (input.mode === "EXAM_SIMULATION") {
        ensure(input.examProfileId, "EXAM_PROFILE_REQUIRED");
        const pr = await repo.get("exam_profiles", input.examProfileId);
        ensure(pr, "EXAM_PROFILE_NOT_FOUND");
        profile = pr.data;
        ensure(profile?.level === p.level, "EXAM_LEVEL_MISMATCH");
        requirePermission(actor, "english.preview", p.unitId);
        items = all.filter((i) => profile!.itemIds.includes(i.stableId));
        ensure(
          items.length === profile!.itemIds.length && items.length > 0,
          "EXAM_ITEMS_MISSING",
        );
        items = profile!.itemIds.map(
          (id: string) => items.find((i) => i.stableId === id)!,
        );
      }
      if (
        !preview &&
        [
          "UNIT_MASTERY",
          "SKILLS",
          "LEVEL_READINESS",
          "EXAM_SIMULATION",
        ].includes(input.mode)
      )
        ensure(
          items.every((i) => i.poolState === "APPROVED_FOR_POOL"),
          "ASSESSMENT_VALIDATION_PENDING",
          409,
        );
      const id = hash(`${actor.id}:${input.requestId}`),
        previous = await repo.get("attempts", id);
      const identity = hash(input);
      if (previous) {
        ensure(
          previous.data.requestHash === identity,
          "IDEMPOTENCY_CONFLICT",
          409,
        );
        return packed(previous);
      }
      const started = stamp(),
        seconds = profile?.timeLimitSeconds || null;
      const data = {
        ownerId: actor.id,
        unitId: p.unitId,
        level: p.level,
        mode: input.mode,
        preview: preview || !!profile,
        evidenceEligible: false,
        status: "ACTIVE",
        requestHash: identity,
        snapshot: {
          contentVersionId: version.id,
          contentChecksum: version.data.checksum,
          itemVersionIds: items.map(
            (i) => `${i.stableId}@${i.version || p.version}`,
          ),
          blueprintVersionId: `${version.id}:${input.mode}:1`,
          blueprint: {
            mode: input.mode,
            itemIds: items.map((i) => i.stableId),
            supportMode: input.mode === "PRACTICE" ? "LEARNING" : "CONTROLLED",
            timeLimitSeconds: seconds,
          },
          rubricVersionId: p.rubricVersion,
          rubric: p.rubric || null,
          scoringPolicy: {
            version: "EMH-EXACT-OR-HUMAN-v3",
            normalization: "NFKC;trim;lowercase;collapse-whitespace",
            openResponses: "HUMAN_REQUIRED",
          },
          readinessPolicy: readiness(),
          examProfileVersionId: input.examProfileId || null,
          examProfile: profile,
        },
        items: items.map(learnerItem),
        currentIndex: 0,
        drafts: {},
        plan: "",
        responses: [],
        createdAt: started,
        deadlineAt: seconds
          ? new Date(Date.now() + seconds * 1000).toISOString()
          : null,
        submittedAt: null,
      };
      await repo.commit([
        insert("attempts", id, actor.id, data),
        audit(actor, "START", id),
      ]);
      return { id, ...data, revision: 0 };
    }
    if (operation === "session") {
      const { id } = parse({ id: identifier }, raw);
      return packed(await this.own("attempts", id));
    }
    if (operation === "attempts") {
      parse({}, raw);
      requirePermission(actor, "english.learn");
      return (await repo.list("attempts", actor.id)).map(packed);
    }
    if (operation === "save") {
      const input = parse(
        {
          id: identifier,
          revision: z.number().int().nonnegative(),
          responses: z.record(identifier, textInput),
          plan: textInput.optional(),
        },
        raw,
      );
      const row = await this.own("attempts", input.id),
        s = row.data;
      requirePermission(actor, "english.learn", s.unitId);
      ensure(s.status === "ACTIVE", "SUBMISSION_LOCKED", 409);
      ensure(row.revision === input.revision, "REVISION_CONFLICT", 409);
      ensure(
        !s.deadlineAt || Date.parse(s.deadlineAt) > Date.now(),
        "TIME_EXPIRED",
        409,
      );
      ensure(
        Object.keys(input.responses).every((id) =>
          s.items.some((i: Json) => i.stableId === id),
        ),
        "UNKNOWN_ITEM",
      );
      if (s.snapshot.examProfile?.navigation === "SEQUENTIAL") {
        const current = s.items[s.currentIndex || 0].stableId;
        ensure(
          s.items.every(
            (i: Json) =>
              i.stableId === current ||
              (input.responses[i.stableId] || "") ===
                (s.drafts[i.stableId] || ""),
          ),
          "SEQUENTIAL_ITEM_LOCKED",
          409,
        );
      }
      ensure(
        JSON.stringify(input.responses).length <= 150000,
        "RESPONSE_TOO_LARGE",
        413,
      );
      const data = {
        ...s,
        drafts: input.responses,
        plan: input.plan ?? s.plan,
        updatedAt: stamp(),
      };
      const changes = [update("attempts", row, data)];
      if (["WRITING", "MEDIATION", "ONLINE_INTERACTION"].includes(s.mode))
        changes.push(
          insert(
            "writing_versions",
            `${row.id}:${row.revision + 1}`,
            actor.id,
            {
              attemptId: row.id,
              contentVersionId: s.snapshot.contentVersionId,
              rubricVersionId: s.snapshot.rubricVersionId,
              responses: input.responses,
              plan: data.plan,
              createdAt: stamp(),
            },
          ),
        );
      await repo.commit(changes);
      return { ...data, id: row.id, revision: row.revision + 1 };
    }
    if (operation === "advance") {
      const { id, revision } = parse(
          { id: identifier, revision: z.number().int().nonnegative() },
          raw,
        ),
        row = await this.own("attempts", id),
        s = row.data;
      requirePermission(actor, "english.learn", s.unitId);
      ensure(
        s.status === "ACTIVE" &&
          s.snapshot.examProfile?.navigation === "SEQUENTIAL",
        "NAVIGATION_NOT_AVAILABLE",
        409,
      );
      ensure(row.revision === revision, "REVISION_CONFLICT", 409);
      ensure(
        !s.deadlineAt || Date.parse(s.deadlineAt) > Date.now(),
        "TIME_EXPIRED",
        409,
      );
      ensure(s.currentIndex < s.items.length - 1, "LAST_ITEM", 409);
      const data = { ...s, currentIndex: s.currentIndex + 1 };
      await repo.commit([update("attempts", row, data)]);
      return { id, ...data, revision: revision + 1 };
    }
    if (operation === "submit") {
      const input = parse(
        {
          id: identifier,
          revision: z.number().int().nonnegative(),
          confidence: z.number().int().min(1).max(5).default(3),
        },
        raw,
      );
      const row = await this.own("attempts", input.id),
        s = row.data;
      requirePermission(actor, "english.learn", s.unitId);
      if (s.status === "SUBMITTED") return packed(row);
      ensure(row.revision === input.revision, "REVISION_CONFLICT", 409);
      const v = await repo.get("content_versions", s.snapshot.contentVersionId);
      ensure(
        v &&
          v.data.checksum === s.snapshot.contentChecksum &&
          hash(v.data.payload) === v.data.checksum,
        "CONTENT_INTEGRITY_FAILURE",
        409,
      );
      const all = [...v.data.payload.practice, ...(v.data.payload.tasks || [])];
      const changes: Change[] = [],
        responses: Json[] = [];
      for (const item of s.items) {
        const full = all.find((i) => i.stableId === item.stableId);
        ensure(full, "ITEM_NOT_FROZEN");
        const response = s.drafts[item.stableId] || "";
        if (item.responseType === "RECORDING" && response) {
          const recording = await this.own("recordings", response);
          ensure(
            recording.data.status === "READY" &&
              recording.data.attemptId === row.id &&
              recording.data.itemId === item.stableId,
            "RECORDING_NOT_READY",
          );
        }
        const result = score(full, response);
        responses.push({
          itemId: item.stableId,
          itemVersionId: `${item.stableId}@${item.version || v.data.version}`,
          rawResponse: response,
          ...result,
          remediation: result.score === 0 ? v.data.payload.remediation : [],
        });
        const key = hash(`${actor.id}:${v.id}:${item.stableId}`),
          prev = await repo.get("review_queue", key);
        const correct = result.score === 1 && result.scorerType === "RULE";
        const streak = correct ? (prev?.data.streak || 0) + 1 : 0,
          lapses = (prev?.data.lapses || 0) + (correct ? 0 : 1);
        const days = Math.max(
          1,
          Math.min(
            30,
            Math.round(
              ((streak + 1) * (input.confidence >= 4 ? 2 : 1)) / (lapses + 1),
            ),
          ),
        );
        const queue = {
          contentVersionId: v.id,
          unitId: s.unitId,
          itemId: item.stableId,
          itemVersionId: `${item.stableId}@${item.version || v.data.version}`,
          streak,
          lapses,
          confidence: input.confidence,
          policyVersion: "EMH-RETRIEVAL-v2",
          nextDueAt: new Date(Date.now() + days * 86400000).toISOString(),
        };
        changes.push(
          prev
            ? update("review_queue", prev, queue)
            : insert("review_queue", key, actor.id, queue),
        );
      }
      const data = {
        ...s,
        status: "SUBMITTED",
        responses,
        submittedAt: stamp(),
      };
      await repo.commit([
        update("attempts", row, data),
        ...changes,
        audit(actor, "SUBMIT", row.id),
      ]);
      return { ...data, id: row.id, revision: row.revision + 1 };
    }
    if (operation === "history") {
      const { id } = parse({ id: identifier }, raw);
      await this.own("attempts", id);
      return (await repo.list("writing_versions", actor.id))
        .filter((r) => r.data.attemptId === id)
        .map(packed);
    }
    if (operation === "complete") {
      const { contentVersionId, lessonId } = parse(
        { contentVersionId: identifier, lessonId: identifier },
        raw,
      );
      const { row, preview } = await this.content(contentVersionId);
      ensure(
        row.data.payload.lessons.some((l: Json) => l.id === lessonId),
        "UNKNOWN_LESSON",
      );
      const id = hash(`${actor.id}:${contentVersionId}:${lessonId}`),
        old = await repo.get("lesson_progress", id);
      if (old) return packed(old);
      const data = {
        contentVersionId,
        lessonId,
        unitId: row.data.unitId,
        preview,
        completedAt: stamp(),
      };
      await repo.commit([insert("lesson_progress", id, actor.id, data)]);
      return data;
    }
    if (operation === "progress" || operation === "export") {
      parse({}, raw);
      requirePermission(actor, "english.learn");
      const [attempts, lessons, queue, ratings] = await Promise.all([
        repo.list("attempts", actor.id),
        repo.list("lesson_progress", actor.id),
        repo.list("review_queue", actor.id),
        repo.list("ratings", actor.id),
      ]);
      const privacy =
        operation === "export"
          ? {
              writingHistory: (
                await repo.list("writing_versions", actor.id)
              ).map(packed),
              recordings: (await repo.list("recordings", actor.id)).map(
                (r) => ({
                  id: r.id,
                  attemptId: r.data.attemptId,
                  itemId: r.data.itemId,
                  status: r.data.status,
                  createdAt: r.data.createdAt,
                  expiresAt: r.data.expiresAt,
                  consent: r.data.consent,
                }),
              ),
            }
          : {};
      return {
        ...privacy,
        attempts: attempts.map(packed),
        lessons: lessons.map(packed),
        queue: queue.map(packed),
        ratings: ratings.map(packed),
        readiness: readiness(),
        courseCompletion: lessons.filter((l) => !l.data.preview).length,
        previewLessons: lessons.filter((l) => l.data.preview).length,
      };
    }
    if (operation === "authorQueue") {
      parse({}, raw);
      requirePermission(actor, "english.author");
      return (await repo.list("content_versions"))
        .filter(
          (v) =>
            v.data.version !== "0.5.0" &&
            has(actor, "english.author", v.data.unitId),
        )
        .map(packed);
    }
    if (operation === "revise") {
      const input = parse(
        {
          previousVersionId: identifier,
          payload: z.record(z.string(), z.unknown()),
          reason: z.string().min(20).max(5000),
        },
        raw,
      );
      const previous = await repo.get(
        "content_versions",
        input.previousVersionId,
      );
      ensure(previous, "NOT_FOUND", 404);
      requirePermission(actor, "english.author", previous.data.unitId);
      const payload = revisedPayload(input.payload, previous.data.payload),
        id = `${payload.stableId}@${payload.version}`;
      const data = {
        ...previous.data,
        id,
        version: payload.version,
        payload,
        checksum: hash(payload),
        createdBy: actor.id,
        createdAt: stamp(),
        previousVersionId: previous.id,
        changeReason: input.reason,
      };
      await repo.commit([
        insert("content_versions", id, actor.id, data),
        audit(actor, "CREATE_CONTENT_REVISION", id),
      ]);
      return { id, state: payload.state, checksum: data.checksum };
    }
    if (operation === "reviewQueue") {
      parse({}, raw);
      requirePermission(actor, "english.review");
      const [versions, reviews] = await Promise.all([
        repo.list("content_versions"),
        repo.list("reviews"),
      ]);
      return versions
        .filter((v) => has(actor, "english.review", v.data.unitId))
        .map((v) => ({
          ...packed(v),
          gate: publicationGate(
            { ...v.data, id: v.id },
            reviews.map((r) => r.data),
          ),
          reviews: reviews.filter((r) => r.data.versionId === v.id).map(packed),
        }));
    }
    if (operation === "review") {
      const input = parse(
        {
          versionId: identifier,
          type: z.enum(reviewTypes),
          decision: z.enum(["APPROVE", "REVISE", "REJECT"]),
          notes: z.string().min(20).max(5000),
          blockingFlags: z.array(z.string().min(1).max(200)).max(20),
          attestation: z.literal(true),
        },
        raw,
      );
      const v = await repo.get("content_versions", input.versionId);
      ensure(v, "NOT_FOUND", 404);
      requirePermission(actor, "english.review", v.data.unitId, input.type);
      ensure(v.data.createdBy !== actor.id, "SELF_REVIEW_DENIED", 403);
      const id = randomUUID(),
        data = {
          ...input,
          reviewerId: actor.id,
          checksum: v.data.checksum,
          createdAt: stamp(),
        };
      await repo.commit([
        insert("reviews", id, actor.id, data),
        audit(actor, "HUMAN_REVIEW", input.versionId),
      ]);
      return { id, ...data };
    }
    if (operation === "publish") {
      const { versionId } = parse({ versionId: identifier }, raw),
        v = await repo.get("content_versions", versionId);
      ensure(v, "NOT_FOUND", 404);
      requirePermission(actor, "english.publish", v.data.unitId);
      ensure(
        v.data.version !== "0.5.0",
        "ABBREVIATED_LEGACY_NOT_PUBLISHABLE",
        409,
      );
      const reviews = (await repo.list("reviews")).map((r) => r.data),
        gate = publicationGate({ ...v.data, id: v.id }, reviews);
      ensure(gate.allowed, "HUMAN_REVIEW_REQUIRED", 409);
      const existing = await repo.get("publications", versionId);
      if (existing) return packed(existing);
      const data = {
        state: "PUBLISHED",
        humanState: "HUMAN_CHECKED",
        checksum: v.data.checksum,
        reviewIds: (await repo.list("reviews"))
          .filter((r) => r.data.versionId === versionId)
          .map((r) => r.id),
        publishedAt: stamp(),
        publishedBy: actor.id,
        audioValidated: v.data.payload.audioStatus === "QC_COMPLETE",
      };
      await repo.commit([
        insert("publications", versionId, actor.id, data),
        audit(actor, "PUBLISH", versionId),
      ]);
      return data;
    }
    if (operation === "ratingQueue") {
      parse({}, raw);
      requirePermission(actor, "english.audit_attempts");
      return (await repo.list("attempts"))
        .filter(
          (a) =>
            a.data.status === "SUBMITTED" &&
            has(actor, "english.audit_attempts", a.data.unitId),
        )
        .map(packed);
    }
    if (operation === "rate") {
      const input = parse(
        {
          attemptId: identifier,
          itemId: identifier,
          scores: z.record(z.string(), z.number().int().min(0).max(4)),
          notes: z.string().min(20).max(5000),
          criticalErrors: z.array(z.string().min(1).max(200)).max(10),
          attestation: z.literal(true),
        },
        raw,
      );
      const a = await repo.get("attempts", input.attemptId);
      ensure(a && a.data.status === "SUBMITTED", "SUBMITTED_ATTEMPT_REQUIRED");
      requirePermission(actor, "english.audit_attempts", a.data.unitId);
      ensure(a.owner_id !== actor.id, "SELF_RATING_DENIED", 403);
      ensure(
        a.data.items.some((i: Json) => i.stableId === input.itemId),
        "UNKNOWN_ITEM",
      );
      const dimensions: string[] = a.data.snapshot.rubric?.dimensions || [];
      ensure(
        dimensions.length > 0 &&
          dimensions.every((d) => Number.isInteger(input.scores[d])) &&
          Object.keys(input.scores).length === dimensions.length,
        "RUBRIC_DIMENSIONS_REQUIRED",
      );
      const id = randomUUID(),
        data = {
          ...input,
          rubricVersionId: a.data.snapshot.rubricVersionId,
          scorerId: actor.id,
          scorerType: "HUMAN",
          createdAt: stamp(),
          remediationRequired: input.criticalErrors.length > 0,
        };
      await repo.commit([
        insert("ratings", id, a.owner_id, data),
        audit(actor, "RUBRIC_RATING", a.id),
      ]);
      return data;
    }
    if (operation === "profiles") {
      parse({}, raw);
      requirePermission(actor, "english.preview");
      return (await repo.list("exam_profiles")).map(packed);
    }
    if (operation === "createProfile") {
      requirePermission(actor, "english.manage_assessments");
      const input = parse(
        {
          id: identifier,
          provider: z.enum(["CAMBRIDGE", "LANGUAGECERT"]),
          name: z.string().min(3).max(100),
          level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
          version: z.string().regex(/^\d+\.\d+\.\d+$/),
          sourceUrl: z.string().url(),
          checkedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          timeLimitSeconds: z.number().int().min(60).max(14400),
          itemIds: z.array(identifier).min(1).max(100),
          sections: z
            .array(
              z.object({
                name: z.string().min(1),
                itemIds: z.array(identifier).min(1),
              }),
            )
            .min(1),
          navigation: z.enum(["FREE", "SEQUENTIAL"]),
          replayLimit: z.number().int().min(0).max(10),
        },
        raw,
      );
      const host = new URL(input.sourceUrl).hostname;
      ensure(
        input.provider === "CAMBRIDGE"
          ? host === "cambridgeenglish.org" ||
              host.endsWith(".cambridgeenglish.org")
          : host === "languagecert.org" || host.endsWith(".languagecert.org"),
        "OFFICIAL_SOURCE_REQUIRED",
      );
      ensure(
        !Number.isNaN(Date.parse(input.checkedDate)) &&
          input.checkedDate <= stamp().slice(0, 10),
        "INVALID_CHECKED_DATE",
      );
      ensure(
        hash(input.sections.flatMap((s) => s.itemIds)) === hash(input.itemIds),
        "SECTION_ITEM_ORDER_MISMATCH",
      );
      const id = `${input.id}@${input.version}`,
        data = {
          ...input,
          id,
          state: "DRAFT",
          humanChecked: false,
          createdBy: actor.id,
          createdAt: stamp(),
        };
      await repo.commit([
        insert("exam_profiles", id, actor.id, data),
        audit(actor, "EXAM_PROFILE_DRAFT", id),
      ]);
      return data;
    }
    if (operation === "production") {
      parse({}, raw);
      requirePermission(actor, "english.manage_production");
      return {
        aiEnabled: false,
        readiness: readiness(),
        grants: (await repo.list("permissions")).map(packed),
        audit: (await repo.list("audit")).map(packed),
        audioPolicyConfigured: Boolean(
          process.env.EMH_RECORDING_POLICY_VERSION &&
            process.env.EMH_RECORDING_RETENTION_DAYS,
        ),
        externalChecks: [
          "Real human review",
          "Audio production/QC",
          "Learner pilot and calibration",
          "Supabase staging RLS/storage",
          "Backup/restore staging",
          "Vercel preview and host regression",
        ],
      };
    }
    if (operation === "grant") {
      requirePermission(actor, "english.manage_production");
      const input = parse(
        {
          userId: z.string().uuid(),
          permission: z.enum(PERMISSIONS),
          units: z.array(z.string().regex(/^(\*|[ABC][12]-\d{2})$/)).min(1),
          reviewTypes: z.array(z.enum([...reviewTypes, "*"])).default([]),
        },
        raw,
      );
      ensure(actor.id !== input.userId, "SELF_GRANT_DENIED", 403);
      const id = `${input.userId}:${input.permission}`,
        old = await repo.get("permissions", id),
        data = {
          permission: input.permission,
          units: input.units,
          reviewTypes: input.reviewTypes,
        };
      await repo.commit([
        old
          ? update("permissions", old, data)
          : insert("permissions", id, input.userId, data),
        audit(actor, "GRANT_PERMISSION", id),
      ]);
      return { id, ...data };
    }
    if (operation === "revoke") {
      requirePermission(actor, "english.manage_production");
      const input = parse(
        { userId: z.string().uuid(), permission: z.enum(PERMISSIONS) },
        raw,
      );
      ensure(input.userId !== actor.id, "SELF_REVOKE_DENIED", 403);
      const id = `${input.userId}:${input.permission}`,
        row = await repo.get("permissions", id);
      ensure(row, "NOT_FOUND", 404);
      await repo.commit([
        update("permissions", row, {
          ...row.data,
          revokedAt: stamp(),
          revokedBy: actor.id,
        }),
        audit(actor, "REVOKE_PERMISSION", id),
      ]);
      return { revoked: true };
    }
    if (operation === "import") {
      const { dryRun } = parse({ dryRun: z.boolean().default(true) }, raw);
      requirePermission(actor, "english.manage_curriculum");
      const result = await importPackages(repo, actor.id, dryRun);
      if (!dryRun)
        await repo.commit([audit(actor, "IMPORT", "canonical-pilots")]);
      return result;
    }
    ensure(false, "UNKNOWN_OPERATION", 404);
  }
}
