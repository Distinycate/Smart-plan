import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { database, SqlRepository, USERS } from "./database";
import {
  importPackages,
  loadPackages,
} from "../../lib/english-mastery/content";
import { EnglishService } from "../../lib/english-mastery/service";
import {
  hash,
  PERMISSIONS,
  type Actor,
} from "../../lib/english-mastery/policy";
import { insert, update } from "../../lib/english-mastery/repository";
import { detectAudio, MediaService } from "../../lib/english-mastery/media";
import { PGlite } from "@electric-sql/pglite";
let db: Awaited<ReturnType<typeof database>>, repo: SqlRepository;
const actor = (
  id: string,
  permissions: readonly any[] = PERMISSIONS,
): Actor => ({
  id,
  grants: permissions.map((permission) => ({
    permission,
    units: ["*"],
    reviewTypes: ["*"],
  })),
});
const learner = new EnglishService(
  {} as any,
  actor(USERS.learner, ["english.learn", "english.preview"]),
);
const request = () => crypto.randomUUID();
const version = "UNIT-A1-02-PILOT@0.6.0";
before(async () => {
  db = await database();
  repo = new SqlRepository(db);
  learner.repo = repo;
  await importPackages(repo, USERS.author, false);
});
after(async () => {
  await db?.close();
});

