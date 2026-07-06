'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Circle, FileDown, Loader2, Printer, Save, ShieldCheck } from 'lucide-react';
import UnitLessonSequence from './UnitLessonSequence';
import AlignmentPreview from './AlignmentPreview';

type MasterData = {
  config: Record<string, string>;
  subjects: any[];
  units: any[];
  indicators: any[];
};

const initialFields = {
  academicYear: '',
  semester: '1',
  gradeLevel: '',
  subjectId: '',
  subjectName: '',
  unitId: '',
  unitName: '',
  unitNumber: '',
  teacherName: '',
  schoolName: '',
  totalUnitHours: 0,
  indicatorIds: [] as string[],
  unitLearningOutcomes: '',
  unitAssessmentOverview: '',
  learningMedia: '',
  learningSources: '',
  tasks: '',
  unitPlanStatus: 'draft',
};

export default function UnitPlannerForm({ unitPlanId }: { unitPlanId?: string }) {
  const router = useRouter();
  const [master, setMaster] = useState<MasterData | null>(null);
  const [fields, setFields] = useState(initialFields);
  const [unitLessons, setUnitLessons] = useState<any[]>([]);
  const [savedUnitPlanId, setSavedUnitPlanId] = useState(unitPlanId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/unit-planner-data').then(async response => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || 'โหลดข้อมูลไม่สำเร็จ');
        return result.data;
      }),
      unitPlanId
        ? fetch(`/api/unit-plans/${unitPlanId}`).then(async response => {
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.message || 'โหลดแผนระดับหน่วยไม่สำเร็จ');
            return result.data;
          })
        : Promise.resolve(null),
    ])
      .then(([masterData, unitPlan]) => {
        setMaster(masterData);
        const { UnitLessons = [], ...unitPlanFields } = unitPlan || {};
        setUnitLessons(
          UnitLessons
            .filter((lesson: any) => lesson.lessonStatus !== 'archived')
            .sort((a: any, b: any) => Number(a.lessonOrder) - Number(b.lessonOrder))
        );
        setFields(current => ({
          ...current,
          academicYear: String(new Date().getFullYear() + 543),
          teacherName: masterData.config.teacherName || '',
          schoolName: masterData.config.schoolName || '',
          ...unitPlanFields,
          indicatorIds: Array.isArray(unitPlanFields?.indicatorIds) ? unitPlanFields.indicatorIds : [],
        }));
      })
      .catch(error => setNotice({ type: 'error', text: error.message }))
      .finally(() => setLoading(false));
  }, [unitPlanId]);

  const gradeLevels = useMemo(
    () => Array.from(new Set((master?.subjects || []).map(subject => subject.gradeLevel))).filter(Boolean),
    [master]
  );
  const filteredSubjects = (master?.subjects || []).filter(
    subject => !fields.gradeLevel || subject.gradeLevel === fields.gradeLevel
  );
  const filteredUnits = (master?.units || []).filter(
    unit => !fields.subjectId || unit.subjectId === fields.subjectId
  );
  const filteredIndicators = (master?.indicators || []).filter(
    indicator => !fields.gradeLevel || indicator.gradeLevel === fields.gradeLevel
  );
  const lessonHours = unitLessons.reduce(
    (sum, lesson) => sum + Number(lesson.estimatedHours || 0),
    0
  );
  const hoursMatch = unitLessons.length > 0 &&
    Math.abs(Number(fields.totalUnitHours || 0) - lessonHours) < 0.001;

  const checklist = [
    { label: 'ข้อมูลปีการศึกษา ภาคเรียน และระดับชั้น', done: Boolean(fields.academicYear && fields.semester && fields.gradeLevel) },
    { label: 'รายวิชาและชื่อหน่วย', done: Boolean((fields.subjectId || fields.subjectName) && fields.unitName) },
    { label: 'จำนวนชั่วโมงรวมมากกว่า 0', done: Number(fields.totalUnitHours) > 0 },
    { label: 'ตัวชี้วัดอย่างน้อย 1 รายการ', done: fields.indicatorIds.length > 0 },
    { label: 'ผลลัพธ์การเรียนรู้ของหน่วย', done: Boolean(fields.unitLearningOutcomes.trim()) },
    { label: 'ภาพรวมการวัดและประเมินผล', done: Boolean(fields.unitAssessmentOverview.trim()) },
    { label: 'ลำดับแผนรายคาบอย่างน้อย 1 รายการ', done: unitLessons.length > 0 },
    { label: 'ชั่วโมงแผนรายคาบตรงกับชั่วโมงหน่วย', done: hoursMatch },
  ];
  const readyToSave = checklist.every(item => item.done);

  const setValue = (name: string, value: unknown) => {
    setNotice(null);
    setFields(current => ({ ...current, [name]: value }));
  };

  const changeGrade = (gradeLevel: string) => {
    setFields(current => ({
      ...current,
      gradeLevel,
      subjectId: '',
      subjectName: '',
      unitId: '',
      unitName: '',
      unitNumber: '',
      indicatorIds: [],
    }));
  };

  const changeSubject = (subjectId: string) => {
    const subject = master?.subjects.find(item => item.subjectId === subjectId);
    setFields(current => ({
      ...current,
      subjectId,
      subjectName: subject?.subjectName || '',
      unitId: '',
      unitName: '',
      unitNumber: '',
      indicatorIds: [],
    }));
  };

  const changeUnit = (unitId: string) => {
    const unit = master?.units.find(item => item.unitId === unitId);
    const associatedIds = String(unit?.indicatorIds || '').split(',').map(item => item.trim()).filter(Boolean);
    setFields(current => ({
      ...current,
      unitId,
      unitName: unit?.unitName || '',
      unitNumber: unit?.unitNumber || '',
      indicatorIds: associatedIds,
    }));
  };

  const toggleIndicator = (indicatorId: string) => {
    setFields(current => ({
      ...current,
      indicatorIds: current.indicatorIds.includes(indicatorId)
        ? current.indicatorIds.filter(id => id !== indicatorId)
        : [...current.indicatorIds, indicatorId],
    }));
  };

  const refreshLessons = async () => {
    if (!savedUnitPlanId) return;
    const response = await fetch(`/api/unit-plans/${savedUnitPlanId}/lessons`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || 'โหลดแผนรายคาบไม่สำเร็จ');
    setUnitLessons(result.data || []);
  };

  const saveUnitPlan = async (status: 'draft' | 'ready') => {
    setSaving(true);
    setNotice(null);
    try {
      if (status === 'ready' && (!savedUnitPlanId || !readyToSave)) {
        throw new Error('กรุณาทำ completion checklist ให้ครบก่อนบันทึกเป็นพร้อมใช้');
      }
      const response = await fetch(savedUnitPlanId ? `/api/unit-plans/${savedUnitPlanId}` : '/api/unit-plans', {
        method: savedUnitPlanId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, unitPlanStatus: status }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'บันทึกไม่สำเร็จ');
      if (!savedUnitPlanId && result.data?.unitPlanId) {
        setSavedUnitPlanId(result.data.unitPlanId);
        router.replace(`/unit-plans/${result.data.unitPlanId}`);
      }
      setFields(current => ({ ...current, unitPlanStatus: status }));
      setNotice({ type: 'success', text: result.message });
    } catch (error: any) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const exportPdf = () => {
    if (!savedUnitPlanId) return;
    // Open synchronously to bypass popup blocker
    window.open(`/unit-plans/${savedUnitPlanId}/preview`, '_blank', 'noopener,noreferrer');
    // Log asynchronously
    fetch(`/api/unit-plans/${savedUnitPlanId}/export/pdf`, { method: 'POST' }).catch(err => console.error('Failed to log PDF export:', err));
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center gap-3 font-bold text-slate-600"><Loader2 className="animate-spin" /> กำลังโหลดข้อมูลแผนระดับหน่วย...</div>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-pink-500">Unit Planner V2 Foundation</p>
          <h1 className="text-3xl font-black text-slate-900">สร้างแผนระดับหน่วย</h1>
          <p className="mt-1 text-slate-500">จัดข้อมูลหน่วย ลำดับแผนรายคาบ และตรวจชั่วโมงรวมก่อนพร้อมใช้</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600">กลับแดชบอร์ด</Link>
          <button type="button" onClick={() => saveUnitPlan('draft')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-2 font-bold text-white disabled:opacity-60">
            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึกร่าง
          </button>
          <button type="button" onClick={() => saveUnitPlan('ready')} disabled={saving || !readyToSave || !savedUnitPlanId} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
            <ShieldCheck size={18} /> บันทึกเป็นพร้อมใช้
          </button>
          <button type="button" onClick={exportPdf} disabled={!savedUnitPlanId || exporting} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 disabled:opacity-40">
            {exporting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />} PDF
          </button>
          <a href={savedUnitPlanId ? `/api/unit-plans/${savedUnitPlanId}/export/word` : undefined} aria-disabled={!savedUnitPlanId} onClick={event => { if (!savedUnitPlanId) event.preventDefault(); }} className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 ${!savedUnitPlanId ? 'pointer-events-none opacity-40' : ''}`}>
            <FileDown size={18} /> Word
          </a>
        </div>
      </div>

      {notice && (
        <div className={`mb-6 rounded-xl border p-4 font-bold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="1. ข้อมูลหน่วย">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="ปีการศึกษา"><input value={fields.academicYear} onChange={event => setValue('academicYear', event.target.value)} /></Field>
              <Field label="ภาคเรียน"><select value={fields.semester} onChange={event => setValue('semester', event.target.value)}><option value="1">1</option><option value="2">2</option></select></Field>
              <Field label="ระดับชั้น"><select value={fields.gradeLevel} onChange={event => changeGrade(event.target.value)}><option value="">เลือกระดับชั้น</option>{gradeLevels.map(grade => <option key={String(grade)} value={String(grade)}>{String(grade)}</option>)}</select></Field>
              <Field label="รายวิชา"><select value={fields.subjectId} disabled={!fields.gradeLevel} onChange={event => changeSubject(event.target.value)}><option value="">เลือกรายวิชา</option>{filteredSubjects.map(subject => <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName} ({subject.subjectCode})</option>)}</select></Field>
              <Field label="หน่วยจากหลักสูตร (เลือกได้)"><select value={fields.unitId} disabled={!fields.subjectId} onChange={event => changeUnit(event.target.value)}><option value="">เลือกหรือกรอกชื่อหน่วยเอง</option>{filteredUnits.map(unit => <option key={unit.unitId} value={unit.unitId}>หน่วยที่ {unit.unitNumber}: {unit.unitName}</option>)}</select></Field>
              <Field label="ชื่อหน่วยการเรียนรู้"><input value={fields.unitName} onChange={event => setValue('unitName', event.target.value)} /></Field>
              <Field label="จำนวนชั่วโมงรวม"><input type="number" min="0" step="0.5" value={fields.totalUnitHours} onChange={event => setValue('totalUnitHours', Number(event.target.value))} /></Field>
              <Field label="ชื่อครูผู้สอน"><input value={fields.teacherName} onChange={event => setValue('teacherName', event.target.value)} /></Field>
            </div>
          </Section>

          <Section title="2. ตัวชี้วัด">
            <p className="mb-3 text-sm text-slate-500">ระบบโหลดตัวชี้วัดจากฐานข้อมูล ครูสามารถเลือกหรือยกเลิกได้</p>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {filteredIndicators.length === 0 && <p className="text-sm text-slate-400">เลือกระดับชั้นเพื่อดูตัวชี้วัด</p>}
              {filteredIndicators.map(indicator => (
                <label key={indicator.indicatorId} className="flex cursor-pointer gap-3 rounded-lg p-2 hover:bg-slate-50">
                  <input type="checkbox" checked={fields.indicatorIds.includes(indicator.indicatorId)} onChange={() => toggleIndicator(indicator.indicatorId)} />
                  <span className="text-sm"><strong>{indicator.indicatorCode}</strong> {indicator.indicatorText}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="3. ผลลัพธ์การเรียนรู้">
            <Field label="ผลลัพธ์การเรียนรู้ของหน่วย"><textarea rows={5} value={fields.unitLearningOutcomes} onChange={event => setValue('unitLearningOutcomes', event.target.value)} /></Field>
          </Section>

          <Section title="4. โครงสร้างแผนรายคาบ">
            {savedUnitPlanId ? (
              <UnitLessonSequence
                unitPlanId={savedUnitPlanId}
                lessons={unitLessons}
                onChanged={refreshLessons}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <BookOpen className="mx-auto mb-2 text-slate-400" />
                <p className="font-bold text-slate-700">บันทึกร่างข้อมูลหน่วยก่อนเพิ่มแผนรายคาบ</p>
                <p className="text-sm text-slate-500">แผนรายคาบเดิมยังสร้างแบบ standalone ได้ตามปกติ</p>
              </div>
            )}
          </Section>

          <Section title="5. การวัดและประเมินผล">
            <Field label="ภาพรวมการวัดและประเมินผลระดับหน่วย"><textarea rows={5} value={fields.unitAssessmentOverview} onChange={event => setValue('unitAssessmentOverview', event.target.value)} /></Field>
          </Section>

          <Section title="6. สื่อและภาระงาน">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="สื่อการเรียนรู้"><textarea rows={4} value={fields.learningMedia} onChange={event => setValue('learningMedia', event.target.value)} /></Field>
              <Field label="แหล่งเรียนรู้"><textarea rows={4} value={fields.learningSources} onChange={event => setValue('learningSources', event.target.value)} /></Field>
            </div>
            <Field label="ชิ้นงาน / ภาระงาน"><textarea rows={4} value={fields.tasks} onChange={event => setValue('tasks', event.target.value)} /></Field>
          </Section>

          <Section title="7. ตรวจความสอดคล้อง">
            {savedUnitPlanId ? (
              <AlignmentPreview unitPlanId={savedUnitPlanId} />
            ) : (
              <p className="text-sm text-slate-500">บันทึกร่างก่อนจึงจะตรวจความสอดคล้องได้</p>
            )}
          </Section>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="font-black text-slate-900">ตรวจสอบความครบถ้วน</h2>
          <div className="mt-4 space-y-3">
            {checklist.map(item => (
              <div key={item.label} className="flex gap-2 text-sm">
                {item.done ? <CheckCircle2 className="shrink-0 text-emerald-500" size={18} /> : <Circle className="shrink-0 text-slate-300" size={18} />}
                <span className={item.done ? 'text-slate-700' : 'text-slate-400'}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className={`mt-5 rounded-xl p-3 text-xs ${hoursMatch ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            ชั่วโมงหน่วย: {Number(fields.totalUnitHours || 0)} ชม. · ชั่วโมงจากแผนรายคาบ: {lessonHours} ชม.
            {!hoursMatch && unitLessons.length > 0 && <span className="mt-1 block font-bold">กรุณาปรับชั่วโมงให้ตรงกันก่อนบันทึกเป็นพร้อมใช้</span>}
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-xl font-black text-slate-900">{title}</h2>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">{label}</span><div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-slate-200 [&_input]:p-3 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:p-3 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:p-3">{children}</div></label>;
}
