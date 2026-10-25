"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Data } from "./api";
export function Session({ initial }: { initial: Data }) {
  const [session, setSession] = useState(initial),
    [drafts, setDrafts] = useState<Data>(initial.drafts),
    [plan, setPlan] = useState(initial.plan || ""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState<Data[]>([]),
    [seconds, setSeconds] = useState<number | null>(null);
  const latest = useRef({ drafts, plan }),
    row = useRef(initial),
    saved = useRef(
      JSON.stringify({ drafts: initial.drafts, plan: initial.plan || "" }),
    ),
    pending = useRef<Promise<void>>(Promise.resolve()),
    failed = useRef(false);
  const save = useCallback(() => {
    const task = async () => {
      if (
        row.current.status !== "ACTIVE" ||
        failed.current ||
        (row.current.deadlineAt &&
          Date.parse(row.current.deadlineAt) <= Date.now())
      )
        return;
      const payload = JSON.stringify(latest.current);
      if (payload === saved.current) return;
      setStatus("Saving…");
      try {
        const next = await api("save", {
          id: row.current.id,
          revision: row.current.revision,
          responses: latest.current.drafts,
          plan: latest.current.plan,
        });
        row.current = next;
        setSession(next);
        saved.current = payload;
        setStatus("Saved");
      } catch (e) {
        failed.current = true;
        setStatus("Not saved");
        setError(
          `${(e as Error).message}. Your text remains on this page. Copy it before reloading if another tab changed the attempt.`,
        );
        throw e;
      }
    };
    pending.current = pending.current.then(task, task);
    return pending.current;
  }, []);
  useEffect(() => {
    latest.current = { drafts, plan };
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [drafts, plan, save]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (!session.deadlineAt) return;
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          Math.ceil((Date.parse(session.deadlineAt) - Date.now()) / 1000),
        ),
      );
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session.deadlineAt]);
  const expirySubmission = useRef(false);
  useEffect(() => {
    if (
      seconds !== 0 ||
      row.current.status !== "ACTIVE" ||
      expirySubmission.current
    )
      return;
    expirySubmission.current = true;
    setBusy(true);
    void pending.current
      .catch(() => {})
      .then(async () => {
        const next = await api("submit", {
          id: row.current.id,
          revision: row.current.revision,
        });
        row.current = next;
        setSession(next);
        saved.current = JSON.stringify(latest.current);
        setStatus(
          "Time ended — last server-saved responses submitted. Any unsaved text was not included.",
        );
      })
      .catch((e) =>
        setError(`${e.message}. Use Submit final response to retry.`),
      )
      .finally(() => setBusy(false));
  }, [seconds]);
  async function advance() {
    setBusy(true);
    setError("");
    try {
      await save();
      if (failed.current)
        throw Error("Resolve the save conflict before continuing.");
      const next = await api("advance", {
        id: row.current.id,
        revision: row.current.revision,
      });
      row.current = next;
      setSession(next);
      setStatus("Previous task locked.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await save();
      if (failed.current)
        throw Error("Resolve the save conflict before submitting.");
      const next = await api("submit", {
        id: row.current.id,
        revision: row.current.revision,
      });
      row.current = next;
      setSession(next);
      setStatus("Submitted — final response locked.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const locked = session.status !== "ACTIVE" || busy || seconds === 0;
  return (
    <>
      <h3>
        {session.unitId} · {session.mode.replaceAll("_", " ")}
      </h3>
      {session.preview && (
        <p className="emh-notice">
          Authorised pre-human preview. This attempt is not evidence of
          calibrated readiness.
        </p>
      )}
      <p>
        Frozen content: {session.snapshot.contentVersionId} · Rubric:{" "}
        {session.snapshot.rubricVersionId}
      </p>
      {seconds !== null && session.status === "ACTIVE" && (
        <p role="timer" aria-live="off">
          Time remaining: {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, "0")}. Responses are saved to the
          same frozen session.
        </p>
      )}
      {error && (
        <p role="alert" className="emh-error">
          {error}
        </p>
      )}
      <p role="status" className="emh-status">
        {status}
      </p>
      {["WRITING", "MEDIATION", "ONLINE_INTERACTION"].includes(
        session.mode,
      ) && (
        <div>
          <label htmlFor="response-plan">Plan your response</label>
          <textarea
            id="response-plan"
            value={plan}
            disabled={locked}
            onChange={(e) => setPlan(e.target.value)}
          />
        </div>
      )}
      {session.items.map((item: Data, index: number) =>
        session.status === "ACTIVE" &&
        session.snapshot.examProfile?.navigation === "SEQUENTIAL" &&
        index !== (session.currentIndex || 0) ? null : (
          <fieldset key={item.stableId}>
            <legend>
              Task {index + 1} · {item.title || item.skill}
            </legend>
            <p className="emh-text">{item.prompt}</p>
            {item.responseType === "RECORDING" ? (
              <Recorder
                attemptId={session.id}
                itemId={item.stableId}
                recordingId={drafts[item.stableId] || ""}
                disabled={locked}
                onSaved={(id) =>
                  setDrafts((p) => ({ ...p, [item.stableId]: id }))
                }
              />
            ) : (
              <div>
                <label htmlFor={`response-${index}`}>Your response</label>
                <textarea
                  id={`response-${index}`}
                  maxLength={30000}
                  disabled={locked}
                  value={drafts[item.stableId] || ""}
                  onChange={(e) =>
                    setDrafts((p) => ({
                      ...p,
                      [item.stableId]: e.target.value,
                    }))
                  }
                />
              </div>
            )}
            {session.status === "SUBMITTED" &&
              session.responses
                .filter((r: Data) => r.itemId === item.stableId)
                .map((r: Data) => (
                  <div key={r.itemId}>
                    <h4>Feedback</h4>
                    <p>{r.feedback}</p>
                    <p>
                      {r.reviewStatus}
                      {r.score !== null ? ` · Score ${r.score}` : ""}
                    </p>
                    {r.remediation?.map((m: Data) => (
                      <p key={m.errorTag}>Revisit: {m.action}</p>
                    ))}
                  </div>
                ))}
          </fieldset>
        ),
      )}
      {session.status === "ACTIVE" &&
        session.snapshot.examProfile?.navigation === "SEQUENTIAL" &&
        session.currentIndex < session.items.length - 1 && (
          <button
            disabled={locked || failed.current}
            onClick={() => void advance()}
          >
            Save and move to next task — previous task locks
          </button>
        )}
      {session.status === "ACTIVE" && (
        <>
          <button
            disabled={busy || failed.current || seconds === 0}
            onClick={() => void save().catch(() => {})}
          >
            Save now
          </button>
          <button
            disabled={busy || failed.current}
            onClick={() => void submit()}
          >
            Submit final response
          </button>
        </>
      )}
      {["WRITING", "MEDIATION", "ONLINE_INTERACTION"].includes(
        session.mode,
      ) && (
        <>
          <button
            className="secondary"
            onClick={() =>
              api("history", { id: session.id })
                .then(setHistory)
                .catch((e) => setError(e.message))
            }
          >
            Show saved writing history
          </button>
          {history.map((h) => (
            <details key={h.id}>
              <summary>Saved {new Date(h.createdAt).toLocaleString()}</summary>
              <p>Rubric: {h.rubricVersionId}</p>
              <pre>{JSON.stringify(h.responses, null, 2)}</pre>
            </details>
          ))}
        </>
      )}
    </>
  );
}
function Recorder({
  attemptId,
  itemId,
  recordingId,
  disabled,
  onSaved,
}: {
  attemptId: string;
  itemId: string;
  recordingId: string;
  disabled: boolean;
  onSaved: (id: string) => void;
}) {
  const [consent, setConsent] = useState(false),
    [recording, setRecording] = useState(false),
    [blob, setBlob] = useState<Blob | null>(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [policy, setPolicy] = useState<Data | null>(null);
  useEffect(() => {
    api("mediaPolicy")
      .then(setPolicy)
      .catch((e) => setError(e.message));
  }, []);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    limit = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      clearTimeout(limit.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (!blob) return;
    const local = URL.createObjectURL(blob);
    setUrl(local);
    return () => URL.revokeObjectURL(local);
  }, [blob]);
  async function start() {
    setError("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const media = new MediaRecorder(stream.current),
        parts: BlobPart[] = [];
      recorder.current = media;
      media.ondataavailable = (e) => {
        if (e.data.size) parts.push(e.data);
      };
      media.onstop = () => {
        setBlob(new Blob(parts, { type: media.mimeType }));
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
      };
      media.start();
      setRecording(true);
      limit.current = setTimeout(() => {
        if (media.state === "recording") media.stop();
      }, 120000);
    } catch {
      setError(
        "Microphone unavailable. Check permission or upload an audio file.",
      );
      stream.current?.getTracks().forEach((t) => t.stop());
    }
  }
  async function upload() {
    if (!blob) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("audio", blob, "recording");
      form.set("attemptId", attemptId);
      form.set("itemId", itemId);
      form.set("consent", String(consent));
      const response = await fetch("/api/english/upload", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      onSaved(result.data.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p>
        Private recording, maximum 3 MB. Only you and an authorised assigned
        reviewer can access it. You may delete your recording below.
      </p>
      <p>
        {policy?.configured
          ? `Retention: ${policy.retentionDays} days from upload, under policy ${policy.version}. Expired recordings are inaccessible and queued for deletion.`
          : "Recording policy is not configured or is still loading. Upload is disabled."}
      </p>
      {!disabled && (
        <>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I understand the private recording notice and consent to upload.
          </label>
          <button
            disabled={!consent || recording || busy}
            onClick={() => void start()}
          >
            Record audio
          </button>
          <button
            disabled={!recording}
            onClick={() => {
              clearTimeout(limit.current);
              recorder.current?.stop();
            }}
          >
            Stop recording
          </button>
          <label>
            Or choose an audio file
            <input
              type="file"
              accept="audio/webm,audio/ogg,audio/wav,audio/mp4,audio/mpeg"
              disabled={busy || recording}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 3 * 1024 * 1024)
                    setError("Maximum size is 3 MB.");
                  else setBlob(f);
                }
              }}
            />
          </label>
          <button
            disabled={
              !blob || !consent || busy || recording || !policy?.configured
            }
            onClick={() => void upload()}
          >
            Upload private recording
          </button>
        </>
      )}
      {recording && (
        <p role="status">Recording… automatic stop after two minutes.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {url && <audio controls src={url} aria-label="Recording playback" />}
      {recordingId && recordingId !== deletedId && (
        <>
          <p role="status">Private recording saved</p>
          <button
            onClick={() =>
              api("playback", { id: recordingId })
                .then((d) => setUrl(d.url))
                .catch((e) => setError(e.message))
            }
          >
            Play saved recording
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Delete this private recording? The attempt metadata remains, but the audio will be removed.",
                )
              )
                api("deleteAudio", { id: recordingId })
                  .then(() => {
                    setDeletedId(recordingId);
                    setUrl("");
                    setBlob(null);
                    setError("Recording deleted.");
                    if (!disabled) onSaved("");
                  })
                  .catch((e) => setError(e.message));
            }}
          >
            Delete my recording
          </button>
        </>
      )}
    </div>
  );
}