test("96 metadata and both versions of six canonical pilots; idempotent import", async () => {
  assert.equal((await loadPackages()).length, 12);
  assert.equal((await repo.list("curriculum")).length, 96);
  assert.equal((await importPackages(repo, USERS.author, false)).changes, 0);
  const rows = await repo.list("content_versions");
  assert.equal(rows.length, 12);
  assert(rows.every((r) => r.data.state === "PRE_HUMAN_CONTENT_COMPLETE"));
  assert.equal(
    (await db.query<{ body: string }>('SELECT body FROM "LessonPlans"')).rows[0]
      .body,
    "existing host data",
  );
});
test("source payload immutable; jsonb canonical checksum survives round trip", async () => {
  const row = (await repo.get("content_versions", version))!;
  assert.equal(hash(row.data.payload), row.data.checksum);
  await assert.rejects(
    repo.commit([
      update("content_versions", row, { ...row.data, title: "changed" }),
    ]),
    /IMMUTABLE/,
  );
});
test("learner cannot access draft without explicit preview; no keys or source in learner projection", async () => {
  const ordinary = new EnglishService(
    repo,
    actor(USERS.other, ["english.learn"]),
  );
  await assert.rejects(ordinary.run("content", { unitId: "A1-02" }));
  const c = await learner.run("content", { unitId: "A1-02" });
  assert.equal(c.preview, true);
  assert.equal(c.lessons.length, 4);
  const text = JSON.stringify(c);
  for (const key of ["acceptedAnswers", "sourceText", "expected", "reviewerId"])
    assert(!text.includes(`"${key}"`));
});
test("pre-response snapshot, idempotency, autosave CAS, cross-owner denial, submitted lock", async () => {
  const args = {
    contentVersionId: version,
    mode: "PRACTICE",
    requestId: request(),
  };
  const a = await learner.run("start", args);
  assert.equal(a.revision, 0);
  assert(a.snapshot.contentChecksum);
  assert.equal((await learner.run("start", args)).id, a.id);
  const other = new EnglishService(repo, actor(USERS.other));
  await assert.rejects(other.run("session", { id: a.id }), /NOT_FOUND/);
  const b = await learner.run("save", {
    id: a.id,
    revision: 0,
    responses: { [a.items[0].stableId]: "Hello" },
  });
  await assert.rejects(
    learner.run("save", { id: a.id, revision: 0, responses: {} }),
    /REVISION_CONFLICT/,
  );
  const c = await learner.run("submit", { id: a.id, revision: b.revision });
  assert.equal(c.responses[0].score, 1);
  await assert.rejects(
    learner.run("save", { id: a.id, revision: c.revision, responses: {} }),
    /SUBMISSION_LOCKED/,
  );
  assert.equal(
    (await learner.run("submit", { id: a.id, revision: 0 })).status,
    "SUBMITTED",
  );
  const row = (await repo.get("attempts", a.id))!;
  await assert.rejects(
    repo.commit([update("attempts", row, { ...row.data, status: "ACTIVE" })]),
    /FROZEN/,
  );
});
test("writing history freezes rubric; human-required result and uncalibrated readiness", async () => {
  const a = await learner.run("start", {
    contentVersionId: version,
    mode: "WRITING",
    requestId: request(),
  });
  const b = await learner.run("save", {
    id: a.id,
    revision: 0,
    responses: { [a.items[0].stableId]: "My name is May. I am from Thailand." },
  });
  assert.equal((await learner.run("history", { id: a.id })).length, 1);
  const c = await learner.run("submit", { id: a.id, revision: b.revision });
  assert.equal(c.responses[0].reviewStatus, "PENDING_HUMAN");
  const p = await learner.run("progress", {});
  assert.equal(p.readiness.certification, false);
  assert.equal(p.readiness.status, "NOT_ENOUGH_EVIDENCE");
  assert(p.queue.length > 0);
});
test("publication blocked, self-review denied, scoped review enforced", async () => {
  const author = new EnglishService(repo, actor(USERS.author));
  await assert.rejects(
    author.run("publish", { versionId: version }),
    /HUMAN_REVIEW_REQUIRED/,
  );
  const input = {
    versionId: version,
    type: "LANGUAGE",
    decision: "APPROVE",
    notes: "Synthetic test only; never real academic approval.",
    blockingFlags: [],
    attestation: true,
  };
  await assert.rejects(author.run("review", input), /SELF_REVIEW_DENIED/);
  const limited = new EnglishService(repo, {
    id: USERS.reviewer,
    grants: [
      {
        permission: "english.review",
        units: ["B2-01"],
        reviewTypes: ["LANGUAGE"],
      },
    ],
  });
  await assert.rejects(limited.run("review", input), /PERMISSION_DENIED/);
  await assert.rejects(learner.run("review", input), /PERMISSION_DENIED/);
});
test("RLS: foreign attempts and private content denied, all direct mutations/RPC denied", async () => {
  await db.exec(
    `SET ROLE authenticated; SET request.jwt.claim.sub='${USERS.other}'`,
  );
  assert.equal((await db.query("SELECT * FROM emh_attempts")).rows.length, 0);
  await assert.rejects(
    db.query("SELECT * FROM emh_content_versions"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("UPDATE emh_attempts SET data='{}'"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("SELECT emh_commit('[]')"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("INSERT INTO emh_permissions(id,data) VALUES('escalate','{}')"),
    /permission denied/,
  );
  await db.exec("RESET ROLE");
});
test("private bucket restrictive policy defeats legacy permissive policies", async () => {
  await db.exec(
    "INSERT INTO storage.objects VALUES('audio','emh-learner-recordings','private'); SET ROLE authenticated",
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM storage.objects WHERE bucket_id='emh-learner-recordings'",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "INSERT INTO storage.objects VALUES('bad','emh-learner-recordings','spoof')",
    ),
    /row-level security/,
  );
  await db.exec("RESET ROLE");
});
test("transaction rollback prevents partial batch and table-name injection", async () => {
  await assert.rejects(
    repo.commit([
      insert("audit", "rollback", USERS.author, { action: "test" }),
      insert("content_versions", version, USERS.author, {}),
    ]),
  );
  assert.equal(await repo.get("audit", "rollback"), null);
  await assert.rejects(
    db.query("SELECT emh_commit($1)", [
      JSON.stringify([
        {
          table: "profiles",
          id: USERS.learner,
          expected: -1,
          data: { role: "admin" },
        },
      ]),
    ]),
    /TABLE_DENIED/,
  );
});
test("magic-byte validation rejects renamed non-audio", () => {
  assert.equal(detectAudio(Buffer.from("<html>not audio</html>")), null);
  const wav = Buffer.alloc(20);
  wav.write("RIFF");
  wav.write("WAVE", 8);
  assert.equal(detectAudio(wav), "audio/wav");
});

test("editorial revision is new, source-bound, unreviewed and does not change prior attempt", async () => {
  const original = (await repo.get("content_versions", version))!,
    payload = structuredClone(original.data.payload);
  payload.version = "0.6.1";
  payload.title += " — test revision";
  const author = new EnglishService(repo, actor(USERS.author));
  await assert.rejects(
    learner.run("revise", {
      previousVersionId: version,
      payload,
      reason: "TEST ONLY: revise title without overwriting history.",
    }),
    /PERMISSION_DENIED/,
  );
  const result = await author.run("revise", {
    previousVersionId: version,
    payload,
    reason: "TEST ONLY: revise title without overwriting history.",
  });
  const revised = (await repo.get("content_versions", result.id))!;
  assert.equal(revised.data.state, "PRE_HUMAN_CONTENT_COMPLETE");
  assert(
    revised.data.payload.practice.every(
      (i: any) => i.poolState === "DRAFT_ITEM",
    ),
  );
  assert.equal(
    (await repo.get("content_versions", version))!.data.checksum,
    original.data.checksum,
  );
  await assert.rejects(
    author.run("publish", { versionId: result.id }),
    /HUMAN_REVIEW_REQUIRED/,
  );
  payload.version = "0.6.2";
  payload.sourceText = "forged";
  await assert.rejects(
    author.run("revise", {
      previousVersionId: version,
      payload,
      reason: "TEST ONLY: reject altered provenance source.",
    }),
    /SOURCE_PROVENANCE_IMMUTABLE/,
  );
});

test("database rejects bypass publication; synthetic test-only reviews exercise release lock", async () => {
  // Resolve the actual A2 stable ID instead of assuming a curriculum number.
  const v = (await repo.list("content_versions")).find(
    (v) => v.data.unitId.startsWith("A2") && v.data.version === "0.6.0",
  )!;
  await assert.rejects(
    repo.commit([
      insert("publications", v.id, USERS.reviewer, {
        state: "PUBLISHED",
        checksum: v.data.checksum,
        reviewIds: [],
      }),
    ]),
    /REVIEW_REQUIRED/,
  );
  const reviewer = new EnglishService(repo, actor(USERS.reviewer));
  for (const type of [
    "ACADEMIC",
    "LANGUAGE",
    "THAI",
    "CONSTRUCT",
    "LEVEL",
    "FAIRNESS",
    "KEY_DISTRACTOR",
    "COPYRIGHT",
  ])
    await reviewer.run("review", {
      versionId: v.id,
      type,
      decision: "APPROVE",
      notes: "SYNTHETIC TEST FIXTURE ONLY — not actual human review.",
      blockingFlags: [],
      attestation: true,
    });
  assert.equal(
    (await reviewer.run("publish", { versionId: v.id })).state,
    "PUBLISHED",
  );
  await assert.rejects(
    reviewer.run("review", {
      versionId: v.id,
      type: "LANGUAGE",
      decision: "REVISE",
      notes: "SYNTHETIC TEST ONLY: published versions require a new revision.",
      blockingFlags: [],
      attestation: true,
    }),
    /PUBLISHED_VERSION_FROZEN/,
  );
  const publication = (await repo.get("publications", v.id))!;
  await assert.rejects(
    repo.commit([update("publications", publication, { state: "DRAFT" })]),
    /IMMUTABLE/,
  );
});

test("exam freezes draft profile, enforces sequential saves and server deadline", async () => {
  const admin = new EnglishService(repo, actor(USERS.author)),
    v = (await repo.get("content_versions", version))!;
  const itemIds = v.data.payload.practice
    .slice(0, 2)
    .map((i: any) => i.stableId);
  const profile = await admin.run("createProfile", {
    id: "TEST-ONLY",
    provider: "CAMBRIDGE",
    name: "Synthetic test — no official spec claim",
    level: "A1",
    version: "1.0.0",
    sourceUrl: "https://www.cambridgeenglish.org/",
    checkedDate: "2026-01-01",
    timeLimitSeconds: 60,
    itemIds,
    sections: [{ name: "TEST ONLY", itemIds }],
    navigation: "SEQUENTIAL",
    replayLimit: 0,
  });
  const a = await learner.run("start", {
    contentVersionId: version,
    mode: "EXAM_SIMULATION",
    examProfileId: profile.id,
    requestId: request(),
  });
  assert.equal(a.snapshot.examProfile.state, "DRAFT");
  assert.equal(a.evidenceEligible, false);
  await assert.rejects(
    learner.run("save", {
      id: a.id,
      revision: 0,
      responses: { [itemIds[1]]: "future" },
    }),
    /SEQUENTIAL_ITEM_LOCKED/,
  );
  const b = await learner.run("save", {
    id: a.id,
    revision: 0,
    responses: { [itemIds[0]]: "Hello" },
  });
  const c = await learner.run("advance", { id: a.id, revision: b.revision });
  assert.equal(c.currentIndex, 1);
  await assert.rejects(
    learner.run("save", {
      id: a.id,
      revision: c.revision,
      responses: { [itemIds[0]]: "changed" },
    }),
    /SEQUENTIAL_ITEM_LOCKED/,
  );
  const row = (await repo.get("attempts", a.id))!;
  await repo.commit([
    update("attempts", row, {
      ...row.data,
      deadlineAt: new Date(Date.now() - 1000).toISOString(),
    }),
  ]);
  await assert.rejects(
    learner.run("save", { id: a.id, revision: c.revision + 1, responses: {} }),
    /TIME_EXPIRED/,
  );
  const final = await learner.run("submit", {
    id: a.id,
    revision: c.revision + 1,
  });
  assert.equal(final.responses[0].rawResponse, "Hello");
});

test("audio consent, retention, ownership, reviewer scope and idempotent physical deletion", async () => {
  const objects = new Map<string, Uint8Array>();
  const client = {
    storage: {
      from: () => ({
        upload: async (key: string, bytes: Uint8Array) => {
          objects.set(key, bytes);
          return { error: null };
        },
        createSignedUrl: async (key: string) => ({
          data: { signedUrl: `https://example.test/private/${key}` },
          error: null,
        }),
        remove: async (keys: string[]) => {
          keys.forEach((k) => objects.delete(k));
          return { error: null };
        },
      }),
    },
  } as any;
  const a = await learner.run("start", {
      contentVersionId: version,
      mode: "SPEAKING",
      requestId: request(),
    }),
    media = new MediaService(learner, client);
  const bytes = Buffer.alloc(44);
  bytes.write("RIFF");
  bytes.write("WAVE", 8);
  const prevPolicy = process.env.EMH_RECORDING_POLICY_VERSION,
    prevDays = process.env.EMH_RECORDING_RETENTION_DAYS;
  try {
    delete process.env.EMH_RECORDING_POLICY_VERSION;
    await assert.rejects(
      media.upload(a.id, a.items[0].stableId, bytes, true),
      /RECORDING_POLICY_REQUIRED/,
    );
    process.env.EMH_RECORDING_POLICY_VERSION = "TEST-ONLY";
    process.env.EMH_RECORDING_RETENTION_DAYS = "1";
    await assert.rejects(
      media.upload(a.id, a.items[0].stableId, bytes, false),
      /RECORDING_NOTICE_REQUIRED/,
    );
    const recording = await media.upload(
      a.id,
      a.items[0].stableId,
      bytes,
      true,
    );
    assert.equal(objects.size, 1);
    const foreign = new MediaService(
      new EnglishService(repo, actor(USERS.other, ["english.learn"])),
      client,
    );
    await assert.rejects(foreign.delete(recording.id), /NOT_FOUND/);
    await assert.rejects(foreign.playback(recording.id));
    const exported = await learner.run("export", {});
    assert(exported.recordings.some((r: any) => r.id === recording.id));
    assert(!JSON.stringify(exported.recordings).includes("objectPath"));
    await media.delete(recording.id);
    assert.equal(objects.size, 0);
    await media.delete(recording.id);
    await assert.rejects(media.playback(recording.id), /RECORDING_UNAVAILABLE/);
  } finally {
    if (prevPolicy === undefined)
      delete process.env.EMH_RECORDING_POLICY_VERSION;
    else process.env.EMH_RECORDING_POLICY_VERSION = prevPolicy;
    if (prevDays === undefined) delete process.env.EMH_RECORDING_RETENTION_DAYS;
    else process.env.EMH_RECORDING_RETENTION_DAYS = prevDays;
  }
});

test("local PostgreSQL backup/restore preserves content and frozen attempts", async () => {
  const snapshot = await db.dumpDataDir(),
    restored = new PGlite({ loadDataDir: snapshot });
  try {
    const restoredRepo = new SqlRepository(restored);
    assert.equal(
      (await restoredRepo.get("content_versions", version))!.data.checksum,
      (await repo.get("content_versions", version))!.data.checksum,
    );
    assert.deepEqual(
      await restoredRepo.list("attempts"),
      await repo.list("attempts"),
    );
  } finally {
    await restored.close();
  }
});

test("operator grants/revokes only existing users and retention purge selects only expired media", async () => {
  const admin = new EnglishService(repo, actor(USERS.author));
  await assert.rejects(
    admin.run("grant", {
      userId: USERS.author,
      permission: "english.publish",
      units: ["*"],
      reviewTypes: [],
    }),
    /SELF_GRANT_DENIED/,
  );
  await assert.rejects(
    admin.run("grant", {
      userId: "00000000-0000-4000-8000-999999999999",
      permission: "english.learn",
      units: ["*"],
      reviewTypes: [],
    }),
  );
  await admin.run("grant", {
    userId: USERS.other,
    permission: "english.preview",
    units: ["A1-02"],
    reviewTypes: [],
  });
  await admin.run("revoke", {
    userId: USERS.other,
    permission: "english.preview",
  });
  assert(
    (await repo.get("permissions", `${USERS.other}:english.preview`))!.data
      .revokedAt,
  );
  const a = (await repo.list("attempts", USERS.learner))[0],
    removed: string[] = [];
  await repo.commit([
    insert("recordings", "expiry-test", USERS.learner, {
      attemptId: a.id,
      objectPath: "TEST/EXPIRED",
      status: "READY",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      policyVersion: "TEST-ONLY",
    }),
    insert("recordings", "unexpired-test", USERS.learner, {
      attemptId: a.id,
      objectPath: "TEST/KEEP",
      status: "READY",
      expiresAt: new Date(Date.now() + 100000).toISOString(),
    }),
  ]);
  const client = {
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          removed.push(...paths);
          return { error: null };
        },
      }),
    },
  } as any;
  await assert.rejects(
    new MediaService(learner, client).purgeExpired(false),
    /PERMISSION_DENIED/,
  );
  const media = new MediaService(admin, client);
  assert.equal((await media.purgeExpired(true)).eligible, 1);
  assert.equal(removed.length, 0);
  assert.equal((await media.purgeExpired(false)).deleted, 1);
  assert.deepEqual(removed, ["TEST/EXPIRED"]);
  assert.equal(
    (await repo.get("recordings", "unexpired-test"))!.data.status,
    "READY",
  );
});
