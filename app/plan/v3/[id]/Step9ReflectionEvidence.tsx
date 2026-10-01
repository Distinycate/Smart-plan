/**
 * Step 9: สะท้อนผลและหลักฐานเชิงประจักษ์ (Reflection & Student Evidence)
 *
 * Lifecycle State Transition: TAUGHT -> REFLECTED
 *
 * Features:
 * - Clear separation: Planned Evidence vs Observed Evidence
 * - Teacher Reflection Fields:
 *   - สิ่งที่ได้ผลดี (whatWorked)
 *   - ปัญหาที่พบ (problems)
 *   - การปรับกิจกรรมจริง (adjustmentsMade)
 *   - ข้อมูลย้อนกลับที่ให้ (feedbackGiven)
 *   - แผนการช่วยเหลือ / สอนซ่อมเสริม (remediationPlan) — บังคับเมื่อมีนักเรียนต้องช่วยเหลือ!
 *   - ข้อเสนอสำหรับการสอนครั้งต่อไป (nextLessonAdjustment)
 *   - บันทึกสะท้อนผลของครู (reflection)
 * - Observed Student Evidence Manager (Add, List, Delete)
 * - Optional AI Assistance for drafting suggestion (Zero automatic DB commit)
 * - Action: "ยืนยันการสะท้อนผล (REFLECTED)"
 */

'use client';

import React, { useState, useEffect } from 'react';
import { POST_TEACHING_SUGGESTION_GROUPS } from '@/lib/smartPlanV3/suggestions';

interface Step9ReflectionEvidenceProps {
  planId: string;
  lessonStatus: string;
  onNavigateToStep: (step: number) => void;
  onStatusUpdated?: () => void;
}

