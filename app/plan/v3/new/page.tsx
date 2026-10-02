'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, BookOpen, Clock, Calendar, Users, 
  ArrowRight, ArrowLeft, Check, Target, ChevronRight,
  School, User, Layers, CheckCircle2, AlertCircle, Wand2
} from 'lucide-react';
import { subjectNameToKey, getSubjectLabel } from '@/lib/smartPlanV3/labels';
import TeacherProfileBanner from '@/components/smartPlanV3/TeacherProfileBanner';
import { getStoredTeacherProfile, TeacherProfile } from '@/lib/smartPlanV3/teacherProfile';

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
  type?: 'during' | 'final';
}

interface LearningFocus {
  key: string;
  labelTh: string;
  descriptionTh: string;
}

const CURRICULUM_VERSION = 'OBEC-2551-REV60';

const PRESET_PLANS = [
  {
    label: '🇬🇧 อังกฤษ ม.4: Present Progressive',
    subjectKey: 'ENGLISH',
    grade: 'ม.4',
    topic: 'How to use the Present Progressive Tense',
    focus: 'COMMUNICATION',
    desc: 'เน้นการสื่อสารสถานการณ์จริงและการทำงานกลุ่ม',
  },
  {
    label: '📐 คณิต ม.2: สมการเชิงเส้นตัวแปรเดียว',
    subjectKey: 'MATHEMATICS',
    grade: 'ม.2',
    topic: 'การแก้โจทย์ปัญหาสมการเชิงเส้นตัวแปรเดียว',
    focus: 'PROBLEM_SOLVING',
    desc: 'ฝึกกระบวนการคิดวิเคราะห์และแก้ปัญหาเป็นขั้นตอน',
  },
  {
    label: '🔬 วิทย์ ม.3: การสังเคราะห์ด้วยแสง',
    subjectKey: 'SCIENCE',
    grade: 'ม.3',
    topic: 'การสังเคราะห์ด้วยแสงและการทดสอบแป้งในพืช',
    focus: 'SCIENTIFIC_INQUIRY',
    desc: 'ลงมือทดลองในห้องปฏิบัติการและสรุปผลเชิงประจักษ์',
  },
  {
    label: '🇹🇭 ภาษาไทย ม.1: การอ่านจับใจความสำคัญ',
    subjectKey: 'THAI',
    grade: 'ม.1',
    topic: 'การอ่านจับใจความสำคัญจากบทร้อยแก้ว',
    focus: 'COMMUNICATION',
    desc: 'เทคนิคการจับประเด็นและเขียนแผนภาพความคิด',
  },
  {
    label: '⚽ สุขศึกษา ม.1: ทักษะการเคลื่อนไหว',
    subjectKey: 'HEALTH_PE',
    grade: 'ม.1',
    topic: 'การเคลื่อนไหวร่างกายขั้นพื้นฐานและการทำงานเป็นทีม',
    focus: 'PHYSICAL_PRACTICE',
    desc: 'ฝึกปฏิบัติการออกกำลังกายและกติกาความปลอดภัย',
  },
  {
    label: '🌏 สังคม ม.4: การอนุรักษ์สิ่งแวดล้อม',
    subjectKey: 'SOCIAL_STUDIES',
    grade: 'ม.4',
    topic: 'การจัดการทรัพยากรธรรมชาติและสิ่งแวดล้อมอย่างยั่งยืน',
    focus: 'CRITICAL_THINKING',
    desc: 'วิเคราะห์ปัญหาสิ่งแวดล้อมในชุมชนและเสนอทางออก',
  },
];

