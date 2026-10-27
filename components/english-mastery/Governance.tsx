"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Data } from "./api";
const reviewTypes = [
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
];
export function Governance({
  mode,
  permissions,
}: {
  mode: string;
  permissions: string[];
}) {
  const [versions, setVersions] = useState<Data[]>([]),
    [attempts, setAttempts] = useState<Data[]>([]),
    [production, setProduction] = useState<Data | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      if (mode === "reviewer") {
        if (permissions.includes("english.review"))
          setVersions(await api("reviewQueue"));
        if (permissions.includes("english.audit_attempts"))
          setAttempts(await api("ratingQueue"));
      } else if (mode === "author") setVersions(await api("authorQueue"));
      else if (permissions.includes("english.manage_production"))
        setProduction(await api("production"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [mode, permissions]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(operation: string, input: Data) {
    setError("");
    setMessage("");
    try {
      const result = await api(operation, input);
      setMessage(JSON.stringify(result));
      await load();
      return result;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }
  return (
    <>
      <h3>
        {mode === "reviewer"
          ? "Human review and attempt audit"
          : "English Mastery administration"}
      </h3>
      <p>
        No bulk approval. A review must be performed by the named reviewer,
        against this exact version. Structural validation is not Human Review.
      </p>
      {error && (
        <p role="alert" className="emh-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="emh-text">
          {message}
        </p>
      )}
      {mode === "author" ? (
        <>
          <h4>Content revision workbench</h4>
          <p>
            Existing versions and attempts are never overwritten. Every revision
            starts without human reviews, audio QC or pool validation.
          </p>
          {versions.map((v) => (
            <Revision key={v.id} version={v} action={action} />
          ))}
        </>
      ) : mode === "reviewer" ? (
        <>
          <h4>Versioned content queue</h4>
          {versions.map((v) => (
            <Review
              key={v.id}
              version={v}
              comparisons={versions.filter(
                (o) => o.stableId === v.stableId && o.id !== v.id,
              )}
              canPublish={permissions.includes("english.publish")}
              action={action}
            />
          ))}
          <h4>Submitted attempt audit</h4>
          {attempts.map((a) => (
            <Rating key={a.id} attempt={a} action={action} />
          ))}
        </>
      ) : (
        <>
          {permissions.includes("english.manage_curriculum") && (
            <section className="emh-card">
              <h4>Canonical content pipeline</h4>
              <p>
                96 units: six preserved 0.5 sources, six 0.6 pilot derivatives and
                90 original course drafts. Import never publishes.
              </p>
              <button
                onClick={() =>
                  void action("import", { dryRun: true }).catch(() => {})
                }
              >
                Validate / dry-run import
              </button>
              <button
                onClick={() =>
                  void action("import", { dryRun: false }).catch(() => {})
                }
              >
                Import pre-human content
              </button>
            </section>
          )}
          {permissions.includes("english.manage_production") && (
            <GrantForm action={action} />
          )}{" "}
          {permissions.includes("english.manage_assessments") && (
            <ProfileForm action={action} />
          )}
          {permissions.includes("english.manage_production") && (
            <section className="emh-card">
              <h4>Private audio retention</h4>
              <p>
                Uses each recording’s original expiry and approved policy.
                Maximum 100 expired recordings per batch; attempt metadata
                remains.
              </p>
              <button
                onClick={() =>
                  void action("purgeExpired", { dryRun: true }).catch(() => {})
                }
              >
                Preview expired recording count
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Permanently remove up to 100 expired audio files under their recorded retention policy?",
                    )
                  )
                    void action("purgeExpired", { dryRun: false }).catch(
                      () => {},
                    );
                }}
              >
                Delete expired recordings under policy
              </button>
            </section>
          )}
          {production && (
            <>
              <h4>Production readiness — not a release approval</h4>
              <ul>
                {production.externalChecks.map((s: string) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p>
                Recording retention policy configured:{" "}
                {production.audioPolicyConfigured
                  ? "Yes"
                  : "No — uploads disabled"}
              </p>
              <details>
                <summary>Module grants and audit trail</summary>
                <pre>
                  {JSON.stringify(
                    { grants: production.grants, audit: production.audit },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </>
          )}
        </>
      )}
    </>
  );
}
type Action = (operation: string, input: Data) => Promise<any>;
function Revision({ version, action }: { version: Data; action: Action }) {
  const [json, setJson] = useState(JSON.stringify(version.payload, null, 2)),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <details className="emh-card">
      <summary>
        {version.unitId} · Revise {version.version}
      </summary>
      <p>
        Increment the semantic version. Keep stable IDs, canonical source and
        provenance unchanged. If the rubric changes, assign a new rubricVersion.
      </p>
      <label>
        Versioned content JSON
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={18}
        />
      </label>
      <label>
        Change reason / review response
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy || reason.length < 20}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await action("revise", {
              previousVersionId: version.id,
              payload: JSON.parse(json),
              reason,
            });
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Create immutable pre-human revision
      </button>
    </details>
  );
}
function Review({
  version: v,
  comparisons,
  canPublish,
  action,
}: {
  version: Data;
  comparisons: Data[];
  canPublish: boolean;
  action: Action;
}) {
  const [type, setType] = useState("LANGUAGE"),
    [decision, setDecision] = useState("REVISE"),
    [notes, setNotes] = useState(""),
    [flags, setFlags] = useState(""),
    [attest, setAttest] = useState(false),
    [busy, setBusy] = useState(false);
  async function review() {
    setBusy(true);
    try {
      await action("review", {
        versionId: v.id,
        type,
        decision,
        notes,
        blockingFlags: flags
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        attestation: attest,
      });
      setAttest(false);
      setNotes("");
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="emh-card">
      <summary>
        {v.unitId} · {v.version} · {v.state}
      </summary>
      <p>Checksum: {v.checksum}</p>
      <p>Source: {v.payload.provenance}</p>
      <p>
        Missing review: {v.gate.missing.join(", ") || "None"}; blockers:{" "}
        {v.gate.blockers.join(", ") || "None"}
      </p>
      <details>
        <summary>Canonical source, keys and rubric — reviewer only</summary>
        <pre>{v.payload.sourceText || JSON.stringify(v.payload, null, 2)}</pre>
      </details>
      {comparisons.map((other) => (
        <details key={other.id}>
          <summary>Compare with {other.version}</summary>
          <p>Previous checksum: {other.checksum}</p>
          <pre>
            {JSON.stringify(
              {
                previousLessons: other.payload.lessons,
                currentLessons: v.payload.lessons,
              },
              null,
              2,
            )}
          </pre>
        </details>
      ))}
      <label>
        Review type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {reviewTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Decision
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option>REVISE</option>
          <option>REJECT</option>
          <option>APPROVE</option>
        </select>
      </label>
      <label>
        Review notes / evidence (at least 20 characters)
        <textarea
          minLength={20}
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <label>
        Unresolved blocking flags (one per line)
        <textarea value={flags} onChange={(e) => setFlags(e.target.value)} />
      </label>
      <label>
        <input
          type="checkbox"
          checked={attest}
          onChange={(e) => setAttest(e.target.checked)}
        />
        I personally performed this review for the exact version and type
        selected. This is not an AI or structural check.
      </label>
      <button
        disabled={!attest || notes.length < 20 || busy}
        onClick={() => void review()}
      >
        Record human review
      </button>
      {canPublish && (
        <button
          disabled={!v.gate.allowed || busy}
          onClick={() =>
            void action("publish", { versionId: v.id }).catch(() => {})
          }
        >
          Publish eligible version
        </button>
      )}
      <details>
        <summary>Review history ({v.reviews.length})</summary>
        {v.reviews.map((r: Data) => (
          <article key={r.id}>
            <p>
              {r.type} · {r.decision} · {r.reviewerId} · {r.createdAt}
            </p>
            <p>{r.notes}</p>
            <p>{r.blockingFlags.join(", ")}</p>
          </article>
        ))}
      </details>
    </details>
  );
}
function Rating({ attempt: a, action }: { attempt: Data; action: Action }) {
  const [item, setItem] = useState(a.items[0]?.stableId || ""),
    [scores, setScores] = useState<Data>({}),
    [notes, setNotes] = useState(""),
    [critical, setCritical] = useState(""),
    [attest, setAttest] = useState(false),
    [url, setUrl] = useState("");
  const dimensions: string[] = a.snapshot.rubric?.dimensions || [];
  return (
    <details className="emh-card">
      <summary>
        {a.unitId} · {a.mode} · {a.id.slice(0, 12)}
      </summary>
      <p>Rubric version: {a.snapshot.rubricVersionId}</p>
      <pre>{a.snapshot.rubric?.descriptors}</pre>
      <label>
        Task to rate
        <select value={item} onChange={(e) => setItem(e.target.value)}>
          {a.items.map((i: Data) => (
            <option key={i.stableId} value={i.stableId}>
              {i.title || i.stableId}
            </option>
          ))}
        </select>
      </label>
      <p className="emh-text">
        {a.items.find((i: Data) => i.stableId === item)?.prompt}
      </p>
      <p className="emh-text">{a.drafts[item] || "No response"}</p>
      {a.items.find((i: Data) => i.stableId === item)?.responseType ===
        "RECORDING" &&
        a.drafts[item] && (
          <button
            onClick={() =>
              void action("playback", { id: a.drafts[item] })
                .then((d) => setUrl(d.url))
                .catch(() => {})
            }
          >
            Play submitted recording (audited)
          </button>
        )}
      {url && <audio controls src={url} aria-label="Submitted recording" />}
      {dimensions.map((d) => (
        <label key={d}>
          {d}
          <select
            value={scores[d] ?? ""}
            onChange={(e) =>
              setScores((p) => ({ ...p, [d]: Number(e.target.value) }))
            }
          >
            <option value="">Select 0–4</option>
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label>
        Feedback with evidence
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label>
        Critical errors requiring remediation (one per line)
        <textarea
          value={critical}
          onChange={(e) => setCritical(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={attest}
          onChange={(e) => setAttest(e.target.checked)}
        />
        I personally rated this response using the frozen level-specific rubric.
      </label>
      <button
        disabled={
          !attest ||
          notes.length < 20 ||
          dimensions.length === 0 ||
          dimensions.some((d) => scores[d] === undefined)
        }
        onClick={() =>
          void action("rate", {
            attemptId: a.id,
            itemId: item,
            scores,
            notes,
            criticalErrors: critical.split("\n").filter(Boolean),
            attestation: attest,
          })
            .then(() => setAttest(false))
            .catch(() => {})
        }
      >
        Save human rubric rating
      </button>
    </details>
  );
}
function GrantForm({ action }: { action: Action }) {
  const [userId, setUserId] = useState(""),
    [permission, setPermission] = useState("english.learn"),
    [units, setUnits] = useState("*"),
    [types, setTypes] = useState("");
  return (
    <form
      className="emh-card"
      onSubmit={(e) => {
        e.preventDefault();
        void action("grant", {
          userId,
          permission,
          units: units.split(",").map((s) => s.trim()),
          reviewTypes: types
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }).catch(() => {});
      }}
    >
      <h4>Invite an existing Smart Plan user to EMH</h4>
      <p>
        This does not create an identity or change their Smart Plan role. Grant
        only the required scope; self-grants are denied.
      </p>
      <label>
        Existing user UUID
        <input
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </label>
      <label>
        Permission
        <select
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
        >
          {[
            "learn",
            "preview",
            "author",
            "review",
            "publish",
            "manage_curriculum",
            "manage_assessments",
            "audit_attempts",
            "manage_production",
          ].map((p) => (
            <option key={p}>english.{p}</option>
          ))}
        </select>
      </label>
      <label>
        Units (comma-separated IDs, or *)
        <input value={units} onChange={(e) => setUnits(e.target.value)} />
      </label>
      <label>
        Review types (comma-separated; use * only for an authorised all-type
        reviewer)
        <input value={types} onChange={(e) => setTypes(e.target.value)} />
      </label>
      <button>Grant scoped permission</button>
      <button
        type="button"
        className="secondary"
        disabled={!userId}
        onClick={() => {
          if (window.confirm(`Revoke ${permission} from this existing user?`))
            void action("revoke", { userId, permission }).catch(() => {});
        }}
      >
        Revoke selected permission
      </button>
    </form>
  );
}
function ProfileForm({ action }: { action: Action }) {
  const [json, setJson] = useState("");
  return (
    <details className="emh-card">
      <summary>Create versioned exam profile draft</summary>
      <p>
        Required fields: id, provider (CAMBRIDGE or LANGUAGECERT), name, level,
        version, sourceUrl (official provider), checkedDate (YYYY-MM-DD),
        timeLimitSeconds, itemIds, sections (name + itemIds), navigation (FREE
        or SEQUENTIAL), replayLimit. Enter verified specifications; no timing is
        prefilled.
      </p>
      <label>
        Profile JSON
        <textarea value={json} onChange={(e) => setJson(e.target.value)} />
      </label>
      <button
        disabled={!json.trim()}
        onClick={() => {
          let parsed;
          try {
            parsed = JSON.parse(json);
          } catch {
            window.alert("Invalid JSON");
            return;
          }
          void action("createProfile", parsed).catch(() => {});
        }}
      >
        Create draft — not approved
      </button>
    </details>
  );
}
