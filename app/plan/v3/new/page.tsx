'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BookOpen, Sparkles, Target, Clock, Calendar, Users, 
  ArrowRight, ArrowLeft, Check, Layers, AlertCircle, FileText, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { subjectNameToKey } from '@/lib/smartPlanV3/labels';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CurriculumSubject {
  subjectKey: string;
  nameTh: string;
  learningArea: string;
  supportedGrades: string[];
}

interface CurriculumStandard {
  code: string;
  text: string;
}

interface CurriculumIndicator {
  code: string;
  text: string;
  standardCode: string;
}

interface LearningFocus {
  key: string;
  labelTh: string;
  descriptionTh: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const CURRICULUM_VERSION = 'OBEC-2551-REV60';

const STEPS_NAV = [
  { num: 1, label: 'ข้อมูลแผน' },
  { num: 2, label: 'เป้าหมาย' },
  { num: 3, label: 'กิจกรรม' },
  { num: 4, label: 'ประเมินผล' },
  { num: 5, label: 'ชุดพร้อมสอน' },
  { num: 6, label: 'ตรวจคุณภาพ' },
  { num: 7, label: 'เอกสาร' },
  { num: 8, label: 'ผลการสอน' },
  { num: 9, label: 'สะท้อนผล' },
];

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 font-normal leading-relaxed mt-0.5">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed cursor-pointer shadow-xs"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function NewV3LessonPage() {
  const router = useRouter();

  // Step 1 fields
  const [curriculumVersion] = useState(CURRICULUM_VERSION);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedFocus, setSelectedFocus] = useState('');
  const [standards, setStandards] = useState<CurriculumStandard[]>([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [indicators, setIndicators] = useState<CurriculumIndicator[]>([]);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [learningFocuses, setLearningFocuses] = useState<LearningFocus[]>([]);
  const [focusGuidance, setFocusGuidance] = useState('');

  // Lesson info
  const [topic, setTopic] = useState('');
  const [unitRef, setUnitRef] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [duration, setDuration] = useState(60);
  const [teachingDate, setTeachingDate] = useState('');
  const [studentContext, setStudentContext] = useState('');

  // Loading states
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subjects on mount
  useEffect(() => {
    fetch('/api/plan/v3/curriculum/subjects')
      .then(r => r.json())
      .then(res => {
        if (res.success) setSubjects(res.data || []);
      })
      .finally(() => setLoadingSubjects(false));
  }, []);

  // Load subject profile (learning focuses) when subject changes
  useEffect(() => {
    if (!selectedSubjectKey) {
      setLearningFocuses([]);
      setSelectedFocus('');
      setFocusGuidance('');
      return;
    }

    fetch(`/api/plan/v3/subject-profiles/${selectedSubjectKey}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.learningFocuses) {
          setLearningFocuses(res.data.learningFocuses);
          if (res.data.learningFocuses.length > 0) {
            setSelectedFocus(res.data.learningFocuses[0].key);
          }
        }
      })
      .catch(() => {});

    // Reset downstream
    setSelectedGrade('');
    setStandards([]);
    setSelectedStandard('');
    setIndicators([]);
    setSelectedIndicators([]);

    // Auto-fill course name from subject label
    const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
    if (subj && !courseName) {
      setCourseName(subj.nameTh);
    }
  }, [selectedSubjectKey, subjects, courseName]);

  // Load standards when grade changes
  useEffect(() => {
    if (!selectedSubjectKey || !selectedGrade) {
      setStandards([]);
      setSelectedStandard('');
      setIndicators([]);
      setSelectedIndicators([]);
      return;
    }

    setLoadingStandards(true);
    const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
    const area = subj?.learningArea || selectedSubjectKey;

    fetch(`/api/plan/v3/curriculum/standards?subject=${encodeURIComponent(area)}&grade=${encodeURIComponent(selectedGrade)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setStandards(res.data || []);
          setSelectedStandard('');
        }
      })
      .finally(() => setLoadingStandards(false));
  }, [selectedSubjectKey, selectedGrade, subjects]);

  // Load indicators when standard changes
  useEffect(() => {
    if (!selectedSubjectKey || !selectedGrade || !selectedStandard) {
      setIndicators([]);
      setSelectedIndicators([]);
      return;
    }

    const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
    const area = subj?.learningArea || selectedSubjectKey;

    setLoadingIndicators(true);
    fetch(`/api/plan/v3/curriculum/indicators?subject=${encodeURIComponent(area)}&grade=${encodeURIComponent(selectedGrade)}&standard=${encodeURIComponent(selectedStandard)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setIndicators(res.data || []);
      })
      .finally(() => setLoadingIndicators(false));
  }, [selectedStandard, selectedSubjectKey, selectedGrade, subjects]);

  // Load focus guidance when focus changes
  useEffect(() => {
    if (!selectedSubjectKey || !selectedFocus) { setFocusGuidance(''); return; }
    fetch(`/api/plan/v3/subject-profiles/${selectedSubjectKey}?focus=${selectedFocus}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.objectiveGuidance?.length > 0) {
          setFocusGuidance(res.data.objectiveGuidance[0]);
        } else {
          setFocusGuidance('');
        }
      })
      .catch(() => {});
  }, [selectedSubjectKey, selectedFocus]);

  const toggleIndicator = useCallback((code: string) => {
    setSelectedIndicators(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const availableGrades = (() => {
    const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
    return subj?.supportedGrades || [];
  })();

  const canSubmit = !!(
    selectedSubjectKey && selectedGrade && topic.trim() && selectedFocus
    && !submitting
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: topic.trim(),
        topic: topic.trim(),
        course_name: courseName.trim() || topic.trim(),
        course_code: courseCode.trim(),
        subject_key: selectedSubjectKey,
        grade_level: selectedGrade,
        curriculum_version: curriculumVersion,
        unit_reference: unitRef.trim() || null,
        duration_minutes: duration,
        learning_focus: selectedFocus || null,
        teaching_date: teachingDate || null,
        student_context: studentContext.trim() || null,
      };

      const res = await fetch('/api/plan/v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'ไม่สามารถสร้างแผนได้');
        setSubmitting(false);
        return;
      }

      const planId = data.data.id;

      if (selectedIndicators.length > 0) {
        const std = standards.find(s => s.code === selectedStandard);

        const links = selectedIndicators.map(indCode => {
          const ind = indicators.find(i => i.code === indCode);
          return {
            lesson_plan_id: planId,
            curriculum_version: curriculumVersion,
            subject_key: selectedSubjectKey,
            grade_level: selectedGrade,
            standard_code: selectedStandard,
            indicator_code: indCode,
            standard_label_snapshot: std?.text || selectedStandard,
            indicator_label_snapshot: ind?.text || indCode,
          };
        });

        await fetch(`/api/plan/v3/${planId}/curriculum-links`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links }),
        });
      }

      router.push(`/plan/v3/${planId}?step=2`);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองอีกครั้ง');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 font-sans">
      {/* ─── Breadcrumb & Header ─── */}
      <div className="bg-white/85 backdrop-blur-xl border-b border-slate-200/80 sticky top-16 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
              <Link href="/plan/v3" className="hover:text-blue-600 transition">แผนการสอน V3</Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-semibold">สร้างแผนการจัดการเรียนรู้ใหม่</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>ขั้นที่ 1 — ข้อมูลแผนการสอน</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                PA-Ready
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/plan/v3" className="v3-btn v3-btn-secondary text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ยกเลิก</span>
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="v3-btn v3-btn-primary text-xs shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <span>สร้างแผนและไปขั้นที่ 2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── Modern Stepper ─── */}
        <div className="border-t border-slate-100 overflow-x-auto scrollbar-none">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-0">
            {STEPS_NAV.map((s, idx) => {
              const isActive = s.num === 1;
              return (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-all ${
                    isActive
                      ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/40'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s.num}
                  </span>
                  <span>{s.label}</span>
                  {idx < STEPS_NAV.length - 1 && (
                    <span className="w-4 h-px bg-slate-200 ml-2 hidden lg:inline-block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Body Form ─── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8">
          
          {/* Header intro */}
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-lg font-bold text-slate-900">กำหนดข้อมูลตั้งต้นของแผนการสอน</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              ระบุกลุ่มสาระ มาตรฐาน ตัวชี้วัด และลักษณะการเรียนรู้ที่เน้น เพื่อให้ระบบ AI และผู้ช่วยสอนจัดโครงสร้างกิจกรรมและประเมินผลตามเกณฑ์ ว.PA ได้อย่างสอดคล้องที่สุด
            </p>
          </div>

          {/* ─── Section A: Curriculum & Subject ─── */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. หลักสูตรและกลุ่มสาระการเรียนรู้</h3>
                <p className="text-xs text-slate-500">เลือกกลุ่มสาระและระดับชั้นตามหลักสูตรแกนกลาง</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="หลักสูตรแกนกลาง" required>
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>หลักสูตรแกนกลาง พ.ศ. 2551 (ปรับปรุง 2560)</span>
                </div>
              </Field>

              <Field label="กลุ่มสาระการเรียนรู้ / วิชา" required>
                {loadingSubjects ? (
                  <div className="text-xs text-slate-400 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                    กำลังโหลดข้อมูลหลักสูตร...
                  </div>
                ) : (
                  <Select
                    value={selectedSubjectKey}
                    onChange={v => setSelectedSubjectKey(v)}
                    placeholder="— เลือกกลุ่มสาระการเรียนรู้ —"
                    options={subjects.map(s => ({
                      value: subjectNameToKey(s.nameTh),
                      label: s.nameTh,
                    }))}
                  />
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="ระดับชั้นที่สอน" required>
                <Select
                  value={selectedGrade}
                  onChange={setSelectedGrade}
                  placeholder="— เลือกระดับชั้น —"
                  disabled={!selectedSubjectKey || availableGrades.length === 0}
                  options={availableGrades.map(g => ({ value: g, label: g }))}
                />
                {selectedSubjectKey && availableGrades.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-1">ยังไม่มีข้อมูลหลักสูตรสำหรับวิชานี้</p>
                )}
              </Field>

              <Field 
                label="ลักษณะการเรียนรู้ที่เน้น (Learning Focus)" 
                required 
                hint="ระบุเป้าหมายแกนเพื่อปรับรูปแบบกิจกรรมและการประเมินผล"
              >
                <Select
                  value={selectedFocus}
                  onChange={setSelectedFocus}
                  placeholder="— เลือกลักษณะการเรียนรู้ —"
                  disabled={learningFocuses.length === 0}
                  options={learningFocuses.map(f => ({ value: f.key, label: f.labelTh }))}
                />
              </Field>
            </div>

            {focusGuidance && (
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-blue-950">คำแนะนำสำหรับจุดเน้นนี้: </span>
                  {focusGuidance}
                </div>
              </div>
            )}
          </section>

          {/* ─── Section B: Standard & Indicators ─── */}
          {selectedGrade && (
            <section className="space-y-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. มาตรฐานและตัวชี้วัด</h3>
                  <p className="text-xs text-slate-500">สำหรับแผน 1 คาบ ควรเน้นตัวชี้วัดที่ปฏิบัติได้จริง</p>
                </div>
              </div>

              <Field label="มาตรฐานการเรียนรู้" required>
                {loadingStandards ? (
                  <div className="text-xs text-slate-400 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                    กำลังโหลดมาตรฐานการเรียนรู้...
                  </div>
                ) : standards.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">ไม่พบมาตรฐานสำหรับกลุ่มสาระ/ชั้นนี้</div>
                ) : (
                  <Select
                    value={selectedStandard}
                    onChange={setSelectedStandard}
                    placeholder="— เลือกมาตรฐานการเรียนรู้ —"
                    options={standards.map(s => ({ value: s.code, label: `${s.code} — ${s.text}` }))}
                  />
                )}
              </Field>

              {selectedStandard && (
                <Field label="ตัวชี้วัด (เลือกตัวชี้วัดที่ตรงกับคาบนี้)">
                  {loadingIndicators ? (
                    <div className="text-xs text-slate-400 py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200 animate-pulse">
                      กำลังโหลดตัวชี้วัด...
                    </div>
                  ) : indicators.length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">ไม่พบตัวชี้วัดสำหรับมาตรฐานนี้</div>
                  ) : (
                    <div className="space-y-2 mt-1">
                      {indicators.map(ind => {
                        const isSelected = selectedIndicators.includes(ind.code);
                        return (
                          <label
                            key={ind.code}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/70 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-300'
                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleIndicator(ind.code)}
                              className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0 cursor-pointer accent-blue-600"
                            />
                            <div className="text-xs leading-relaxed">
                              <span className="font-bold text-slate-900 mr-1.5">{ind.code}</span>
                              <span>{ind.text}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedIndicators.length > 3 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>เลือกตัวชี้วัดมากกว่า 3 ข้อ อาจทำให้กิจกรรมในคาบเรียน 1 ชั่วโมงแน่นเกินไป</span>
                    </div>
                  )}
                </Field>
              )}
            </section>
          )}

          {/* ─── Section C: Lesson Info ─── */}
          <section className="space-y-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">3. รายละเอียดแผนการสอน</h3>
                  <p className="text-xs text-slate-500">หัวข้อ เวลาสอน และบริบทของนักเรียน</p>
                </div>
              </div>

              {selectedSubjectKey && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSubjectKey === 'ENGLISH') {
                      setTopic('Talking about Jobs & Occupations');
                      setUnitRef('Unit 2: People and Work');
                      setStudentContext('ห้องเรียนปกติ 36 คน ระดับภาษาอังกฤษคละความสามารถ (A1–A2)');
                    } else if (selectedSubjectKey === 'MATHEMATICS') {
                      setTopic('การแก้โจทย์ปัญหาสมการเชิงเส้นตัวแปรเดียว');
                      setUnitRef('หน่วยการเรียนรู้ที่ 2: สมการเชิงเส้น');
                      setStudentContext('ห้องเรียนปกติ 38 คน มีทั้งกลุ่มที่เข้าใจเร็วและกลุ่มที่ต้องการการฝึกขั้นตอนวิธี');
                    } else if (selectedSubjectKey === 'SCIENCE') {
                      setTopic('การสังเคราะห์ด้วยแสงและการทดสอบแป้งในใบพืช');
                      setUnitRef('หน่วยการเรียนรู้ที่ 3: การดำรงชีวิตของพืช');
                      setStudentContext('ห้องเรียน 35 คน แบ่งกลุ่มปฏิบัติการทดลองกลุ่มละ 5 คน');
                    } else {
                      setTopic('การเรียนรู้และการนำไปใช้ในชีวิตประจำวัน');
                      setUnitRef('หน่วยการเรียนรู้ที่ 1');
                      setStudentContext('ห้องเรียนปกติ 35-40 คน จัดการเรียนรู้แบบ Active Learning');
                    }
                    setDuration(60);
                  }}
                  className="v3-btn v3-btn-ai text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>เติมข้อมูลตัวอย่างแนะนำ</span>
                </button>
              )}
            </div>

            <Field label="ชื่อเรื่อง / หัวข้อการสอน (Topic)" required hint="ชื่อบทเรียนที่ระบุในแผนการจัดการเรียนรู้ เช่น 'Talking about Jobs'">
              <input
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs placeholder:text-slate-400"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="เช่น การสังเคราะห์ด้วยแสง, Talking about Jobs, สมการเชิงเส้น"
                maxLength={200}
              />

              {/* Quick Topic Chips */}
              {selectedSubjectKey && (
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">💡 หัวข้อแนะนำ:</span>
                  {(selectedSubjectKey === 'ENGLISH'
                    ? ['Daily Routines', 'Talking about Jobs', 'Asking for Directions', 'Food & Ordering', 'My Free Time Activities']
                    : selectedSubjectKey === 'MATHEMATICS'
                    ? ['การแก้โจทย์ปัญหาสมการเชิงเส้น', 'การหาพื้นที่รูปเรขาคณิต', 'อัตราส่วนและร้อยละ', 'การบวกและการลบเศษส่วน']
                    : selectedSubjectKey === 'SCIENCE'
                    ? ['การสังเคราะห์ด้วยแสง', 'แรงเสียดทานและการเคลื่อนที่', 'ระบบนิเวศและห่วงโซ่อาหาร', 'การแยกสารเนื้อผสม']
                    : ['การอ่านจับใจความสำคัญ', 'การทำงานร่วมกันเป็นทีม', 'การประยุกต์ใช้ในชีวิตประจำวัน']
                  ).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTopic(t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                        topic === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="หน่วยการเรียนรู้ (Unit)">
                <input
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs placeholder:text-slate-400"
                  value={unitRef}
                  onChange={e => setUnitRef(e.target.value)}
                  placeholder="เช่น หน่วยการเรียนรู้ที่ 2"
                />
              </Field>

              <Field label="ระยะเวลาสอน (นาที)" required>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                    min={1}
                    step={5}
                    className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 text-center transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[50, 60, 100, 120].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDuration(m)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                          duration === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {m} นาที
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="ชื่อรายวิชา">
                <input
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs placeholder:text-slate-400"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="เช่น ภาษาอังกฤษพื้นฐาน"
                />
              </Field>

              <Field label="รหัสวิชา">
                <input
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs placeholder:text-slate-400"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  placeholder="เช่น อ21101"
                />
              </Field>

              <Field label="วันที่สอน">
                <input
                  type="date"
                  value={teachingDate}
                  onChange={e => setTeachingDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs"
                />
              </Field>
            </div>

            <Field label="บริบทผู้เรียนและห้องเรียน" hint="ช่วยให้ระบบปรับระดับความยากและกิจกรรมให้เหมาะสมกับผู้เรียนจริง">
              <textarea
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-normal transition-all focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-xs placeholder:text-slate-400 min-h-[75px] resize-y"
                value={studentContext}
                onChange={e => setStudentContext(e.target.value)}
                placeholder="เช่น ห้อง ม.1/2 จำนวน 36 คน ทักษะภาษาคละความสามารถ เน้นกิจกรรมกลุ่มและมีจอ Smart TV"
                rows={2}
              />

              {/* Quick Context Chips */}
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">💡 เติมบริบท:</span>
                {[
                  'ชั้นเรียนปกติ (35–40 คน)',
                  'ห้องเรียนคละความสามารถ (Mixed-Ability)',
                  'เน้นการทำงานกลุ่มและฝึกปฏิบัติการ',
                  'มีอุปกรณ์ ICT และจอแสดงผล',
                  'ห้องเรียนขนาดเล็ก (ไม่เกิน 25 คน)',
                ].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setStudentContext(prev => prev ? `${prev}; ${c}` : c);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition cursor-pointer font-medium"
                    title="คลิกเพื่อต่อท้ายข้อความ"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          {/* ─── Error Notification ─── */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── Bottom Actions ─── */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/plan/v3')}
              className="v3-btn v3-btn-secondary"
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ยกเลิก</span>
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="v3-btn v3-btn-primary shadow-md px-6 py-2.5"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>กำลังสร้างแผน...</span>
                </>
              ) : (
                <>
                  <span>บันทึกและไปขั้นที่ 2 (กำหนดเป้าหมาย)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