export default function NewV3LessonPage() {
  const router = useRouter();

  // Mode: 'ai' (1-click AI generation) vs 'manual' (step-by-step custom form)
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');

  // AI Mode States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSelectedSubject, setAiSelectedSubject] = useState('');
  const [aiSelectedGrade, setAiSelectedGrade] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgressStep, setAiProgressStep] = useState(0);

  // Manual Mode States
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

  // Common metadata
  const [topic, setTopic] = useState('');
  const [unitRef, setUnitRef] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [duration, setDuration] = useState(60);
  const [teachingDate, setTeachingDate] = useState('');
  const [studentContext, setStudentContext] = useState('');

  // Teacher Profile state
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);

  // Loading states
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount: load teacher profile & subjects
  useEffect(() => {
    const prof = getStoredTeacherProfile();
    setTeacherProfile(prof);
    if (prof.defaultSubjectKey) {
      setSelectedSubjectKey(prof.defaultSubjectKey);
      setAiSelectedSubject(prof.defaultSubjectKey);
    }
    if (prof.defaultGrade) {
      setSelectedGrade(prof.defaultGrade);
      setAiSelectedGrade(prof.defaultGrade);
    }
    if (prof.defaultDurationMinutes) {
      setDuration(prof.defaultDurationMinutes);
    }

    fetch('/api/plan/v3/curriculum/subjects')
      .then(r => r.json())
      .then(res => {
        if (res.success) setSubjects(res.data || []);
      })
      .finally(() => setLoadingSubjects(false));
  }, []);

  // When subject changes: load focuses
  useEffect(() => {
    if (!selectedSubjectKey) {
      setLearningFocuses([]);
      setSelectedFocus('');
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

    setStandards([]);
    setSelectedStandard('');
    setIndicators([]);
    setSelectedIndicators([]);

    const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
    if (subj && !courseName) {
      setCourseName(subj.nameTh);
    }
  }, [selectedSubjectKey, subjects, courseName]);

  // When grade changes: load standards
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

  // When standard changes: load indicators
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

  const toggleIndicator = useCallback((code: string) => {
    setSelectedIndicators(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const availableGrades = (() => {
    const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
    return subj?.supportedGrades || ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
  })();

  // ─── 1-Click AI Generation ────────────────────────────────────────────────
  const handleAiFastGenerate = async (presetPrompt?: string) => {
    const promptToUse = (presetPrompt || aiPrompt || topic).trim();
    if (!promptToUse) {
      setError('กรุณาพิมพ์หัวข้อหรือเลือกแนวทางตัวอย่างที่ต้องการสอน');
      return;
    }

    setError(null);
    setAiGenerating(true);
    setAiProgressStep(1);

    const stepTimer1 = setTimeout(() => setAiProgressStep(2), 1200);
    const stepTimer2 = setTimeout(() => setAiProgressStep(3), 2600);

    try {
      const res = await fetch('/api/plan/v3/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          subjectKey: aiSelectedSubject || selectedSubjectKey || undefined,
          gradeLevel: aiSelectedGrade || selectedGrade || undefined,
          topic: promptToUse,
          durationMinutes: duration || 60,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'AI ไม่สามารถสร้างแผนได้ กรุณาลองใหม่อีกครั้ง');
        setAiGenerating(false);
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        return;
      }

      setAiProgressStep(4);
      setTimeout(() => {
        router.push(`/plan/v3/${data.data.id}?step=1`);
      }, 500);

    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง');
      setAiGenerating(false);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    }
  };

  // ─── Manual Form Submission ───────────────────────────────────────────────
  const canSubmitManual = !!(
    selectedSubjectKey && selectedGrade && topic.trim() && !submitting
  );

  const handleManualSubmit = async () => {
    if (!canSubmitManual) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: topic.trim(),
        topic: topic.trim(),
        course_name: courseName.trim() || topic.trim(),
        course_code: courseCode.trim() || 'ว11101',
        subject_key: selectedSubjectKey,
        grade_level: selectedGrade,
        curriculum_version: curriculumVersion,
        unit_reference: unitRef.trim() || null,
        duration_minutes: duration,
        learning_focus: selectedFocus || 'ACTIVE_LEARNING',
        pedagogical_approach: 'Active Learning',
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
          const typeBadge = ind?.type === 'final' ? '[ปลายทาง]' : '[ระหว่างทาง]';
          return {
            lesson_plan_id: planId,
            curriculum_version: curriculumVersion,
            subject_key: selectedSubjectKey,
            grade_level: selectedGrade,
            standard_code: ind?.standardCode || selectedStandard,
            indicator_code: indCode,
            standard_label_snapshot: std?.text || selectedStandard,
            indicator_label_snapshot: `${typeBadge} ${ind?.text || indCode}`,
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

  const activeTopicDisplay = (creationMode === 'ai' ? aiPrompt : topic) || 'ยังไม่ได้ระบุหัวข้อบทเรียน';
  const activeSubjectDisplay = getSubjectLabel(creationMode === 'ai' ? (aiSelectedSubject || selectedSubjectKey) : selectedSubjectKey);
  const activeGradeDisplay = (creationMode === 'ai' ? aiSelectedGrade : selectedGrade) || 'ยังไม่ระบุ';

  return (
    <div className="new-plan-page">
      {/* ─── Apple Frosted Header ─── */}
      <header className="new-plan-header">
        <div className="header-inner">
          <div className="header-breadcrumbs">
            <Link href="/plan/v3" className="crumb-link">แผนการสอน V3</Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#86868B]" />
            <span className="crumb-current">สร้างแผนการจัดการเรียนรู้</span>
          </div>

          <div className="header-title-row">
            <div>
              <h1 className="header-title">สร้างแผนการจัดการเรียนรู้</h1>
              <p className="header-subtitle">
                ออกแบบแผนการสอน 60 นาทีตามเกณฑ์มาตรฐาน ว.PA และหลักสูตรแกนกลาง
              </p>
            </div>

            <div className="header-actions">
              <Link href="/plan/v3" className="apple-btn-secondary">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>ยกเลิก</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container (PC 2-Column Responsive Layout) ─── */}
      <main className="new-plan-main">
        {/* ─── Profile Widget (One-time Setup) ─── */}
        <div className="mb-6">
          <TeacherProfileBanner
            compact
            onProfileChange={(p) => {
              setTeacherProfile(p);
              if (p.defaultSubjectKey && !selectedSubjectKey) {
                setSelectedSubjectKey(p.defaultSubjectKey);
                setAiSelectedSubject(p.defaultSubjectKey);
              }
              if (p.defaultGrade && !selectedGrade) {
                setSelectedGrade(p.defaultGrade);
                setAiSelectedGrade(p.defaultGrade);
              }
              if (p.defaultDurationMinutes) setDuration(p.defaultDurationMinutes);
            }}
          />
        </div>

        {/* ─── Mode Segmented Control ─── */}
        <div className="mode-segmented-bar">
          <button
            type="button"
            className={`mode-tab ${creationMode === 'ai' ? 'active' : ''}`}
            onClick={() => setCreationMode('ai')}
          >
            <Sparkles className="w-4 h-4 text-[#0071E3]" />
            <span className="font-bold">⚡ ผู้ช่วย AI ร่างแผนทันที (แนะนำ - เร็วที่สุด)</span>
          </button>
          <button
            type="button"
            className={`mode-tab ${creationMode === 'manual' ? 'active' : ''}`}
            onClick={() => setCreationMode('manual')}
          >
            <BookOpen className="w-4 h-4 text-[#86868B]" />
            <span className="font-semibold">✍️ กำหนดข้อมูลและเลือกตัวชี้วัดเอง</span>
          </button>
        </div>

        {error && (
          <div className="apple-alert-error">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ─── Desktop 2-Column Layout ─── */}
        <div className="workspace-grid">
          {/* Left Column: Input Forms */}
          <div className="workspace-form-col">
            {creationMode === 'ai' ? (
              /* ─── AI Fast Mode Workspace ─── */
              <div className="apple-card p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="card-heading flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#0071E3]" />
                    <span>ระบุเรื่องที่ต้องการสอน ให้ AI ออกแบบทั้งแผน</span>
                  </h2>
                  <p className="card-subheading">
                    พิมพ์ชื่อเรื่องที่ต้องการสอน หรือคลิกเลือกตัวอย่างด้านล่าง ระบบจะค้นหาตัวชี้วัด กำหนดเป้าหมาย K-P-A และวางแผนกิจกรรมให้ครบในคลิกเดียว
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="input-label">ชื่อเรื่อง หรือ เนื้อหาที่ต้องการสอน *</label>
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      setTopic(e.target.value);
                    }}
                    placeholder="เช่น How to use the Present Progressive Tense, การแก้สมการเชิงเส้น, การสังเคราะห์ด้วยแสง..."
                    className="apple-input-hero"
                    disabled={aiGenerating}
                  />
                </div>

                {/* Subject & Grade quick selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">กลุ่มสาระ / วิชา (ถ้าต้องการระบุ)</label>
                    <select
                      value={aiSelectedSubject}
                      onChange={(e) => setAiSelectedSubject(e.target.value)}
                      className="apple-select"
                      disabled={aiGenerating}
                    >
                      <option value="">— ให้ AI ตรวจจับจากหัวข้ออัตโนมัติ —</option>
                      {subjects.map(s => (
                        <option key={s.subjectKey} value={subjectNameToKey(s.nameTh)}>
                          {s.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">ระดับชั้น</label>
                    <select
                      value={aiSelectedGrade}
                      onChange={(e) => setAiSelectedGrade(e.target.value)}
                      className="apple-select"
                      disabled={aiGenerating}
                    >
                      <option value="">— ให้ AI แนะนำตามความเหมาะสม —</option>
                      {['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 1-Click Fast Presets */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-[#86868B] block">
                    💡 หรือคลิกเลือกตัวอย่างแผนจริงที่ครูใช้สอนบ่อย:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PRESET_PLANS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAiPrompt(preset.topic);
                          setTopic(preset.topic);
                          setAiSelectedSubject(preset.subjectKey);
                          setAiSelectedGrade(preset.grade);
                        }}
                        className={`preset-card text-left ${aiPrompt === preset.topic ? 'selected' : ''}`}
                        disabled={aiGenerating}
                      >
                        <div className="font-bold text-xs text-[#1D1D1F]">{preset.label}</div>
                        <div className="text-[11px] text-[#86868B] mt-0.5 line-clamp-1">{preset.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Progress Box during generation */}
                {aiGenerating && (
                  <div className="ai-generation-box">
                    <div className="flex items-center gap-3">
                      <div className="apple-spinner-blue" />
                      <div>
                        <div className="font-bold text-sm text-[#0071E3]">
                          {aiProgressStep === 1 && '1/3 กำลังวิเคราะห์มาตรฐานและตัวชี้วัด...'}
                          {aiProgressStep === 2 && '2/3 กำหนดเป้าหมาย K-P-A และหลักฐานการเรียนรู้...'}
                          {aiProgressStep === 3 && '3/3 วางโครงสร้างกิจกรรมการสอน 60 นาที (Active Learning)...'}
                          {aiProgressStep >= 4 && '✨ เสร็จสิ้น! กำลังเปิดหน้าแผนการสอน...'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">ใช้เวลาประมาณ 3–5 วินาที</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary AI Submit Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleAiFastGenerate()}
                    disabled={!aiPrompt.trim() || aiGenerating}
                    className="apple-btn-hero w-full"
                  >
                    {aiGenerating ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>กำลังประมวลผลด้วย AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>✨ ออกแบบแผนการสอนด้วย AI ในคลิกเดียว</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ─── Manual Mode Workspace ─── */
              <div className="apple-card p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="card-heading flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#0071E3]" />
                    <span>กำหนดข้อมูลและตัวชี้วัดหลักสูตรแกนกลาง</span>
                  </h2>
                  <p className="card-subheading">
                    เลือกกลุ่มสาระ มาตรฐานการเรียนรู้ และตัวชี้วัดตามหลักสูตรแกนกลาง 2551 (ปรับปรุง 2560)
                  </p>
                </div>

                {/* Subject & Grade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">กลุ่มสาระการเรียนรู้ / วิชา *</label>
                    <select
                      value={selectedSubjectKey}
                      onChange={(e) => setSelectedSubjectKey(e.target.value)}
                      className="apple-select"
                    >
                      <option value="">— เลือกกลุ่มสาระ —</option>
                      {subjects.map(s => (
                        <option key={s.subjectKey} value={subjectNameToKey(s.nameTh)}>
                          {s.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="input-label">ระดับชั้นที่สอน *</label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="apple-select"
                      disabled={!selectedSubjectKey}
                    >
                      <option value="">— เลือกระดับชั้น —</option>
                      {availableGrades.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Topic & Duration */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="input-label">ชื่อเรื่อง / หัวข้อบทเรียน (Topic) *</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="เช่น Present Continuous Tense, การแก้สมการเชิงเส้น..."
                      className="apple-input"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">เวลาสอน (นาที) *</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={duration}
                          onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                          className="apple-input w-24 text-center font-bold"
                        />
                        <div className="flex gap-1.5">
                          {[50, 60, 100].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setDuration(m)}
                              className={`pill-time-btn ${duration === m ? 'active' : ''}`}
                            >
                              {m}น.
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="input-label">จุดเน้นการเรียนรู้</label>
                      <select
                        value={selectedFocus}
                        onChange={(e) => setSelectedFocus(e.target.value)}
                        className="apple-select"
                        disabled={learningFocuses.length === 0}
                      >
                        {learningFocuses.map(f => (
                          <option key={f.key} value={f.key}>{f.labelTh}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Standards & Indicators */}
                {selectedGrade && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="input-label">มาตรฐานการเรียนรู้</label>
                      <select
                        value={selectedStandard}
                        onChange={(e) => setSelectedStandard(e.target.value)}
                        className="apple-select"
                      >
                        <option value="">— เลือกมาตรฐานการเรียนรู้ —</option>
                        {standards.map(s => (
                          <option key={s.code} value={s.code}>{s.code} — {s.text}</option>
                        ))}
                      </select>
                    </div>

                    {selectedStandard && (
                      <div>
                        <label className="input-label">ตัวชี้วัดในคาบนี้ (เลือก 1–2 ข้อ)</label>
                        <div className="space-y-2 mt-1 max-h-56 overflow-y-auto pr-1">
                          {indicators.map(ind => {
                            const isSelected = selectedIndicators.includes(ind.code);
                            return (
                              <label
                                key={ind.code}
                                className={`indicator-choice-card ${isSelected ? 'selected' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleIndicator(ind.code)}
                                  className="w-4 h-4 text-[#0071E3] rounded border-slate-300 accent-[#0071E3]"
                                />
                                <div className="text-xs flex-1">
                                  <span className="font-bold text-[#1D1D1F] mr-2">{ind.code}</span>
                                  <span className="text-slate-600">{ind.text}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={!canSubmitManual || submitting}
                    className="apple-btn-hero w-full"
                  >
                    {submitting ? (
                      <span>กำลังบันทึกข้อมูล...</span>
                    ) : (
                      <>
                        <span>บันทึกและไปกำหนดเป้าหมาย (ขั้นที่ 2)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Plan Card (Desktop Preview) */}
          <div className="workspace-preview-col">
            <div className="sticky-preview-wrapper">
              <div className="apple-preview-card">
                <div className="preview-card-header">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0071E3] animate-pulse" />
                    <span className="preview-header-label">ตัวอย่างโครงสร้างแผนจริง (Live Preview)</span>
                  </div>
                  <span className="preview-status-pill">พร้อมสร้าง</span>
                </div>

                <div className="preview-card-body">
                  <div className="preview-topic-block">
                    <span className="preview-label">หัวข้อการจัดการเรียนรู้</span>
                    <h3 className="preview-topic-title">{activeTopicDisplay}</h3>
                  </div>

                  <div className="preview-meta-grid">
                    <div className="meta-box">
                      <span className="meta-lbl">กลุ่มสาระการเรียนรู้</span>
                      <span className="meta-val">{activeSubjectDisplay}</span>
                    </div>
                    <div className="meta-box">
                      <span className="meta-lbl">ระดับชั้น</span>
                      <span className="meta-val">{activeGradeDisplay}</span>
                    </div>
                    <div className="meta-box">
                      <span className="meta-lbl">เวลาคาบเรียน</span>
                      <span className="meta-val">{duration} นาที</span>
                    </div>
                    <div className="meta-box">
                      <span className="meta-lbl">เกณฑ์มาตรฐาน</span>
                      <span className="meta-val">ว.PA (PA-Ready)</span>
                    </div>
                  </div>

                  {/* Teacher Information Summary */}
                  <div className="preview-teacher-section">
                    <div className="flex items-center gap-2 text-xs text-[#86868B]">
                      <User className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>ครูผู้สอน: </span>
                      <strong className="text-[#1D1D1F]">{teacherProfile?.teacherName || 'ครูผู้สอน'}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#86868B] mt-1">
                      <School className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>สถานศึกษา: </span>
                      <strong className="text-[#1D1D1F]">{teacherProfile?.schoolName || 'โรงเรียน'}</strong>
                    </div>
                  </div>

                  {/* Features Guarantee Badges */}
                  <div className="preview-badges-list">
                    <div className="badge-item">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>จุดประสงค์ K-P-A ครบ 3 ด้านตามเกณฑ์ ศธ.</span>
                    </div>
                    <div className="badge-item">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>ไทม์ไลน์กิจกรรม Active Learning 5 ขั้น</span>
                    </div>
                    <div className="badge-item">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>พร้อมส่งออกเอกสาร Word (Sarabun) และ PDF</span>
                    </div>
                  </div>

                  {/* Desktop Quick Action */}
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    {creationMode === 'ai' ? (
                      <button
                        type="button"
                        onClick={() => handleAiFastGenerate()}
                        disabled={!aiPrompt.trim() || aiGenerating}
                        className="apple-btn-primary w-full shadow-sm"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>เริ่มสร้างแผนด้วย AI ทันที</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleManualSubmit}
                        disabled={!canSubmitManual || submitting}
                        className="apple-btn-primary w-full shadow-sm"
                      >
                        <span>สร้างแผนและเริ่มกำหนดเป้าหมาย →</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        /* ─── Apple Design Tokens & Typography ─── */
        .new-plan-page {
          min-height: 100vh;
          background: #F5F5F7;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Sarabun", "Helvetica Neue", sans-serif;
          color: #1D1D1F;
          padding-bottom: 5rem;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── Frosted Header ─── */
        .new-plan-header {
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          position: sticky;
          top: 0;
          z-index: 30;
          padding: 1rem 1.5rem;
        }
        .header-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .header-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: #86868B;
          margin-bottom: 0.4rem;
        }
        .crumb-link {
          color: #86868B;
          text-decoration: none;
        }
        .crumb-link:hover {
          color: #0071E3;
        }
        .crumb-current {
          color: #1D1D1F;
          font-weight: 600;
        }
        .header-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .header-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0;
          color: #1D1D1F;
        }
        .header-subtitle {
          font-size: 0.8rem;
          color: #86868B;
          margin: 0.2rem 0 0;
        }

        /* ─── Workspace Layout ─── */
        .new-plan-main {
          max-width: 1100px;
          margin: 0 auto;
          padding: 1.5rem 1.5rem 0;
        }

        /* ─── Mode Segmented Control ─── */
        .mode-segmented-bar {
          display: flex;
          background: #E5E5EA;
          padding: 4px;
          border-radius: 14px;
          margin-bottom: 1.5rem;
          gap: 4px;
        }
        .mode-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: 11px;
          border: none;
          background: transparent;
          font-size: 0.85rem;
          color: #48484A;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mode-tab.active {
          background: #FFFFFF;
          color: #1D1D1F;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        /* ─── 2-Column Desktop Grid ─── */
        .workspace-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        @media (min-width: 1024px) {
          .workspace-grid {
            grid-template-columns: 7fr 5fr;
            gap: 1.75rem;
          }
        }

        /* ─── Apple Cards ─── */
        .apple-card {
          background: #FFFFFF;
          border-radius: 24px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
        }
        .card-heading {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1D1D1F;
          margin: 0 0 0.35rem;
          letter-spacing: -0.015em;
        }
        .card-subheading {
          font-size: 0.8rem;
          color: #86868B;
          margin: 0;
          line-height: 1.45;
        }

        /* ─── Apple Form Inputs ─── */
        .input-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #1D1D1F;
          margin-bottom: 0.35rem;
        }
        .apple-input-hero {
          width: 100%;
          padding: 0.85rem 1rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: #1D1D1F;
          background: #FFFFFF;
          border: 1.5px solid rgba(0, 0, 0, 0.12);
          border-radius: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .apple-input-hero:focus {
          border-color: #0071E3;
          box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.12);
        }
        .apple-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #1D1D1F;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          outline: none;
          transition: all 0.2s ease;
        }
        .apple-input:focus {
          border-color: #0071E3;
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
        }
        .apple-select {
          width: 100%;
          padding: 0.65rem 0.85rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #1D1D1F;
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          outline: none;
          cursor: pointer;
        }
        .apple-select:focus {
          border-color: #0071E3;
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
        }

        /* ─── Preset Cards ─── */
        .preset-card {
          background: #F5F5F7;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 0.75rem 0.85rem;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .preset-card:hover {
          background: #EBF4FE;
          border-color: rgba(0, 113, 227, 0.3);
        }
        .preset-card.selected {
          background: #EFF6FF;
          border-color: #0071E3;
          box-shadow: 0 0 0 1px #0071E3;
        }

        /* ─── Time Pill Buttons ─── */
        .pill-time-btn {
          padding: 0.45rem 0.7rem;
          border-radius: 10px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: #FFFFFF;
          font-size: 0.75rem;
          font-weight: 600;
          color: #48484A;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pill-time-btn:hover {
          border-color: #0071E3;
          color: #0071E3;
        }
        .pill-time-btn.active {
          background: #0071E3;
          color: #FFFFFF;
          border-color: #0071E3;
        }

        /* ─── Indicator Choice Card ─── */
        .indicator-choice-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.65rem 0.85rem;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #FAFAFA;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .indicator-choice-card:hover {
          background: #FFFFFF;
          border-color: #0071E3;
        }
        .indicator-choice-card.selected {
          background: #EFF6FF;
          border-color: #0071E3;
        }

        /* ─── Buttons ─── */
        .apple-btn-hero {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #0071E3;
          color: #FFFFFF;
          font-size: 0.95rem;
          font-weight: 700;
          padding: 0.85rem 1.5rem;
          border-radius: 980px;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 14px rgba(0, 113, 227, 0.25);
        }
        .apple-btn-hero:hover:not(:disabled) {
          background: #0077ED;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 113, 227, 0.35);
        }
        .apple-btn-hero:active:not(:disabled) {
          transform: scale(0.98);
        }
        .apple-btn-hero:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .apple-btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: #0071E3;
          color: #FFFFFF;
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.7rem 1.25rem;
          border-radius: 980px;
          border: none;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .apple-btn-primary:hover:not(:disabled) {
          background: #0077ED;
        }
        .apple-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(0, 0, 0, 0.04);
          color: #1D1D1F;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.5rem 0.95rem;
          border-radius: 980px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .apple-btn-secondary:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        /* ─── Right Column Sticky Preview ─── */
        .sticky-preview-wrapper {
          position: sticky;
          top: 5.5rem;
        }
        .apple-preview-card {
          background: #FFFFFF;
          border-radius: 24px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-shadow: 0 4px 24px -2px rgba(0, 0, 0, 0.04);
          padding: 1.5rem;
        }
        .preview-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 0.85rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .preview-header-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #1D1D1F;
        }
        .preview-status-pill {
          font-size: 0.7rem;
          font-weight: 700;
          background: #ECFDF5;
          color: #047857;
          padding: 0.15rem 0.55rem;
          border-radius: 980px;
          border: 1px solid #A7F3D0;
        }
        .preview-topic-block {
          padding: 1rem 0;
        }
        .preview-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #86868B;
          display: block;
          margin-bottom: 0.25rem;
        }
        .preview-topic-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1D1D1F;
          line-height: 1.35;
          margin: 0;
        }
        .preview-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .meta-box {
          background: #F5F5F7;
          border-radius: 12px;
          padding: 0.65rem 0.85rem;
        }
        .meta-lbl {
          font-size: 0.675rem;
          font-weight: 600;
          color: #86868B;
          display: block;
        }
        .meta-val {
          font-size: 0.825rem;
          font-weight: 700;
          color: #1D1D1F;
          margin-top: 0.15rem;
          display: block;
        }
        .preview-teacher-section {
          background: rgba(0, 113, 227, 0.04);
          border: 1px solid rgba(0, 113, 227, 0.12);
          border-radius: 14px;
          padding: 0.75rem 0.95rem;
          margin-bottom: 1rem;
        }
        .preview-badges-list {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .badge-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.75rem;
          color: #48484A;
        }

        /* ─── AI Generation Banner ─── */
        .ai-generation-box {
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 16px;
          padding: 1rem 1.25rem;
        }
        .apple-spinner-blue {
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(0, 113, 227, 0.15);
          border-top-color: #0071E3;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .apple-alert-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #FFF1F2;
          border: 1px solid #FECDD3;
          color: #BE123C;
          padding: 0.75rem 1rem;
          border-radius: 14px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }
      `}</style>
    </div>
  );
}
