"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Data } from "./api";
import { Session } from "./Session";
import { Governance } from "./Governance";
import "./module.css";
const tabs = [
  ["", "Learning path"],
  ["practice", "Practice"],
  ["review", "Spaced review"],
  ["assessments", "Assessments"],
  ["writing", "Writing"],
  ["speaking", "Speaking"],
  ["mediation", "Mediation"],
  ["interaction", "Online interaction"],
  ["progress", "Progress"],
  ["exam", "Exam simulation"],
];
export function Module({
  path,
  permissions,
}: {
  path: string[];
  permissions: string[];
}) {
  const page = path[0] || "",
    resourceId = path[1],
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    setError("");
    setData(null);
    try {
      if (page === "units")
        setData(await api("content", { unitId: resourceId }));
      else if (["progress", "review"].includes(page))
        setData(await api("progress"));
      else if (page === "sessions")
        setData(await api("session", { id: resourceId }));
      else if (page === "exam")
        setData({ profiles: await api("profiles"), ...(await api("catalog")) });
      else if (!["author", "reviewer", "admin"].includes(page))
        setData(await api("catalog"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [page, resourceId]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return (
    <section className="emh" aria-label="English Mastery Hub" lang="en">
      <header className="emh-heading">
        <p className="emh-eyebrow">SMART PLAN · LEARNING MODULE</p>
        <h2>English Mastery Hub</h2>
        <p>Learn, practise and build evidence — A1 to C2.</p>
      </header>
      <nav aria-label="English Mastery">
        <ul>
          {tabs.map(([href, label]) => (
            <li key={href}>
              <Link
                aria-current={page === href ? "page" : undefined}
                href={`/english${href ? `/${href}` : ""}`}
              >
                {label}
              </Link>
            </li>
          ))}
          {permissions.includes("english.author") && (
            <li>
              <Link href="/english/author">Authoring</Link>
            </li>
          )}
          {(permissions.includes("english.review") ||
            permissions.includes("english.audit_attempts")) && (
            <li>
              <Link href="/english/reviewer">Human review</Link>
            </li>
          )}
          {permissions.some((p) =>
            [
              "english.manage_production",
              "english.manage_curriculum",
              "english.manage_assessments",
            ].includes(p),
          ) && (
            <li>
              <Link href="/english/admin">Administration</Link>
            </li>
          )}
        </ul>
      </nav>
      <p className="emh-notice">
        Internal learning evidence, not an official CEFR certificate. AI
        feedback and scoring are disabled.
      </p>
      {error ? (
        <div role="alert" className="emh-error">
          <p>{error}</p>
          <button onClick={() => void reload()}>Try again</button>
        </div>
      ) : null}
      {["author", "reviewer", "admin"].includes(page) ? (
        <Governance mode={page} permissions={permissions} />
      ) : data ? (
        page === "units" ? (
          <Unit data={data} lessonId={path[2]} />
        ) : page === "sessions" ? (
          <Session key={data.id} initial={data} />
        ) : ["progress", "review"].includes(page) ? (
          <Progress data={data} queueOnly={page === "review"} />
        ) : (
          <Catalog data={data} mode={page} />
        )
      ) : !error ? (
        <p role="status">Loading your learning space…</p>
      ) : null}
    </section>
  );
}
function Catalog({ data, mode }: { data: Data; mode: string }) {
  const router = useRouter(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [level, setLevel] = useState("A1"),
    [profile, setProfile] = useState("");
  const names: Data = {
    practice: "PRACTICE",
    writing: "WRITING",
    speaking: "SPEAKING",
    mediation: "MEDIATION",
    interaction: "ONLINE_INTERACTION",
    assessments: "UNIT_MASTERY",
    exam: "EXAM_SIMULATION",
  };
  const [assessment, setAssessment] = useState("UNIT_MASTERY");
  async function start(unitId: string) {
    setBusy(true);
    setError("");
    try {
      const c = await api("content", { unitId }),
        s = await api("start", {
          contentVersionId: c.id,
          mode: mode === "assessments" ? assessment : names[mode],
          requestId: crypto.randomUUID(),
          ...(mode === "exam" ? { examProfileId: profile } : {}),
        });
      router.push(`/english/sessions/${s.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h3>
        {mode ? tabs.find((t) => t[0] === mode)?.[1] : "Your learning path"}
      </h3>
      <p>
        96 units with complete text drafts. Content is available only with
        explicit preview permission until human review is complete.
      </p>
      <label>
        CEFR learning level
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      {mode === "assessments" && (
        <label>
          Assessment layer
          <select
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
          >
            <option value="UNIT_MASTERY">Unit Mastery</option>
            <option value="SKILLS">Skills evidence</option>
            <option value="LEVEL_READINESS">
              Level Readiness — uncalibrated
            </option>
          </select>
        </label>
      )}
      {mode === "exam" && (
        <>
          <p>
            Original practice only. Profiles are separate, versioned drafts; no
            official provider score or certification.
          </p>
          <label>
            Exam profile
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
            >
              <option value="">Choose a profile</option>
              {data.profiles?.map((p: Data) => (
                <option key={p.id} value={p.id}>
                  {p.provider} · {p.name} · {p.version}
                </option>
              ))}
            </select>
          </label>
          {!data.profiles?.length && (
            <p>
              No exam profile has been configured. An authorised administrator
              must enter source-checked specifications.
            </p>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="emh-grid">
        {data.units
          .filter((u: Data) => u.level === level)
          .map((u: Data) => (
            <article className="emh-card" key={u.id}>
              <p className="emh-eyebrow">{u.id}</p>
              <h4>{u.title}</h4>
              {u.available ? (
                mode ? (
                  <button
                    disabled={busy || (mode === "exam" && !profile)}
                    onClick={() => void start(u.id)}
                  >
                    Start {tabs.find((t) => t[0] === mode)?.[1]}
                  </button>
                ) : (
                  <Link className="emh-button" href={`/english/units/${u.id}`}>
                    Open unit
                  </Link>
                )
              ) : (
                <p>Content not yet released</p>
              )}
            </article>
          ))}
      </div>
      <AttemptHistory />
    </>
  );
}
function AttemptHistory() {
  const [attempts, setAttempts] = useState<Data[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    api("attempts")
      .then(setAttempts)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section>
      <h3>Continue / previous attempts</h3>
      {error && <p role="alert">{error}</p>}
      {attempts.length ? (
        <ul>
          {attempts.map((a) => (
            <li key={a.id}>
              <Link href={`/english/sessions/${a.id}`}>
                {a.unitId} · {a.mode} · {a.status}
                {a.preview ? " · Preview" : ""}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No attempts yet.</p>
      )}
    </section>
  );
}
function Unit({ data, lessonId }: { data: Data; lessonId?: string }) {
  const [message, setMessage] = useState(""),
    router = useRouter();
  const lessons = lessonId
    ? data.lessons.filter((l: Data) => l.id === lessonId)
    : data.lessons;
  async function practice(itemId: string) {
    try {
      const s = await api("start", {
        contentVersionId: data.id,
        mode: "PRACTICE",
        itemId,
        requestId: crypto.randomUUID(),
      });
      router.push(`/english/sessions/${s.id}`);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <h3>
        {data.unitId} · {data.title}
      </h3>
      {data.preview && (
        <p className="emh-notice">
          PRE_HUMAN_CONTENT_COMPLETE — authorised preview, not validated learner
          publication.
        </p>
      )}
      <p>
        Version {data.version}. Listening audio: production and
        pronunciation/technical QC pending; text transcripts are study material,
        not validated listening evidence.
      </p>
      <div className="emh-text">{data.canDo}</div>
      <p role="status">{message}</p>
      {lessons.map((lesson: Data) => (
        <article className="emh-card" key={lesson.id}>
          <h4>
            <Link href={`/english/units/${data.unitId}/${lesson.id}`}>
              {lesson.title}
            </Link>
          </h4>
          {lesson.blocks.map((b: Data, i: number) => (
            <div className="emh-text" key={i}>
              {b.text}
            </div>
          ))}
          <button
            onClick={() =>
              api("complete", {
                contentVersionId: data.id,
                lessonId: lesson.id,
              })
                .then(() => setMessage("Lesson completion saved."))
                .catch((e) => setMessage(e.message))
            }
          >
            Mark lesson complete
          </button>
        </article>
      ))}
      <details>
        <summary>Vocabulary and phrases ({data.vocabulary.length})</summary>
        {data.vocabulary.map((v: Data) => (
          <article key={v.id}>
            <h4>{v.item}</h4>
            <p lang="th">{v.thai}</p>
            <p>{v.example}</p>
          </article>
        ))}
      </details>
      <details>
        <summary>Grammar and communicative functions</summary>
        {data.grammar.map((g: Data) => (
          <article key={g.id}>
            <h4>{g.form}</h4>
            <p>{g.use}</p>
            <p>{g.example}</p>
          </article>
        ))}
      </details>
      <details>
        <summary>Retrieval prompts</summary>
        <ul>
          {data.retrieval.map((r: Data) => (
            <li key={r.id}>{r.prompt}</li>
          ))}
        </ul>
      </details>
      <h3>Practice in context</h3>
      {data.practice.map((i: Data) => (
        <article className="emh-card" key={i.stableId}>
          <p>{i.prompt}</p>
          <button onClick={() => void practice(i.stableId)}>
            Practise {i.stableId}
          </button>
        </article>
      ))}
    </>
  );
}
function Progress({ data, queueOnly }: { data: Data; queueOnly: boolean }) {
  const router = useRouter(),
    [error, setError] = useState("");
  async function retrieve(q: Data) {
    try {
      const s = await api("start", {
        contentVersionId: q.contentVersionId,
        itemId: q.itemId,
        mode: "PRACTICE",
        requestId: crypto.randomUUID(),
      });
      router.push(`/english/sessions/${s.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function download() {
    try {
      const result = await api("export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-english-mastery-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <h3>{queueOnly ? "Spaced review" : "Your evidence and progress"}</h3>
      {error && <p role="alert">{error}</p>}
      {!queueOnly && (
        <>
          <div className="emh-grid">
            <article className="emh-card">
              <h4>Course completion</h4>
              <p>
                {data.courseCompletion} published lessons ·{" "}
                {data.previewLessons} preview lessons
              </p>
            </article>
            <article className="emh-card">
              <h4>Skill evidence</h4>
              <p>
                {
                  data.attempts.filter((a: Data) => a.status === "SUBMITTED")
                    .length
                }{" "}
                submitted attempts
              </p>
              <p>{data.ratings.length} human rubric records</p>
            </article>
            <article className="emh-card">
              <h4>Internal readiness</h4>
              <p>{data.readiness.status}</p>
              <p>{data.readiness.message}</p>
            </article>
          </div>
          <button onClick={() => void download()}>
            Export my learning data
          </button>
        </>
      )}
      <h4>Retrieval queue</h4>
      {data.queue.length ? (
        data.queue.map((q: Data) => (
          <article key={q.id} className="emh-card">
            <p>
              {q.unitId} · {q.itemId}
            </p>
            <p>
              {Date.parse(q.nextDueAt) <= Date.now() ? "Due now" : "Scheduled"}:{" "}
              {new Date(q.nextDueAt).toLocaleString()}
            </p>
            <button onClick={() => void retrieve(q)}>Retrieve again</button>
          </article>
        ))
      ) : (
        <p>No scheduled items yet. Submit practice to build your queue.</p>
      )}
      {!queueOnly && (
        <>
          <h4>Human feedback</h4>
          {data.ratings.map((r: Data) => (
            <article key={r.id}>
              <p>{r.notes}</p>
              {r.criticalErrors.length > 0 && (
                <p>Remediation needed: {r.criticalErrors.join(", ")}</p>
              )}
            </article>
          ))}
          <AttemptHistory />
        </>
      )}
    </>
  );
}