export default function Step9ReflectionEvidence({
  planId,
  lessonStatus,
  onNavigateToStep,
  onStatusUpdated,
}: Step9ReflectionEvidenceProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Teaching Record & Evidence
  const [supportCount, setSupportCount] = useState<number>(0);
  const [whatWorked, setWhatWorked] = useState<string>('');
  const [problems, setProblems] = useState<string>('');
  const [adjustmentsMade, setAdjustmentsMade] = useState<string>('');
  const [feedbackGiven, setFeedbackGiven] = useState<string>('');
  const [remediationPlan, setRemediationPlan] = useState<string>('');
  const [nextLessonAdjustment, setNextLessonAdjustment] = useState<string>('');
  const [reflection, setReflection] = useState<string>('');

  const [observedEvidence, setObservedEvidence] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);

  // New Evidence Modal/Form
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState('AGGREGATE_RESULT');
  const [evDescription, setEvDescription] = useState('');
  const [evOutcomeStatus, setEvOutcomeStatus] = useState('OBSERVED');
  const [evObjectiveId, setEvObjectiveId] = useState('');
  const [evSampleLabel, setEvSampleLabel] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [ptRes, objRes] = await Promise.all([
        fetch(`/api/plan/v3/${planId}/post-teaching`),
        fetch(`/api/plan/v3/${planId}/objectives`),
      ]);

      if (ptRes.ok) {
        const json = await ptRes.json();
        if (json.record) {
          const rec = json.record;
          setSupportCount(rec.students_need_support || 0);
          if (rec.what_worked) setWhatWorked(rec.what_worked);
          if (rec.problems) setProblems(rec.problems);
          if (rec.adjustments_made) setAdjustmentsMade(rec.adjustments_made);
          if (rec.feedback_given) setFeedbackGiven(rec.feedback_given);
          if (rec.remediation_plan) setRemediationPlan(rec.remediation_plan);
          if (rec.next_lesson_adjustment) setNextLessonAdjustment(rec.next_lesson_adjustment);
          if (rec.reflection) setReflection(rec.reflection);
        }
        if (json.observedEvidence) {
          setObservedEvidence(json.observedEvidence);
        }
      }

      if (objRes.ok) {
        const objJson = await objRes.json();
        setObjectives(objJson.objectives || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [planId]);

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      setError('กรุณาระบุชื่อหลักฐานเชิงประจักษ์');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: evTitle.trim(),
          evidence_type: evType,
          description: evDescription.trim(),
          outcome_status: evOutcomeStatus,
          objective_id: evObjectiveId || null,
          sample_label: evSampleLabel.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'เพิ่มหลักฐานไม่สำเร็จ');

      setSuccessMsg('เพิ่มหลักฐานเชิงประจักษ์เรียบร้อย');
      setShowAddEvidence(false);
      setEvTitle('');
      setEvDescription('');
      setEvSampleLabel('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('ต้องการลบหลักฐานเชิงประจักษ์รายการนี้ใช่หรือไม่?')) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching/evidence/${evidenceId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('ลบหลักฐานไม่สำเร็จ');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAiAssist = async () => {
    try {
      setAiLoading(true);
      setError(null);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching/ai-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatWorked,
          problems,
          studentsNeedSupport: supportCount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ขอคำแนะนำไม่สำเร็จ');

      if (json.suggestions) {
        if (!reflection && json.suggestions.suggestedReflection) {
          setReflection(json.suggestions.suggestedReflection);
        }
        if (!remediationPlan && json.suggestions.suggestedRemediation) {
          setRemediationPlan(json.suggestions.suggestedRemediation);
        }
        if (!nextLessonAdjustment && json.suggestions.suggestedNextAdjustment) {
          setNextLessonAdjustment(json.suggestions.suggestedNextAdjustment);
        }
        setSuccessMsg('เติมข้อเสนอแนะสำหรับการตรวจสอบเรียบร้อย (กรุณาตรวจทานและปรับแก้ตามจริง)');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          what_worked: whatWorked,
          problems,
          adjustments_made: adjustmentsMade,
          feedback_given: feedbackGiven,
          remediation_plan: remediationPlan,
          next_lesson_adjustment: nextLessonAdjustment,
          reflection,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกแบบร่างไม่สำเร็จ');
      setSuccessMsg('บันทึกแบบร่างเรียบร้อย');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCommitReflection = async () => {
    if (!reflection.trim()) {
      setError('กรุณาระบุบันทึกการสะท้อนผลของครู (Teacher Reflection)');
      return;
    }

    if (supportCount > 0 && !remediationPlan.trim()) {
      setError(
        `มีนักเรียนที่ต้องได้รับการช่วยเหลือจำนวน ${supportCount} คน จำเป็นต้องระบุแผนการช่วยเหลือ/ซ่อมเสริม (Remediation Plan) ก่อนเปลี่ยนสถานะเป็น REFLECTED`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching/reflect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          what_worked: whatWorked,
          problems,
          adjustments_made: adjustmentsMade,
          feedback_given: feedbackGiven,
          remediation_plan: remediationPlan,
          next_lesson_adjustment: nextLessonAdjustment,
          reflection,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ยืนยันการสะท้อนผลไม่สำเร็จ');

      setSuccessMsg('ยืนยันการสะท้อนผลเรียบร้อย — แผนเปลี่ยนสถานะเป็น "สะท้อนผลสมบูรณ์ (REFLECTED)"');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        กำลังโหลดข้อมูลการสะท้อนผลและหลักฐาน...
      </div>
    );
  }

  const isTaughtOrReflected = lessonStatus === 'TAUGHT' || lessonStatus === 'REFLECTED';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ขั้นตอนที่ 9</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">สะท้อนผลและหลักฐานเชิงประจักษ์ (Reflection & Evidence)</h1>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
            lessonStatus === 'REFLECTED'
              ? 'bg-purple-100 text-purple-800'
              : lessonStatus === 'TAUGHT'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            สถานะแผน: {lessonStatus}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          บันทึกการสะท้อนผลหลังการสอนจริง แผนช่วยเหลือ/สอนซ่อมเสริม และจัดเก็บหลักฐานเชิงประจักษ์ของผู้เรียนเพื่อปิดวงจรการจัดการเรียนรู้ที่สมบูรณ์
        </p>
      </div>

      {!isTaughtOrReflected && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          ⚠️ กรุณาบันทึกผลการสอนในขั้นตอนที่ 8 (เปลี่ยนสถานะเป็น TAUGHT) ก่อนทำการยืนยันการสะท้อนผล
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Semantic Evidence Separation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <span>📋</span> ก่อนสอน: หลักฐานที่วางแผนไว้ (Planned Evidence)
          </div>
          <p className="text-blue-800">
            ภาระงาน ชิ้นงาน หรือการสังเกตที่กำหนดไว้ล่วงหน้าในแผนการสอน (คงสภาพเดิม ไม่ถูกเขียนทับ)
          </p>
        </div>
        <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl text-xs space-y-1">
          <div className="font-bold text-purple-900 flex items-center gap-1.5">
            <span>🔍</span> หลังสอน: หลักฐานเชิงประจักษ์ที่เกิดขึ้นจริง (Observed Evidence)
          </div>
          <p className="text-purple-800">
            ผลคะแนนจริง ตัวอย่างผลงาน ข้อสังเกต หรือภาพบรรยากาศที่เกิดขึ้นจริงจากการจัดการเรียนรู้
          </p>
        </div>
      </div>

      {/* Section 1: Observed Evidence Manager */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">หลักฐานเชิงประจักษ์ของผู้เรียน (Observed Student Evidence)</h2>
            <p className="text-xs text-slate-500">บันทึกสถิติรวม ตัวอย่างผลงานนิรนาม หรือข้อค้นพบจากการประเมินจริง</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddEvidence(!showAddEvidence)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition"
          >
            {showAddEvidence ? 'ยกเลิก' : '+ เพิ่มหลักฐานจริง'}
          </button>
        </div>

        {/* Add Evidence Form */}
        {showAddEvidence && (
          <form onSubmit={handleAddEvidence} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-800">บันทึกหลักฐานเชิงประจักษ์ใหม่</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อหลักฐาน *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ผลรวมการทำแบบฝึกหัดท้ายบท, ตัวอย่างใบงาน Sample A"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ประเภทหลักฐาน</label>
                <select
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={evType}
                  onChange={(e) => setEvType(e.target.value)}
                >
                  <option value="AGGREGATE_RESULT">ผลรวมสถิติคะแนน (Aggregate Result)</option>
                  <option value="STUDENT_WORK_SAMPLE">ตัวอย่างชิ้นงานผู้เรียน (Work Sample)</option>
                  <option value="OBSERVATION">บันทึกการสังเกตพฤติกรรม (Observation)</option>
                  <option value="ASSESSMENT_RESULT">ผลการประเมินรูบริก (Rubric Result)</option>
                  <option value="PHOTO_EVIDENCE">ภาพถ่ายกิจกรรม (Photo Evidence)</option>
                  <option value="EXIT_TICKET_SAMPLE">ตัวอย่างบัตรออกจากชั้นเรียน (Exit Ticket)</option>
                  <option value="PERFORMANCE_SAMPLE">การปฏิบัติ/การนำเสนอ (Performance)</option>
                  <option value="OTHER">อื่นๆ (Other)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">เชื่อมโยงจุดประสงค์ (ถ้ามี)</label>
                <select
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={evObjectiveId}
                  onChange={(e) => setEvObjectiveId(e.target.value)}
                >
                  <option value="">-- ไม่ระบุ / ภาพรวม --</option>
                  {objectives.map((obj, i) => (
                    <option key={obj.id} value={obj.id}>
                      ข้อ {i + 1}: {obj.statement || obj.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะผลลัพธ์</label>
                <select
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={evOutcomeStatus}
                  onChange={(e) => setEvOutcomeStatus(e.target.value)}
                >
                  <option value="OBSERVED">ปรากฏผลชัดเจน (OBSERVED)</option>
                  <option value="PARTIALLY_OBSERVED">ปรากฏผลบางส่วน (PARTIALLY_OBSERVED)</option>
                  <option value="NOT_OBSERVED">ยังไม่ปรากฏผล (NOT_OBSERVED)</option>
                  <option value="NOT_ASSESSED">ไม่ได้ประเมิน (NOT_ASSESSED)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ป้ายกำกับตัวอย่าง (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น Sample A, ชิ้นงานกลุ่ม 2"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  value={evSampleLabel}
                  onChange={(e) => setEvSampleLabel(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">คำอธิบายรายละเอียด</label>
              <textarea
                rows={2}
                placeholder="อธิบายผลการปฏิบัติจริง หรือข้อสังเกตเชิงลึก..."
                className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddEvidence(false)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
              >
                บันทึกหลักฐาน
              </button>
            </div>
          </form>
        )}

        {/* Evidence List */}
        {observedEvidence.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            ยังไม่มีหลักฐานเชิงประจักษ์ที่บันทึก (สามารถปิดวงจรการสะท้อนผลได้โดยการกรอกข้อความสะท้อนผล)
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {observedEvidence.map((ev) => (
              <div key={ev.id} className="p-3.5 flex justify-between items-start hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{ev.title}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                      {ev.evidence_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      ev.outcome_status === 'OBSERVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ev.outcome_status === 'PARTIALLY_OBSERVED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {ev.outcome_status}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-slate-600 pl-0.5">{ev.description}</p>
                  )}
                  {ev.sample_label && (
                    <span className="text-[11px] text-indigo-600 font-medium">ตัวอย่าง: {ev.sample_label}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteEvidence(ev.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 p-1"
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Teacher Reflection & Remediation Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">การสะท้อนผลและแนวทางพัฒนา (Teacher Reflection)</h2>
            <p className="text-xs text-slate-500">วิเคราะห์ข้อดี ปัญหาที่พบ และแนวทางช่วยเหลือผู้เรียน</p>
          </div>
          <button
            type="button"
            onClick={handleAiAssist}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>✨</span>
            <span>{aiLoading ? 'กำลังสร้างข้อความ...' : 'ช่วยร่างข้อความสะท้อนผล'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">สิ่งที่ได้ผลดี (What Worked)</label>
            {(() => {
              const group = POST_TEACHING_SUGGESTION_GROUPS.find((g) => g.field === 'whatWorked');
              if (!group) return null;
              return (
                <div className="flex gap-1 flex-wrap mb-1.5">
                  {group.chips.slice(0, 4).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={saving}
                      onClick={() => setWhatWorked((prev) => (prev ? `${prev}\n• ${chip}` : `• ${chip}`))}
                      className="text-[11px] px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 rounded transition"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              );
            })()}
            <textarea
              rows={3}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="กิจกรรมหรือสื่อการสอนที่ช่วยให้ผู้เรียนเข้าใจได้ดี..."
              value={whatWorked}
              onChange={(e) => setWhatWorked(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ปัญหาและอุปสรรคที่พบ (Problems Found)</label>
            {(() => {
              const group = POST_TEACHING_SUGGESTION_GROUPS.find((g) => g.field === 'problems');
              if (!group) return null;
              return (
                <div className="flex gap-1 flex-wrap mb-1.5">
                  {group.chips.slice(0, 4).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={saving}
                      onClick={() => setProblems((prev) => (prev ? `${prev}\n• ${chip}` : `• ${chip}`))}
                      className="text-[11px] px-2 py-0.5 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-700 hover:text-rose-700 rounded transition"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              );
            })()}
            <textarea
              rows={3}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="ความเข้าใจคลาดเคลื่อน หรือขั้นตอนที่ติดขัด..."
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">การปรับกิจกรรมระหว่างสอนจริง</label>
            <textarea
              rows={2}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="เช่น เพิ่มตัวอย่าง หรือปรับให้ทำงานคู่..."
              value={adjustmentsMade}
              onChange={(e) => setAdjustmentsMade(e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ข้อมูลย้อนกลับที่ให้แก่ผู้เรียน (Feedback Given)</label>
            <textarea
              rows={2}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="คำแนะนำหรือข้อเสนอแนะที่ให้แก่ผู้เรียนเพื่อปรับปรุง..."
              value={feedbackGiven}
              onChange={(e) => setFeedbackGiven(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        {/* Remediation Plan (Critical Gate when supportCount > 0) */}
        <div className={`p-4 rounded-xl border ${supportCount > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex justify-between items-center mb-1">
            <label className={`text-xs font-bold ${supportCount > 0 ? 'text-amber-900' : 'text-slate-800'}`}>
              แผนการช่วยเหลือ / สอนซ่อมเสริม (Remediation Plan) {supportCount > 0 ? '*' : ''}
            </label>
            {supportCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                ต้องช่วยเหลือ {supportCount} คน (บังคับกรอก)
              </span>
            )}
          </div>
          {(() => {
            const group = POST_TEACHING_SUGGESTION_GROUPS.find((g) => g.field === 'remediationPlan');
            if (!group) return null;
            return (
              <div className="flex gap-1 flex-wrap mb-1.5">
                {group.chips.slice(0, 4).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={saving}
                    onClick={() => setRemediationPlan((prev) => (prev ? `${prev}\n• ${chip}` : `• ${chip}`))}
                    className="text-[11px] px-2 py-0.5 bg-white hover:bg-amber-50 border border-amber-200 text-amber-900 rounded transition"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            );
          })()}
          <textarea
            rows={3}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="ระบุกิจกรรมซ่อมเสริม วิธีช่วยเหลือผู้เรียน และแนวทางติดตาม..."
            value={remediationPlan}
            onChange={(e) => setRemediationPlan(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ข้อเสนอแนะสำหรับการสอนครั้งต่อไป</label>
          {(() => {
            const group = POST_TEACHING_SUGGESTION_GROUPS.find((g) => g.field === 'nextLessonAdjustment');
            if (!group) return null;
            return (
              <div className="flex gap-1 flex-wrap mb-1.5">
                {group.chips.slice(0, 4).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={saving}
                    onClick={() => setNextLessonAdjustment((prev) => (prev ? `${prev}, ${chip}` : chip))}
                    className="text-[11px] px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 rounded transition"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            );
          })()}
          <input
            type="text"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="สิ่งที่จะปรับปรุงหรือพัฒนาต่อในคาบถัดไป..."
            value={nextLessonAdjustment}
            onChange={(e) => setNextLessonAdjustment(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">
            บันทึกการสะท้อนผลของครู (Teacher Reflection) *
          </label>
          <textarea
            rows={4}
            required
            className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="บันทึกภาพรวมการจัดการเรียนรู้ ความก้าวหน้าของผู้เรียน และความรู้สึก/ข้อค้นพบของครู..."
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => onNavigateToStep(8)}
          className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          ← ย้อนกลับไปขั้นที่ 8
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง'}
          </button>
          <button
            type="button"
            onClick={handleCommitReflection}
            disabled={!isTaughtOrReflected || saving}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {saving ? 'กำลังประมวลผล...' : 'ยืนยันการสะท้อนผล (REFLECTED) ✓'}
          </button>
        </div>
      </div>
    </div>
  );
}
