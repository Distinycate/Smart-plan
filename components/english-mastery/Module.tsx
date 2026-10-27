"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Check, ChevronLeft, Compass, Layers, RotateCcw, TrendingUp } from 'lucide-react';
import { api, type Data } from './api';
import { Session } from './Session';
import { Governance } from './Governance';
import { Bi, Problem, StudyText } from './LearningUI';
import { levelInfo, modeThai, statusThai, unitThai } from './learning-copy';
import { unitManifest } from '@/lib/english-mastery/manifest';
import './module.css';
const tabs = [
  ['', 'เส้นทางการเรียน', 'Learning path', BookOpen],
  ['practice', 'ฝึกทำโจทย์', 'Practice', Compass],
  ['review', 'ทบทวน', 'Spaced review', RotateCcw],
  ['progress', 'ความก้าวหน้า', 'Progress', TrendingUp],
] as const;
const extraTabs = [
  ['writing', 'ฝึกเขียน', 'Writing'], ['speaking', 'ฝึกพูด', 'Speaking'],
  ['mediation', 'ถ่ายทอดความหมาย', 'Mediation'], ['interaction', 'โต้ตอบออนไลน์', 'Online interaction'],
  ['assessments', 'สำรวจความเข้าใจ', 'Assessments'], ['exam', 'จำลองการสอบ', 'Exam simulation'],
];
const allTabs: readonly (readonly [string, string, string, ...unknown[]])[] = [...tabs, ...extraTabs as [string,string,string][]];
const modeNames: Data = { practice:'PRACTICE', writing:'WRITING', speaking:'SPEAKING', mediation:'MEDIATION', interaction:'ONLINE_INTERACTION', assessments:'UNIT_MASTERY', exam:'EXAM_SIMULATION' };
export function Module({ path, permissions }: { path: string[]; permissions: string[] }) {
  const page = path[0] || '', resourceKey = path.slice(0, 3).join('/');
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    const [page, resourceId] = resourceKey.split("/");
    const current = ++request.current;
    setError(''); setData(null);
    try {
      let next;
      if (page === 'units') {
        const content = await api('content', { unitId:resourceId });
        if (current !== request.current) return;
        const progress = await api('progress');
        next = { ...content, learningProgress:progress };
      } else if (['progress','review'].includes(page)) next = await api('progress');
      else if (page === 'sessions') next = await api('session', { id:resourceId });
      else if (!['author','reviewer','admin'].includes(page)) {
        // Each API call updates the same per-user rate counter. Avoid a burst of competing writes.
        const catalog = await api('catalog');
        if (current !== request.current) return;
        const progress = await api('progress');
        if (current !== request.current) return;
        const profiles = page === 'exam' ? await api('profiles') : [];
        next = { ...catalog, learningProgress:progress, profiles };
      }
      if (current === request.current) setData(next || null);
    } catch (e) { if (current === request.current) setError((e as Error).message); }
  }, [resourceKey]);
  useEffect(() => {
    const invalidate = () => { request.current++; };
    void reload();
    return invalidate;
  }, [reload]);
  return <section className={`emh${["units","sessions"].includes(page) ? " emh-focus" : ""}`} aria-label="English Mastery Hub" lang="th">
    <a className="emh-skip" href="#emh-content">ข้ามไปเนื้อหา / Skip to learning</a>
    <header className="emh-heading">
      <div className="emh-brand"><span className="emh-brand-icon"><BookOpen size={25} aria-hidden="true" /></span><div><p className="emh-eyebrow">ENGLISH MASTERY</p><h2>พื้นที่ฝึกภาษาอังกฤษของคุณ</h2><p lang="en" className="emh-muted">Your space to learn, one step at a time.</p></div></div>
      <span className="emh-language"><span lang="th">ไทย</span><span aria-hidden="true"> + </span><span lang="en">English</span></span>
    </header>
    <nav className="emh-main-nav" aria-label="เมนูการเรียน / English Mastery">
      {tabs.map(([href, th, en, Icon]) => <Link key={href} href={`/english${href ? `/${href}` : ''}`} aria-current={page === href ? 'page' : undefined}><Icon size={19} aria-hidden="true" /><Bi th={th} en={en} /></Link>)}
    </nav>
    <details className="emh-more" open={extraTabs.some(t => t[0] === page) || undefined}>
      <summary><Bi th="ฝึกทักษะเพิ่มเติม" en="More ways to practise" /></summary>
      <nav className="emh-extra-nav" aria-label="ทักษะเพิ่มเติม / More skills">
        {extraTabs.map(([href, th, en]) => <Link key={href} href={`/english/${href}`} aria-current={page === href ? 'page' : undefined}><Bi th={th} en={en}/></Link>)}
        {permissions.includes('english.author') && <Link href="/english/author"><Bi th="จัดการเนื้อหา" en="Authoring" /></Link>}
        {(permissions.includes('english.review') || permissions.includes('english.audit_attempts')) && <Link href="/english/reviewer"><Bi th="ตรวจงานผู้เรียน" en="Human review" /></Link>}
        {permissions.some(p => ['english.manage_production','english.manage_curriculum','english.manage_assessments'].includes(p)) && <Link href="/english/admin"><Bi th="ดูแลระบบ" en="Administration" /></Link>}
      </nav>
    </details>
    <div id="emh-content" tabIndex={-1}>
      {error && <><Problem message={error}/><button onClick={() => void reload()}><Bi th="ลองใหม่" en="Try again" /></button></>}
      {['author','reviewer','admin'].includes(page) ? <Governance mode={page} permissions={permissions}/> : data ?
        page === 'units' ? <Unit key={`${data.id}:${path[2] || ''}`} data={data} lessonId={path[2]}/> :
        page === 'sessions' ? <Session key={data.id} initial={data}/> :
        ['progress','review'].includes(page) ? <Progress data={data} queueOnly={page === 'review'}/> :
        <Catalog key={page} data={data} mode={page}/> : !error && <p role="status" className="emh-loading"><Bi th="กำลังเตรียมพื้นที่เรียนของคุณ…" en="Loading your learning space…"/></p>}
    </div>
    <footer className="emh-footer"><p>พื้นที่ฝึกเพื่อพัฒนาตนเอง ไม่ใช่การรับรองระดับ CEFR</p><p lang="en">Practice and learning evidence, not an official certificate. AI feedback and scoring are disabled.</p></footer>
  </section>;
}
function Catalog({ data, mode }: { data: Data; mode: string }) {
  const router = useRouter();
  const [error, setError] = useState(''), [busy, setBusy] = useState(''), [level, setLevel] = useState('A1');
  const [search, setSearch] = useState(''), [profile, setProfile] = useState(''), [assessment, setAssessment] = useState('UNIT_MASTERY');
  useEffect(() => { try { const remembered = localStorage.getItem('emh-level-v1'); if (remembered && levelInfo[remembered]) setLevel(remembered); } catch {} }, []);
  function chooseLevel(value: string) { setLevel(value); try { localStorage.setItem('emh-level-v1', value); } catch {} }
  const progress = data.learningProgress;
  const latest = [...progress.attempts].filter((a:Data) => a.status === 'ACTIVE').sort((a:Data,b:Data) => Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
  const firstAvailable = data.units.find((u:Data) => u.available);
  const completedUnits = new Set(progress.lessons.map((l:Data) => l.unitId));
  const due = progress.queue.filter((q:Data) => Date.parse(q.nextDueAt) <= Date.now()).length;
  const shown = data.units.filter((u:Data) => u.level === level && `${u.id} ${u.title} ${unitThai(u.id)}`.toLowerCase().includes(search.toLowerCase().trim()));
  const label = allTabs.find(t => t[0] === mode);
  async function start(unitId: string) {
    if (busy) return;
    setBusy(unitId); setError('');
    try {
      const c = await api('content', { unitId }), s = await api('start', {
        contentVersionId:c.id, mode:mode === 'assessments' ? assessment : modeNames[mode], requestId:crypto.randomUUID(),
        ...(mode === 'exam' ? { examProfileId:profile } : {}),
      });
      router.push(`/english/sessions/${s.id}`);
    } catch (e) { setError((e as Error).message); setBusy(''); }
  }
  return <>
    {!mode ? <>
      <section className="emh-hero">
        <div><p className="emh-eyebrow">ค่อย ๆ ฝึก ในจังหวะของคุณ · YOUR OWN PACE</p><h3>เริ่มเล็ก ๆ<br/>แล้วเก่งขึ้นทุกวัน</h3><p>ไม่ต้องมีพื้นฐานก็เริ่มได้ เลือก A1 อ่านทีละบท<br className="emh-desktop-break"/> แล้วลองใช้ภาษา โดยมีคำแนะนำภาษาไทยช่วยตลอดทาง</p>
          <div className="emh-actions">{(latest || firstAvailable) ? <Link className="emh-button" href={latest ? `/english/sessions/${latest.id}` : `/english/units/${firstAvailable.id}`}><Bi th={latest ? 'ฝึกต่อจากครั้งก่อน' : firstAvailable.id === 'A1-01' ? 'เริ่มจากพื้นฐาน' : 'เริ่มหน่วยที่เปิดให้เรียน'} en={latest ? 'Continue learning' : firstAvailable.id === 'A1-01' ? 'Start with the basics' : 'Start an available unit'}/><ArrowRight size={18} aria-hidden="true"/></Link> : <p>ยังไม่มีหน่วยที่เปิดให้บัญชีนี้เรียน กรุณาติดต่อผู้ดูแล / Ask the administrator for access.</p>}<a className="emh-text-link" href="#emh-courses">เลือกบทเรียน / Browse units ↓</a></div>
          {latest && <p className="emh-small">ฝึกค้างไว้: {latest.unitId} · {modeThai[latest.mode] || latest.mode}</p>}
        </div>
        <div className="emh-starter"><span className="emh-mini-label">เริ่มต้นอย่างสบายใจ / GET STARTED</span><ol><li><span>01</span><div><strong>เลือกบทที่สนใจ</strong><p>เริ่ม A1 ได้เลย หากยังไม่เคยเรียน</p></div></li><li><span>02</span><div><strong>อ่าน → ลองทำ → ทบทวน</strong><p>ใช้คำศัพท์ไทยช่วยเมื่อไม่เข้าใจ</p></div></li><li><span>03</span><div><strong>กลับมาฝึกต่อได้เสมอ</strong><p>บันทึกบทเรียนและคำตอบไว้ในบัญชี</p></div></li></ol></div>
      </section>
      <div className="emh-stat-strip"><div><BookOpen size={20} aria-hidden="true"/><span><strong>{data.units.length}</strong> หน่วยเรียน · Units</span></div><div><Check size={20} aria-hidden="true"/><span><strong>{progress.lessons.length}</strong> บทที่บันทึกว่าเรียนแล้ว · Lessons saved</span></div><Link href="/english/review"><RotateCcw size={20} aria-hidden="true"/><span><strong>{due}</strong> ข้อถึงเวลาทบทวน · Due for review</span></Link></div>
    </> : <header className="emh-page-title"><p className="emh-eyebrow">ฝึกทีละทักษะ · BUILD YOUR SKILLS</p><h3><Bi th={label?.[1] || 'ฝึกภาษา'} en={label?.[2] || 'Practice'}/></h3><p>เลือกหน่วยที่คุ้นเคย แล้วลองทำด้วยตนเอง คำตอบจะบันทึกในบัญชีของคุณ</p></header>}
    <section id="emh-courses" className="emh-courses">
      <div className="emh-section-heading"><div><h3><Bi th="เส้นทางการเรียนของคุณ" en="Your learning path"/></h3><p className="emh-muted">เลือกตามความสบายใจ เปลี่ยนระดับได้ทุกเมื่อ</p></div><span className="emh-pill">A1 → C2 · 6 ระดับ</span></div>
      <div className="emh-catalog-tools"><label><Bi th="เลือกระดับการเรียน" en="CEFR learning level"/><select value={level} onChange={e=>chooseLevel(e.target.value)}>{Object.entries(levelInfo).map(([id,l])=><option key={id} value={id}>{id} · {l.th} / {l.en}</option>)}</select></label><label><Bi th="ค้นหาหัวข้อ" en="Search units"/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="เช่น อาหาร / food / A1-09"/></label></div>
      <div className="emh-level-note"><span className="emh-level-badge">{level}</span><div><strong>{levelInfo[level].th} <span lang="en">· {levelInfo[level].en}</span></strong><p>{levelInfo[level].help}</p></div></div>
      <p className="emh-draft-note">ฉบับฝึกทดลอง · เนื้อหายังรอผู้สอนตรวจทาน / Draft preview — human review pending.</p>
      {mode === 'assessments' && <label><Bi th="รูปแบบสำรวจความเข้าใจ" en="Assessment layer"/><select value={assessment} onChange={e=>setAssessment(e.target.value)}><option value="UNIT_MASTERY">ทบทวนประจำหน่วย / Unit Mastery</option><option value="SKILLS">ฝึกทักษะ / Skills evidence</option><option value="LEVEL_READINESS">สำรวจความพร้อม (ยังไม่เทียบมาตรฐาน) / Level Readiness</option></select></label>}
      {mode === 'exam' && <div className="emh-notice"><p>เป็นการจำลองเพื่อฝึกเท่านั้น ไม่ใช่คะแนนสอบอย่างเป็นทางการ / Original practice, not an official exam.</p><label><Bi th="เลือกรูปแบบจำลอง" en="Exam profile"/><select value={profile} onChange={e=>setProfile(e.target.value)}><option value="">เลือกรูปแบบ / Choose a profile</option>{data.profiles?.map((p:Data)=><option key={p.id} value={p.id}>{p.provider} · {p.name} · {p.version}</option>)}</select></label>{!data.profiles?.length && <p>ยังไม่มีรูปแบบจำลองที่กำหนดไว้ ให้ใช้แบบฝึกประจำหน่วยก่อนได้ / No exam profile has been configured.</p>}</div>}
      {error && <Problem message={error}/>}
      <p className="emh-small" role="status">พบ {shown.length} หน่วย · {shown.length} units</p>
      <div className="emh-grid emh-unit-grid">{shown.map((u:Data)=><article className="emh-card emh-unit-card" key={u.id}>
        <div className="emh-card-top"><span className="emh-unit-number">{String(u.sequence).padStart(2,'0')}</span><span className="emh-eyebrow">{u.id}</span>{completedUnits.has(u.id) && <span className="emh-pill emh-pill-green">เคยเรียน · Started</span>}</div>
        <h4>{unitThai(u.id)}</h4><p lang="en" className="emh-unit-en">{u.title}</p>
        {u.available ? mode ? <button disabled={Boolean(busy) || (mode==='exam'&&!profile)} onClick={()=>void start(u.id)}><Bi th={busy===u.id ? 'กำลังเปิด…' : label?.[1] || 'เริ่มฝึก'} en={busy===u.id ? 'Opening…' : `Start ${label?.[2]}`}/><ArrowRight size={17} aria-hidden="true"/></button> : <Link className="emh-button emh-card-link" href={`/english/units/${u.id}`}><Bi th="เปิดบทเรียน" en="Open unit"/><ArrowRight size={17} aria-hidden="true"/></Link> : <p className="emh-muted">ยังไม่เปิดให้บัญชีนี้เรียน / Content not yet released</p>}
      </article>)}</div>
      {!shown.length && <div className="emh-empty"><p>ยังไม่พบหัวข้อที่ค้นหา ลองใช้คำสั้นลง หรือเปลี่ยนระดับ</p><button className="secondary" onClick={()=>setSearch('')}><Bi th="ล้างคำค้น" en="Clear search"/></button></div>}
    </section>
    <AttemptHistory attempts={progress.attempts}/>
  </>;
}
function AttemptHistory({ attempts }: { attempts:Data[] }) {
 const sorted = [...attempts].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
 return <section className="emh-history"><h3><Bi th="กลับมาฝึกต่อ" en="Continue / previous attempts"/></h3>{sorted.length ? <ul>{sorted.slice(0,8).map(a=><li key={a.id}><Link href={`/english/sessions/${a.id}`}><div><strong>{a.unitId} · {unitThai(a.unitId)}</strong><span>{modeThai[a.mode] || a.mode} · {statusThai[a.status] || a.status}<span lang="en"> / {a.mode} · {a.status}</span></span></div><ArrowRight size={18} aria-hidden="true"/></Link></li>)}</ul> : <div className="emh-empty"><p>ยังไม่มีประวัติการฝึก เริ่มจากบทแรกได้เลย ไม่ต้องกังวลเรื่องคะแนน</p><p lang="en">No attempts yet. Start with a lesson at your own pace.</p></div>}{sorted.length>8 && <details><summary>ดูประวัติเพิ่มเติม / More history ({sorted.length-8})</summary><ul>{sorted.slice(8).map(a=><li key={a.id}><Link href={`/english/sessions/${a.id}`}>{a.unitId} · {modeThai[a.mode] || a.mode} · {statusThai[a.status] || a.status}</Link></li>)}</ul></details>}</section>;
}
function Unit({ data, lessonId }: { data:Data; lessonId?:string }) {
 const router=useRouter();
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [completed,setCompleted]=useState<string[]>(data.learningProgress.lessons.filter((l:Data)=>l.contentVersionId===data.id).map((l:Data)=>l.lessonId));
 const index=lessonId ? data.lessons.findIndex((l:Data)=>l.id===lessonId) : 0;
 const lesson=data.lessons[index];
 const route=(i:number)=>`/english/units/${data.unitId}/${data.lessons[i].id}`;
 const position=unitManifest.findIndex(u=>u.id===data.unitId), nextUnit=unitManifest[position+1];
 async function complete(){setBusy(true);setError('');try{await api('complete',{contentVersionId:data.id,lessonId:lesson.id});setCompleted(p=>Array.from(new Set([...p,lesson.id])));setMessage('บันทึกว่าเรียนบทนี้แล้ว · Lesson completion saved.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function start(mode:string,itemId?:string){if(busy)return;setBusy(true);setError('');try{const s=await api('start',{contentVersionId:data.id,mode,requestId:crypto.randomUUID(),...(itemId?{itemId}:{})});router.push(`/english/sessions/${s.id}`);}catch(e){setError((e as Error).message);setBusy(false);}}
 if(!lesson)return <div className="emh-empty"><p>ไม่พบบทเรียนนี้ / Lesson not found</p><Link className="emh-button" href={`/english/units/${data.unitId}`}><Bi th="กลับหน้าหน่วย" en="Back to unit"/></Link></div>;
 return <>
  <Link className="emh-back" href="/english"><ChevronLeft size={17} aria-hidden="true"/><Bi th="กลับเส้นทางการเรียน" en="Back to learning path"/></Link>
  <header className="emh-page-title"><p className="emh-eyebrow">{data.unitId} · {data.level}</p><h3>{unitThai(data.unitId)}</h3><p lang="en" className="emh-unit-heading">{data.unitId} · {data.title}</p><p className="emh-muted">เรียนทีละขั้น ใช้เวลาเท่าที่ต้องการ แล้วบันทึกบทที่เรียนแล้ว</p></header>
  {data.preview && <p className="emh-draft-note">ฉบับฝึกทดลอง รอผู้สอนตรวจทาน / PRE_HUMAN_CONTENT_COMPLETE · Authorised preview</p>}
  <div className="emh-lesson-layout">
   <aside className="emh-lesson-aside"><h4><Bi th="บทเรียนในหน่วยนี้" en="In this unit"/></h4><p className="emh-small">เรียนแล้ว {completed.length} / {data.lessons.length} บท</p><progress value={completed.length} max={data.lessons.length} aria-label="บทเรียนที่เรียนแล้ว / Lessons completed"/><nav aria-label="ขั้นตอนบทเรียน / Lesson steps"><ol>{data.lessons.map((l:Data,i:number)=><li key={l.id}><Link href={route(i)} aria-current={i===index?'step':undefined}><span className="emh-step-number">{completed.includes(l.id)?<Check size={15} aria-label="เรียนแล้ว / Completed"/>:i+1}</span><span>บทที่ {i+1}<span lang="en">{l.title}</span></span></Link></li>)}</ol></nav><a className="emh-text-link" href="#emh-practice">ไปแบบฝึก / Go to practice ↓</a></aside>
   <div className="emh-lesson-body">
    <article className="emh-card emh-reading"><p className="emh-eyebrow">บทที่ {index+1} จาก {data.lessons.length} · LESSON {index+1}</p><h4>{lesson.title}</h4>
     <div className="emh-reading-tip"><strong>วิธีฝึก / How to study</strong><p>{index===0?'อ่านช้า ๆ มองหาชื่อ เวลา และใจความสำคัญ หากเจอคำที่ไม่รู้ เปิดคำศัพท์ด้านล่างช่วยได้':index===1?'ดูตัวอย่างภาษาและคำอธิบายไทย ลองเปลี่ยนข้อมูลในประโยค แล้วอ่านออกเสียง':index===2?'ฝึกกับสคริปต์ ให้เพื่อนหรือผู้สอนอ่านให้ฟังได้ ไฟล์เสียงประกอบยังอยู่ระหว่างเตรียม':'ลองใช้สิ่งที่เรียนกับสถานการณ์ของตนเอง แล้วทบทวนว่ามีจุดใดต้องฝึกเพิ่ม'}</p></div>
     {lesson.blocks.map((b:Data,i:number)=><StudyText key={i} text={b.text}/>)}
     <p role="status" className="emh-status">{message}</p>{error && <Problem message={error}/>}
     <div className="emh-actions"><button onClick={()=>void complete()} disabled={busy || completed.includes(lesson.id)}><Check size={18} aria-hidden="true"/><Bi th={completed.includes(lesson.id)?'บันทึกว่าเรียนแล้ว':'ฉันเรียนบทนี้แล้ว'} en={completed.includes(lesson.id)?'Lesson completed':'Mark lesson complete'}/></button>{index<data.lessons.length-1 && <Link className="emh-button secondary" href={route(index+1)}><Bi th="บทถัดไป" en="Next lesson"/><ArrowRight size={18} aria-hidden="true"/></Link>}</div>
     <div className="emh-between">{index>0 ? <Link href={route(index-1)}>← บทก่อนหน้า / Previous lesson</Link>:<span/>}<span className="emh-small">{index+1} / {data.lessons.length}</span></div>
    </article>
    <details className="emh-resource"><summary><Bi th={`คำศัพท์ช่วยเรียน (${data.vocabulary.length})`} en={`Vocabulary and phrases (${data.vocabulary.length})`}/></summary><div className="emh-vocab-grid">{data.vocabulary.map((v:Data)=><article key={v.id}><h4 lang="en">{v.item}</h4><p>{v.thai}</p><p className="emh-muted" lang="en">{v.example}</p></article>)}</div></details>
    <details className="emh-resource"><summary><Bi th="ตัวอย่างประโยคและการใช้ภาษา" en="Grammar and communicative functions"/></summary>{data.grammar.map((g:Data)=><article key={g.id}><h4 lang="en">{g.form}</h4><p>{g.use}</p><p lang="en">{g.example}</p></article>)}</details>
    <details className="emh-resource"><summary><Bi th="ลองนึกทบทวนโดยไม่ดูคำตอบ" en="Retrieval prompts"/></summary><p>ลองตอบก่อนเปิดบทเรียนดูอีกครั้ง / Try recalling before checking your notes.</p><ul>{data.retrieval.map((r:Data)=><li key={r.id} lang="en">{r.prompt}</li>)}</ul></details>
    <details className="emh-resource"><summary><Bi th="เป้าหมายและข้อมูลบทเรียน" en="Learning goals and details"/></summary><StudyText text={data.canDo}/><p>เวอร์ชัน {data.version} · สคริปต์ฟังใช้ฝึกได้ แต่ไฟล์เสียงและการตรวจคุณภาพยังรอดำเนินการ</p><p lang="en">Audio production and QC pending. Reading transcripts is not independent listening evidence.</p></details>
   </div>
  </div>
  <section id="emh-practice"><div className="emh-section-heading"><div><h3><Bi th="ลองใช้สิ่งที่เรียน" en="Practice in context"/></h3><p>เริ่มทีละข้อ ผิดได้และกลับมาฝึกใหม่ได้เสมอ</p></div><span className="emh-pill">{data.practice.length} ข้อ · Questions</span></div>
   <div className="emh-practice-list">{data.practice.map((item:Data,i:number)=><details className="emh-practice-item" key={item.stableId} open={i===0 || undefined}><summary><span className="emh-unit-number">{String(i+1).padStart(2,'0')}</span><Bi th={item.responseType==='SHORT_ANSWER'?'ฝึกคำศัพท์และเติมคำ':'อ่านและตอบด้วยตนเอง'} en={item.responseType==='SHORT_ANSWER'?'Recall the expression':'Respond in your own words'}/></summary><StudyText text={item.prompt}/><button disabled={busy} onClick={()=>void start('PRACTICE',item.stableId)}><Bi th={`เริ่มข้อที่ ${i+1}`} en={`Practise ${item.stableId}`}/><ArrowRight size={17} aria-hidden="true"/></button></details>)}</div>
   <div className="emh-card"><h4><Bi th="ฝึกใช้ภาษาในแบบของคุณ" en="Put it into practice"/></h4><p>งานเขียนและงานพูดรอผู้ตรวจให้คำแนะนำ ไม่ให้คะแนนอัตโนมัติ</p><div className="emh-actions">{['WRITING','SPEAKING','MEDIATION','ONLINE_INTERACTION'].map(mode=><button className="secondary" disabled={busy} key={mode} onClick={()=>void start(mode)}><Bi th={modeThai[mode]} en={`Start ${mode.replaceAll('_',' ')}`}/></button>)}</div></div>
  </section>
  <div className="emh-end-nav"><Link className="emh-button secondary" href="/english"><Bi th="กลับเส้นทางการเรียน" en="Back to learning path"/></Link>{nextUnit && <Link className="emh-button" href={`/english/units/${nextUnit.id}`}><Bi th={`หน่วยถัดไป · ${nextUnit.id}`} en="Next unit"/><ArrowRight size={18} aria-hidden="true"/></Link>}</div>
 </>;
}
function Progress({ data, queueOnly }: { data:Data; queueOnly:boolean }) {
 const router=useRouter(); const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function retrieve(q:Data){setBusy(true);setError('');try{const s=await api('start',{contentVersionId:q.contentVersionId,itemId:q.itemId,mode:'PRACTICE',requestId:crypto.randomUUID()});router.push(`/english/sessions/${s.id}`);}catch(e){setError((e as Error).message);setBusy(false);}}
 async function download(){try{const result=await api('export');const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='my-english-mastery-data.json';a.click();URL.revokeObjectURL(url);}catch(e){setError((e as Error).message);}}
 const queue=[...data.queue].sort((a,b)=>Date.parse(a.nextDueAt)-Date.parse(b.nextDueAt));
 return <><header className="emh-page-title"><p className="emh-eyebrow">ทุกก้าวเล็ก ๆ มีความหมาย · KEEP GROWING</p><h3><Bi th={queueOnly?'กลับมาทบทวนอีกนิด':'เห็นความก้าวหน้าของตัวเอง'} en={queueOnly?'Spaced review':'Your evidence and progress'}/></h3><p>{queueOnly?'ลองนึกคำตอบก่อนดูบทเรียน การกลับมาทบทวนช่วยให้เห็นว่าตรงไหนยังต้องฝึก':'ดูสิ่งที่ฝึกแล้ว และเลือกก้าวถัดไปของคุณ ไม่จำเป็นต้องรีบเทียบกับใคร'}</p></header>{error&&<Problem message={error}/>}
 {!queueOnly&&<><div className="emh-grid emh-progress-cards"><article className="emh-card"><BookOpen size={22} aria-hidden="true"/><h4><Bi th="บทที่เรียนแล้ว" en="Course completion"/></h4><strong className="emh-big-number">{data.courseCompletion+data.previewLessons}</strong><p>{data.courseCompletion} บทเผยแพร่ · {data.previewLessons} บททดลอง</p><p className="emh-small">นับบทที่คุณกดบันทึก ไม่ใช่ผลสอบ</p></article><article className="emh-card"><Layers size={22} aria-hidden="true"/><h4><Bi th="งานที่ส่งแล้ว" en="Skill evidence"/></h4><strong className="emh-big-number">{data.attempts.filter((a:Data)=>a.status==='SUBMITTED').length}</strong><p>{data.ratings.length} รายการคำแนะนำจากผู้ตรวจ</p></article><article className="emh-card"><RotateCcw size={22} aria-hidden="true"/><h4><Bi th="ถึงเวลาทบทวน" en="Due for review"/></h4><strong className="emh-big-number">{queue.filter(q=>Date.parse(q.nextDueAt)<=Date.now()).length}</strong><p>เริ่มทีละข้อได้เลย</p></article></div><details><summary>เกี่ยวกับผลการเรียน / About learning evidence</summary><p>ยังไม่ใช้ผลฝึกนี้รับรองระดับภาษา / Internal readiness is not calibrated.</p><p lang="en">{data.readiness.message}</p></details><button className="secondary" onClick={()=>void download()}><Bi th="ดาวน์โหลดข้อมูลการเรียนของฉัน" en="Export my learning data"/></button></>}
 <h4><Bi th="รายการทบทวน" en="Retrieval queue"/></h4>{queue.length?<div className="emh-grid">{queue.map(q=><article key={q.id} className="emh-card"><p className="emh-eyebrow">{q.unitId}</p><h4>{unitThai(q.unitId)}</h4><p className="emh-muted">{Date.parse(q.nextDueAt)<=Date.now()?'ถึงเวลาทบทวน / Due now':'นัดทบทวน / Scheduled'} · {new Date(q.nextDueAt).toLocaleString('th-TH')}</p><button disabled={busy} onClick={()=>void retrieve(q)}><Bi th="ลองตอบอีกครั้ง" en="Retrieve again"/></button></article>)}</div>:<div className="emh-empty"><RotateCcw size={28} aria-hidden="true"/><h4>ยังไม่มีรายการทบทวน</h4><p>ทำแบบฝึกและส่งคำตอบ แล้วระบบจะจัดรายการให้กลับมาฝึกต่อ</p><p lang="en">No scheduled items yet. Submit practice to build your queue.</p><Link className="emh-button" href="/english"><Bi th="เลือกบทเรียนแรก" en="Choose a lesson"/></Link></div>}
 {!queueOnly&&<><h4><Bi th="คำแนะนำจากผู้ตรวจ" en="Human feedback"/></h4>{data.ratings.length?data.ratings.map((r:Data)=><article className="emh-card" key={r.id}><p>{r.notes}</p>{r.criticalErrors.length>0&&<p>จุดที่ควรทบทวน / Remediation needed: {r.criticalErrors.join(', ')}</p>}</article>):<p className="emh-muted">ยังไม่มีคำแนะนำจากผู้ตรวจ / No human feedback yet.</p>}<AttemptHistory attempts={data.attempts}/></>}
 </>;
}
