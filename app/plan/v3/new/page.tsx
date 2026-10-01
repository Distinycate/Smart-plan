'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

function Field({ label, required, children, hint }: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="v3-field">
      <label className="v3-label">
        {label}
        {required && <span className="v3-required"> *</span>}
      </label>
      {children}
      {hint && <p className="v3-hint">{hint}</p>}
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
      className="v3-select"
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
  }, [selectedSubjectKey]);

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
    // Find learning area from selected subject
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
  }, [selectedSubjectKey, selectedGrade]);

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
  }, [selectedStandard]);

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
      // Build lesson payload
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

      // Save curriculum links if indicators were selected
      if (selectedIndicators.length > 0) {
        const subj = subjects.find(s => subjectNameToKey(s.nameTh) === selectedSubjectKey);
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

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="v3-new-page">
      {/* Step Navigation */}
      <div className="v3-step-nav">
        {['ข้อมูลแผน', 'เป้าหมาย', 'กิจกรรม', 'ประเมินผล', 'ชุดพร้อมสอน', 'ตรวจคุณภาพ', 'เอกสาร'].map((label, i) => (
          <div key={i} className={`v3-step-item ${i === 0 ? 'active' : 'disabled'}`}>
            <div className="v3-step-dot">{i + 1}</div>
            <span className="v3-step-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="v3-new-body">
        <div className="v3-new-card">
          <h1 className="v3-card-title">ขั้นที่ 1 — ข้อมูลแผนการสอน</h1>
          <p className="v3-card-desc">เลือกหลักสูตร วิชา ระดับชั้น และกรอกข้อมูลพื้นฐานของแผน</p>

          {/* ─── Section A: Curriculum & Subject ─── */}
          <section className="v3-section">
            <h2 className="v3-section-title">📌 หลักสูตรและกลุ่มสาระ</h2>

            <div className="v3-row-2">
              <Field label="หลักสูตร" required>
                <input
                  className="v3-input"
                  value="หลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พ.ศ. 2551 (ปรับปรุง 2560)"
                  readOnly
                  style={{ background: '#F7FAFC', color: '#718096' }}
                />
              </Field>

              <Field label="กลุ่มสาระการเรียนรู้ / วิชา" required>
                {loadingSubjects ? (
                  <div className="v3-loading-text">กำลังโหลดข้อมูลหลักสูตร...</div>
                ) : (
                  <Select
                    value={selectedSubjectKey}
                    onChange={v => { setSelectedSubjectKey(v); }}
                    placeholder="— เลือกกลุ่มสาระ —"
                    options={subjects.map(s => ({
                      value: subjectNameToKey(s.nameTh),
                      label: s.nameTh,
                    }))}
                  />
                )}
              </Field>
            </div>

            <div className="v3-row-2">
              <Field label="ระดับชั้น" required>
                <Select
                  value={selectedGrade}
                  onChange={setSelectedGrade}
                  placeholder="— เลือกระดับชั้น —"
                  disabled={!selectedSubjectKey || availableGrades.length === 0}
                  options={availableGrades.map(g => ({ value: g, label: g }))}
                />
                {selectedSubjectKey && availableGrades.length === 0 && (
                  <p className="v3-hint v3-hint-warn">ยังไม่มีข้อมูลหลักสูตรสำหรับวิชานี้</p>
                )}
              </Field>

              <Field label="ลักษณะการเรียนรู้ที่เน้น" required hint="ระบุว่าคาบนี้เน้นอะไรเป็นหลัก เพื่อช่วยออกแบบหลักฐานและกิจกรรม">
                <Select
                  value={selectedFocus}
                  onChange={setSelectedFocus}
                  placeholder="— เลือกลักษณะการเรียนรู้ —"
                  disabled={learningFocuses.length === 0}
                  options={learningFocuses.map(f => ({ value: f.key, label: f.labelTh }))}
                />
                {focusGuidance && (
                  <div className="v3-focus-guidance">
                    💡 {focusGuidance}
                  </div>
                )}
              </Field>
            </div>
          </section>

          {/* ─── Section B: Standard & Indicators ─── */}
          {selectedGrade && (
            <section className="v3-section">
              <h2 className="v3-section-title">📋 มาตรฐานและตัวชี้วัด</h2>
              <p className="v3-section-hint">สำหรับแผน 1 ชั่วโมง ควรเลือกเฉพาะตัวชี้วัดที่เกี่ยวข้องโดยตรงกับคาบนี้</p>

              <Field label="มาตรฐานการเรียนรู้">
                {loadingStandards ? (
                  <div className="v3-loading-text">กำลังโหลดมาตรฐาน...</div>
                ) : standards.length === 0 ? (
                  <div className="v3-hint">ไม่พบมาตรฐานสำหรับวิชา/ชั้นนี้</div>
                ) : (
                  <Select
                    value={selectedStandard}
                    onChange={setSelectedStandard}
                    placeholder="— เลือกมาตรฐาน —"
                    options={standards.map(s => ({ value: s.code, label: `${s.code} — ${s.text}` }))}
                  />
                )}
              </Field>

              {selectedStandard && (
                <Field label="ตัวชี้วัด (เลือกได้หลายข้อ)">
                  {loadingIndicators ? (
                    <div className="v3-loading-text">กำลังโหลดตัวชี้วัด...</div>
                  ) : indicators.length === 0 ? (
                    <div className="v3-hint">ไม่พบตัวชี้วัดสำหรับมาตรฐานนี้</div>
                  ) : (
                    <div className="v3-indicator-list">
                      {indicators.map(ind => (
                        <label key={ind.code} className="v3-indicator-item">
                          <input
                            type="checkbox"
                            checked={selectedIndicators.includes(ind.code)}
                            onChange={() => toggleIndicator(ind.code)}
                            className="v3-checkbox"
                          />
                          <span>
                            <strong>{ind.code}</strong> — {ind.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedIndicators.length > 3 && (
                    <div className="v3-focus-guidance v3-focus-warn">
                      ⚠️ เลือกตัวชี้วัดหลายข้อมาก อาจทำให้แผน 1 ชั่วโมงนี้หนักเกินไป
                    </div>
                  )}
                </Field>
              )}
            </section>
          )}

          {/* ─── Section C: Lesson Info ─── */}
          <section className="v3-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 className="v3-section-title" style={{ margin: 0 }}>📝 ข้อมูลแผน</h2>
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
                  className="v3-btn v3-btn-ghost v3-btn-sm"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#4F46E5', borderColor: '#C7D2FE', background: '#EEF2FF' }}
                >
                  ✨ เติมข้อมูลแนะนำสำหรับวิชานี้
                </button>
              )}
            </div>

            <Field label="เรื่อง (Topic)" required hint="ชื่อเรื่องที่สอนในคาบนี้ เช่น 'Talking about Jobs'">
              <input
                className="v3-input"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="เช่น Talking about Jobs, ระบบสุริยะ, สมการเชิงเส้น"
                maxLength={200}
              />
              {/* Quick Topic Chips */}
              {selectedSubjectKey && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 600 }}>💡 หัวข้อแนะนำ:</span>
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
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        border: topic === t ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                        background: topic === t ? '#EEF2FF' : '#F8FAFC',
                        color: topic === t ? '#4338CA' : '#4A5568',
                        cursor: 'pointer',
                        fontWeight: topic === t ? 600 : 400,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <div className="v3-row-2">
              <Field label="หน่วยการเรียนรู้">
                <input
                  className="v3-input"
                  value={unitRef}
                  onChange={e => setUnitRef(e.target.value)}
                  placeholder="เช่น หน่วยที่ 3 ชีวิตประจำวัน"
                />
              </Field>
              <Field label="เวลา (นาที)" required>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    className="v3-input"
                    type="number"
                    value={duration}
                    onChange={e => setDuration(Math.max(1, Number(e.target.value)))}
                    min={1}
                    step={5}
                    style={{ maxWidth: '100px' }}
                  />
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {[50, 60, 100, 120].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDuration(m)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          border: duration === m ? '1px solid #4F46E5' : '1px solid #CBD5E0',
                          background: duration === m ? '#4F46E5' : '#FFFFFF',
                          color: duration === m ? '#FFFFFF' : '#4A5568',
                          cursor: 'pointer',
                          fontWeight: duration === m ? 600 : 400,
                        }}
                      >
                        {m} นาที
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            </div>

            <div className="v3-row-2">
              <Field label="ชื่อรายวิชา">
                <input
                  className="v3-input"
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="เช่น ภาษาอังกฤษพื้นฐาน"
                />
              </Field>
              <Field label="รหัสวิชา">
                <input
                  className="v3-input"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  placeholder="เช่น อ21101"
                />
              </Field>
            </div>

            <div className="v3-row-2">
              <Field label="วันที่สอน">
                <input
                  className="v3-input"
                  type="date"
                  value={teachingDate}
                  onChange={e => setTeachingDate(e.target.value)}
                />
              </Field>
            </div>

            <Field label="บริบทผู้เรียน" hint="อธิบายกลุ่มผู้เรียนโดยสังเขป เช่น จำนวนนักเรียน ระดับความสามารถ ความต้องการพิเศษ">
              <textarea
                className="v3-textarea"
                value={studentContext}
                onChange={e => setStudentContext(e.target.value)}
                placeholder="เช่น ห้อง ม.1/2 จำนวน 36 คน มีทักษะภาษาอังกฤษระดับ A1–A2"
                rows={2}
              />
              {/* Quick Context Chips */}
              <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#718096', fontWeight: 600 }}>💡 บริบทแนะนำ:</span>
                {[
                  'ชั้นเรียนปกติ (35–40 คน)',
                  'ห้องเรียนคละความสามารถ (Mixed-Ability)',
                  'เน้นการทำงานกลุ่มและฝึกปฏิบัติการ',
                  'ห้องเรียนพร้อมอุปกรณ์ ICT และจอแสดงผล',
                  'ห้องเรียนขนาดเล็ก (ไม่เกิน 25 คน)',
                ].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setStudentContext(prev => prev ? `${prev}; ${c}` : c);
                    }}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      color: '#4A5568',
                      cursor: 'pointer',
                    }}
                    title="คลิกเพื่อเติมข้อความ"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          {/* ─── Error & Submit ─── */}
          {error && (
            <div className="v3-alert v3-alert-error">{error}</div>
          )}

          <div className="v3-form-actions">
            <button
              type="button"
              onClick={() => router.push('/plan/v3')}
              className="v3-btn v3-btn-ghost"
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="v3-btn v3-btn-primary"
              disabled={!canSubmit}
              aria-busy={submitting}
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกและไปขั้นถัดไป →'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .v3-new-page {
          min-height: 100vh;
          background: #F7FAFC;
          font-family: 'Noto Sans Thai', sans-serif;
        }
        .v3-step-nav {
          display: flex;
          align-items: center;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 2rem;
          overflow-x: auto;
          gap: 0;
        }
        .v3-step-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.25rem;
          cursor: default;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }
        .v3-step-item.active {
          border-bottom-color: #4F46E5;
          color: #4F46E5;
        }
        .v3-step-item.disabled {
          color: #CBD5E0;
        }
        .v3-step-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .v3-step-item.active .v3-step-dot { background: #4F46E5; color: white; }
        .v3-step-item.disabled .v3-step-dot { background: #EDF2F7; color: #CBD5E0; }
        .v3-step-label { font-size: 0.85rem; font-weight: 500; }
        .v3-new-body {
          max-width: 760px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }
        .v3-new-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 2rem;
        }
        .v3-card-title { font-size: 1.4rem; font-weight: 700; color: #1a202c; margin: 0 0 0.25rem; }
        .v3-card-desc { color: #718096; margin: 0 0 2rem; font-size: 0.9rem; }
        .v3-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #EDF2F7;
        }
        .v3-section:last-of-type { border-bottom: none; }
        .v3-section-title { font-size: 1rem; font-weight: 600; color: #2D3748; margin: 0 0 1rem; }
        .v3-section-hint { font-size: 0.8rem; color: #718096; margin: -0.5rem 0 1rem; }
        .v3-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 560px) { .v3-row-2 { grid-template-columns: 1fr; } }
        .v3-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .v3-label { font-size: 0.875rem; font-weight: 600; color: #4A5568; }
        .v3-required { color: #E53E3E; }
        .v3-input, .v3-select, .v3-textarea {
          border: 1px solid #CBD5E0;
          border-radius: 8px;
          padding: 0.6rem 0.75rem;
          font-size: 0.9rem;
          color: #2D3748;
          background: white;
          transition: border-color 0.15s;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }
        .v3-input:focus, .v3-select:focus, .v3-textarea:focus {
          outline: none;
          border-color: #4F46E5;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
        }
        .v3-select:disabled { background: #F7FAFC; color: #A0AEC0; cursor: not-allowed; }
        .v3-textarea { resize: vertical; min-height: 60px; }
        .v3-hint { font-size: 0.75rem; color: #A0AEC0; margin: 0; }
        .v3-hint-warn { color: #D69E2E; }
        .v3-loading-text { font-size: 0.85rem; color: #718096; padding: 0.5rem 0; }
        .v3-focus-guidance {
          font-size: 0.8rem;
          color: #2B6CB0;
          background: #EBF8FF;
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          margin-top: 0.5rem;
          border-left: 3px solid #63B3ED;
        }
        .v3-focus-warn { background: #FFFBEB; color: #92400E; border-left-color: #F6AD55; }
        .v3-indicator-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .v3-indicator-item {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.6rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #4A5568;
          transition: background 0.1s;
        }
        .v3-indicator-item:hover { background: #F7FAFC; }
        .v3-indicator-item:has(.v3-checkbox:checked) {
          background: #EEF2FF;
          border-color: #A5B4FC;
          color: #3730A3;
        }
        .v3-checkbox { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; accent-color: #4F46E5; }
        .v3-alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.875rem; }
        .v3-alert-error { background: #FFF5F5; color: #C53030; border: 1px solid #FED7D7; }
        .v3-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid #EDF2F7;
        }
        .v3-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-size: 0.9rem;
          transition: all 0.15s;
          font-family: inherit;
        }
        .v3-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .v3-btn-primary { background: #4F46E5; color: white; }
        .v3-btn-primary:hover:not(:disabled) { background: #4338CA; }
        .v3-btn-ghost { background: transparent; color: #718096; border: 1px solid #CBD5E0; }
        .v3-btn-ghost:hover:not(:disabled) { background: #F7FAFC; }
      `}</style>
    </div>
  );
}
