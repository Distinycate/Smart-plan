"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bi, Problem, StudyText } from "./LearningUI";
import { modeThai, statusThai, unitThai } from "./learning-copy";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Data } from "./api";
export function Session({ initial }: { initial: Data }) {
  const router = useRouter();
  const navigating = useRef(false);
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
      if (payload === saved.current) { setStatus("Saved"); return; }
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
  // Next.js links do not trigger beforeunload. Finish the queued save before leaving.
  useEffect(() => {
    const navigate = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || target.target === '_blank' || target.hasAttribute('download')) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || target.getAttribute('href')?.startsWith('#') ||
          row.current.status !== 'ACTIVE' || JSON.stringify(latest.current) === saved.current) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (navigating.current) return;
      navigating.current = true;
      void save().then(() => {
        if (!failed.current) router.push(destination.pathname + destination.search + destination.hash);
      }).catch(() => {}).finally(() => { navigating.current = false; });
    };
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [save, router]);
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
      <Link className="emh-back" href={`/english/units/${session.unitId}`}><Bi th="กลับไปอ่านบทเรียน" en="Back to unit" /></Link>
      <header className="emh-page-title"><p className="emh-eyebrow">{session.unitId} · {unitThai(session.unitId)}</p><h3><Bi th={modeThai[session.mode] || 'ฝึกภาษา'} en={session.mode.replaceAll('_', ' ')} /></h3><p>ทำทีละข้อ ไม่ต้องรีบ คำตอบจะบันทึกอัตโนมัติเมื่อหยุดพิมพ์</p><p lang="en" className="emh-muted">Take your time. Your response saves automatically as you pause.</p></header>
      {session.preview && <p className="emh-draft-note">ฉบับฝึกทดลอง ยังไม่ใช้รับรองระดับภาษา / Authorised pre-human preview.</p>}
      <details><summary><Bi th="ข้อมูลชุดฝึกนี้" en="Session details" /></summary><p>Frozen content: {session.snapshot.contentVersionId} · Rubric: {session.snapshot.rubricVersionId}</p></details>
      {seconds !== null && session.status === "ACTIVE" && (
        <p role="timer" aria-live="off">
          เวลาที่เหลือ / Time remaining: {Math.floor(seconds / 60)}:
          {String(seconds % 60).padStart(2, "0")}. ระบบใช้คำตอบที่บันทึกไว้ในชุดฝึกนี้
        </p>
      )}
      {error && <Problem message={error} />}
      <p role="status" className="emh-status">
        {status && <><span lang="th">{status === 'Saved' ? 'บันทึกแล้ว' : status === 'Saving…' ? 'กำลังบันทึก…' : status === 'Not saved' ? 'ยังไม่บันทึก กรุณาเก็บคำตอบไว้ก่อน' : status.startsWith('Submitted') ? 'ส่งคำตอบแล้ว' : status.startsWith('Time ended') ? 'หมดเวลา ส่งเฉพาะคำตอบที่บันทึกแล้ว' : 'บันทึกและไปข้อถัดไปแล้ว'}</span><span lang="en"> · {status}</span></>}
      </p>
      {["WRITING", "MEDIATION", "ONLINE_INTERACTION"].includes(
        session.mode,
      ) && (
        <div>
          <label htmlFor="response-plan"><Bi th="วางแผนคำตอบ (จดสั้น ๆ ได้)" en="Plan your response" /></label>
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
              ข้อที่ {index + 1} / Task {index + 1} · {modeThai[item.skill] || item.title || item.skill}
            </legend>
            <p className="emh-session-helper">{item.responseType === 'SHORT_ANSWER' ? 'อ่านโจทย์ แล้วพิมพ์คำหรือวลีสั้น ๆ ที่ช่องด้านล่าง ไม่ต้องพิมพ์ทั้งประโยค เว้นแต่โจทย์กำหนด' : item.responseType === 'RECORDING' ? 'อ่านสถานการณ์ เตรียมสิ่งที่จะพูด แล้วอัดเสียงหรือเลือกไฟล์เสียงของคุณ' : 'อ่านสถานการณ์ แล้วตอบตามความเข้าใจของคุณ งานตอบอิสระจะรอผู้ตรวจให้คำแนะนำ'}</p>
            <StudyText text={item.prompt} />
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
                <label htmlFor={`response-${index}`}><Bi th="พิมพ์คำตอบของคุณ" en="Your response" /></label>
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
                  <div key={r.itemId} className="emh-feedback">
                    <h4><Bi th="ผลการฝึกและคำแนะนำ" en="Feedback" /></h4>
                    <p>{r.reviewStatus === 'PENDING_HUMAN' ? 'ส่งงานแล้ว รอผู้ตรวจให้คำแนะนำ' : r.score === 1 ? 'ตอบได้ตรงกับเฉลยแล้ว เก่งมากที่ได้ลองฝึก' : r.score === 0 ? 'คำตอบยังไม่ตรง ลองดูคำอธิบายแล้วกลับไปฝึกอีกครั้งได้' : statusThai[r.reviewStatus] || 'บันทึกผลการฝึกแล้ว'}</p>
                    <p lang="en">{r.feedback}</p>
                    <p>
                      <span lang="en">{r.reviewStatus}{r.score !== null ? ` · Score ${r.score}` : ''}</span>
                    </p>
                    {r.remediation?.map((m: Data) => (
                      <p key={m.errorTag}>ลองทบทวนอีกครั้ง / Revisit: {m.action}</p>
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
            <Bi th="บันทึกและไปข้อถัดไป (ข้อก่อนหน้าจะแก้ไม่ได้)" en="Save and move to next task — previous task locks" />
          </button>
        )}
      {session.status === "ACTIVE" && (
        <div className="emh-session-toolbar"><p className="emh-small">ตรวจคำตอบก่อนส่ง เมื่อส่งแล้วชุดนี้จะแก้ไม่ได้ แต่เริ่มฝึกครั้งใหม่ได้ / Review before submitting.</p>
          <button
            disabled={busy || failed.current || seconds === 0}
            onClick={() => void save().catch(() => {})}
          >
            <Bi th="บันทึกตอนนี้" en="Save now" />
          </button>
          <button
            disabled={busy || failed.current}
            onClick={() => void submit()}
          >
            <Bi th="ส่งคำตอบ" en="Submit final response" />
          </button>
        </div>
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
            <Bi th="ดูประวัติคำตอบที่บันทึก" en="Show saved writing history" />
          </button>
          {history.map((h) => (
            <details key={h.id}>
              <summary>บันทึกเมื่อ / Saved {new Date(h.createdAt).toLocaleString("th-TH")}</summary>
              <p>Rubric: {h.rubricVersionId}</p>
              <pre>{JSON.stringify(h.responses, null, 2)}</pre>
            </details>
          ))}
        </>
      )}
      <div className="emh-end-nav"><Link className="emh-button secondary" href={`/english/units/${session.unitId}`}><Bi th="กลับไปทบทวนบทเรียน" en="Review this unit" /></Link><Link className="emh-button secondary" href="/english/progress"><Bi th="ดูความก้าวหน้าของฉัน" en="View my progress" /></Link></div>
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
      const media = new MediaRecorder(stream.current, { audioBitsPerSecond: 64000 }),
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
      }, 300000);
    } catch {
      setError(
        "ใช้ไมโครโฟนไม่ได้ กรุณาอนุญาตไมค์หรือเลือกไฟล์เสียง / Microphone unavailable. Check permission or upload an audio file.",
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
        ไฟล์เสียงส่วนตัว อัดได้ไม่เกิน 5 นาที ขนาดไม่เกิน 3 MB เฉพาะคุณและผู้ตรวจที่ได้รับมอบหมายเท่านั้นที่เข้าถึงได้ คุณลบเสียงได้จากปุ่มด้านล่าง
        / Private recording, maximum 3 MB. Only you and an assigned reviewer can access it.
      </p>
      <p>
        {policy?.configured
          ? `เก็บเสียง ${policy.retentionDays} วันนับจากอัปโหลด ตามนโยบาย ${policy.version} จากนั้นปิดการเข้าถึงและรอลบ / Retention: ${policy.retentionDays} days.`
          : "กำลังโหลดหรือยังไม่ได้ตั้งค่านโยบายเสียง จึงยังอัปโหลดไม่ได้ / Recording policy is loading or unavailable."}
      </p>
      {!disabled && (
        <>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <Bi th="ฉันเข้าใจการเก็บเสียงส่วนตัวและยินยอมอัปโหลด" en="I understand the private recording notice and consent to upload." />
          </label>
          <button
            disabled={!consent || recording || busy}
            onClick={() => void start()}
          >
            <Bi th="เริ่มอัดเสียง" en="Record audio" />
          </button>
          <button
            disabled={!recording}
            onClick={() => {
              clearTimeout(limit.current);
              recorder.current?.stop();
            }}
          >
            <Bi th="หยุดอัดเสียง" en="Stop recording" />
          </button>
          <label>
            <Bi th="หรือเลือกไฟล์เสียงที่มีอยู่" en="Or choose an audio file" />
            <input
              type="file"
              accept="audio/webm,audio/ogg,audio/wav,audio/mp4,audio/mpeg"
              disabled={busy || recording}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 3 * 1024 * 1024)
                    setError("ไฟล์ต้องไม่เกิน 3 MB / Maximum size is 3 MB.");
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
            <Bi th="บันทึกไฟล์เสียงส่วนตัว" en="Upload private recording" />
          </button>
        </>
      )}
      {recording && (
        <p role="status">กำลังอัดเสียง หยุดอัตโนมัติเมื่อครบ 5 นาที / Recording… automatic stop after five minutes.</p>
      )}
      {error && <Problem message={error} />}
      {deletedId && <p role="status">ลบไฟล์เสียงแล้ว / <span lang="en">Recording deleted.</span></p>}
      {url && <audio controls src={url} aria-label="ฟังเสียงของคุณ / Recording playback" />}
      {recordingId && recordingId !== deletedId && (
        <>
          <p role="status">บันทึกเสียงส่วนตัวแล้ว / Private recording saved</p>
          <button
            onClick={() =>
              api("playback", { id: recordingId })
                .then((d) => setUrl(d.url))
                .catch((e) => setError(e.message))
            }
          >
            <Bi th="ฟังเสียงที่บันทึก" en="Play saved recording" />
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (
                window.confirm(
                  "ลบไฟล์เสียงนี้หรือไม่? ประวัติการฝึกยังอยู่ แต่ไฟล์เสียงจะถูกลบ / Delete this private recording?",
                )
              )
                api("deleteAudio", { id: recordingId })
                  .then(() => {
                    setDeletedId(recordingId);
                    setUrl("");
                    setBlob(null);
                    setError("");
                    if (!disabled) onSaved("");
                  })
                  .catch((e) => setError(e.message));
            }}
          >
            <Bi th="ลบไฟล์เสียงของฉัน" en="Delete my recording" />
          </button>
        </>
      )}
    </div>
  );
}
