import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EnglishService } from "./service";
import { ensure, insert, update } from "./repository";
import { requirePermission, hash } from "./policy";
export const BUCKET = "emh-learner-recordings";
export const MAX_AUDIO = 3 * 1024 * 1024;
export function detectAudio(bytes: Uint8Array) {
  const ascii = (start: number, end: number) =>
    Buffer.from(bytes.slice(start, end)).toString("ascii");
  if (bytes.length < 12) return null;
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
    return "audio/webm";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "audio/wav";
  if (ascii(4, 8) === "ftyp") return "audio/mp4";
  if (
    ascii(0, 3) === "ID3" ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
  )
    return "audio/mpeg";
  return null;
}
export class MediaService {
  constructor(
    private service: EnglishService,
    private client: SupabaseClient,
  ) {}
  async purgeExpired(dryRun: boolean) {
    requirePermission(this.service.actor, "english.manage_production");
    const records = (await this.service.repo.list("recordings"))
      .filter(
        (r) =>
          r.data.status !== "DELETED" &&
          Date.parse(r.data.expiresAt) <= Date.now(),
      )
      .slice(0, 100);
    if (dryRun) return { dryRun: true, eligible: records.length, limit: 100 };
    for (const record of records) {
      await this.service.repo.commit([
        update("recordings", record, { ...record.data, status: "DELETING" }),
      ]);
      const { error } = await this.client.storage
        .from(BUCKET)
        .remove([record.data.objectPath]);
      ensure(!error, "AUDIO_DELETE_RETRY_REQUIRED", 503);
      const latest = (await this.service.repo.get("recordings", record.id))!;
      await this.service.repo.commit([
        update("recordings", latest, {
          ...latest.data,
          status: "DELETED",
          deletedAt: new Date().toISOString(),
        }),
        insert("audit", randomUUID(), this.service.actor.id, {
          action: "RETENTION_AUDIO_DELETE",
          target: record.id,
          policyVersion: record.data.policyVersion,
          createdAt: new Date().toISOString(),
        }),
      ]);
    }
    return { dryRun: false, deleted: records.length, limit: 100 };
  }
  async upload(
    attemptId: string,
    itemId: string,
    bytes: Uint8Array,
    consent: boolean,
  ) {
    const actor = this.service.actor;
    ensure(consent, "RECORDING_NOTICE_REQUIRED");
    const days = Number(process.env.EMH_RECORDING_RETENTION_DAYS),
      policy = process.env.EMH_RECORDING_POLICY_VERSION;
    ensure(
      policy && Number.isInteger(days) && days > 0 && days <= 3650,
      "RECORDING_POLICY_REQUIRED",
      409,
    );
    ensure(
      bytes.length > 0 && bytes.length <= MAX_AUDIO,
      "AUDIO_SIZE_LIMIT",
      413,
    );
    const mime = detectAudio(bytes);
    ensure(mime, "UNSUPPORTED_AUDIO", 415);
    const attempt = await this.service.own("attempts", attemptId);
    requirePermission(actor, "english.learn", attempt.data.unitId);
    ensure(attempt.data.status === "ACTIVE", "SUBMISSION_LOCKED", 409);
    ensure(
      !attempt.data.deadlineAt ||
        Date.parse(attempt.data.deadlineAt) > Date.now(),
      "TIME_EXPIRED",
      409,
    );
    ensure(
      attempt.data.items.some(
        (i: any) => i.stableId === itemId && i.responseType === "RECORDING",
      ),
      "RECORDING_ITEM_REQUIRED",
    );
    const existing = (
      await this.service.repo.list("recordings", actor.id)
    ).filter(
      (r) =>
        r.data.attemptId === attemptId &&
        r.data.itemId === itemId &&
        r.data.status === "READY",
    );
    ensure(
      attempt.data.mode === "PRACTICE" ||
        attempt.data.preview ||
        existing.length === 0,
      "RERECORD_NOT_ALLOWED",
      409,
    );
    const id = randomUUID(),
      key = `${actor.id}/${attemptId}/${id}`;
    const data = {
      attemptId,
      itemId,
      objectPath: key,
      status: "UPLOADING",
      mime,
      size: bytes.length,
      checksum: hash(Array.from(bytes)),
      consent: true,
      policyVersion: policy,
      retentionDays: days,
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    await this.service.repo.commit([insert("recordings", id, actor.id, data)]);
    const result = await this.client.storage
      .from(BUCKET)
      .upload(key, bytes, { contentType: mime, upsert: false });
    ensure(!result.error, "AUDIO_UPLOAD_FAILED", 503);
    const record = await this.service.own("recordings", id);
    await this.service.repo.commit([
      update("recordings", record, { ...data, status: "READY" }),
    ]);
    return { id, mime, size: bytes.length };
  }
  async playback(id: string) {
    const record = await this.service.repo.get("recordings", id);
    ensure(record, "NOT_FOUND", 404);
    if (record.owner_id !== this.service.actor.id) {
      const a = await this.service.repo.get("attempts", record.data.attemptId);
      ensure(a && a.data.status === "SUBMITTED", "NOT_FOUND", 404);
      requirePermission(
        this.service.actor,
        "english.audit_attempts",
        a.data.unitId,
      );
      await this.service.repo.commit([
        insert("audit", randomUUID(), this.service.actor.id, {
          action: "REVIEW_AUDIO_ACCESS",
          target: id,
          createdAt: new Date().toISOString(),
        }),
      ]);
    }
    ensure(
      record.data.status === "READY" &&
        Date.parse(record.data.expiresAt) > Date.now(),
      "RECORDING_UNAVAILABLE",
      410,
    );
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(record.data.objectPath, 60);
    ensure(!error && data?.signedUrl, "AUDIO_PLAYBACK_FAILED", 503);
    return { url: data.signedUrl };
  }
  async delete(id: string) {
    const record = await this.service.own("recordings", id);
    if (record.data.status === "DELETED") return { deleted: true };
    // Disable all future links before deleting the exact object. Retry is idempotent.
    await this.service.repo.commit([
      update("recordings", record, { ...record.data, status: "DELETING" }),
      insert("audit", randomUUID(), this.service.actor.id, {
        action: "OWNER_AUDIO_DELETE",
        target: id,
        createdAt: new Date().toISOString(),
      }),
    ]);
    const { error } = await this.client.storage
      .from(BUCKET)
      .remove([record.data.objectPath]);
    ensure(!error, "AUDIO_DELETE_RETRY_REQUIRED", 503);
    const latest = await this.service.own("recordings", id);
    await this.service.repo.commit([
      update("recordings", latest, {
        ...latest.data,
        status: "DELETED",
        deletedAt: new Date().toISOString(),
      }),
    ]);
    return { deleted: true };
  }
}
