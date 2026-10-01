/**
 * Step 8: ผลการจัดการเรียนรู้ (Teaching Session Results)
 *
 * Lifecycle State Transition: FINAL -> TAUGHT
 *
 * Fields:
 * - วันที่สอนจริง (taughtAt)
 * - เวลาที่ใช้จริง (actualDurationMinutes)
 * - สถิติผู้เรียน:
 *   - นักเรียนทั้งหมด (studentsTotal)
 *   - มาเรียน (studentsPresent)
 *   - ขาดเรียน (studentsAbsent)
 *   - ได้รับการประเมิน (studentsAssessed)
 *   - ผ่านเกณฑ์ (studentsPassed)
 *   - ต้องได้รับการช่วยเหลือ / ซ่อมเสริม (studentsNeedSupport)
 * - บันทึกการสอนจริง (actualTeachingNotes)
 *
 * Action: "บันทึกผลการสอน" -> TAUGHT
 */

'use client';

import React, { useState, useEffect } from 'react';
import { POST_TEACHING_SUGGESTION_GROUPS } from '@/lib/smartPlanV3/suggestions';

interface Step8TeachingResultsProps {
  planId: string;
  lessonStatus: string;
  onNavigateToStep: (step: number) => void;
  onStatusUpdated?: () => void;
}

export default function Step8TeachingResults({
  planId,
  lessonStatus,
  onNavigateToStep,
  onStatusUpdated,
}: Step8TeachingResultsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [taughtAt, setTaughtAt] = useState<string>(new Date().toISOString().substring(0, 10));
  const [actualDuration, setActualDuration] = useState<number>(60);
  const [studentsTotal, setStudentsTotal] = useState<number>(40);
  const [studentsPresent, setStudentsPresent] = useState<number>(38);
  const [studentsAbsent, setStudentsAbsent] = useState<number>(2);
  const [studentsAssessed, setStudentsAssessed] = useState<number>(38);
  const [studentsPassed, setStudentsPassed] = useState<number>(34);
  const [studentsNeedSupport, setStudentsNeedSupport] = useState<number>(4);
  const [teachingNotes, setTeachingNotes] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/plan/v3/${planId}/post-teaching`);
        if (!res.ok) throw new Error('โหลดข้อมูลหลังสอนไม่สำเร็จ');
        const json = await res.json();
        if (json.record) {
          const rec = json.record;
          if (rec.taught_at) setTaughtAt(rec.taught_at.substring(0, 10));
          if (rec.actual_duration_minutes) setActualDuration(rec.actual_duration_minutes);
          if (rec.students_total) setStudentsTotal(rec.students_total);
          if (rec.students_present !== null && rec.students_present !== undefined) setStudentsPresent(rec.students_present);
          if (rec.students_absent !== null && rec.students_absent !== undefined) setStudentsAbsent(rec.students_absent);
          if (rec.students_assessed !== null && rec.students_assessed !== undefined) setStudentsAssessed(rec.students_assessed);
          if (rec.students_passed !== null && rec.students_passed !== undefined) setStudentsPassed(rec.students_passed);
          if (rec.students_need_support !== null && rec.students_need_support !== undefined) setStudentsNeedSupport(rec.students_need_support);
          if (rec.actual_teaching_notes) setTeachingNotes(rec.actual_teaching_notes);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [planId]);

  // Validation
  const validate = () => {
    if (studentsTotal <= 0) return 'จำนวนนักเรียนทั้งหมดต้องมากกว่า 0';
    if (studentsPassed < 0) return 'จำนวนนักเรียนที่ผ่านเกณฑ์ต้องไม่ติดลบ';
    if (studentsNeedSupport < 0) return 'จำนวนนักเรียนที่ต้องช่วยเหลือต้องไม่ติดลบ';
    if (studentsPassed + studentsNeedSupport > studentsTotal) {
      return `ผลรวมนักเรียนที่ผ่าน (${studentsPassed}) และต้องช่วยเหลือ (${studentsNeedSupport}) ต้องไม่เกินจำนวนทั้งหมด (${studentsTotal})`;
    }
    if (studentsPresent + studentsAbsent !== studentsTotal) {
      return `นักเรียนมาเรียน (${studentsPresent}) + ขาดเรียน (${studentsAbsent}) ต้องเท่ากับจำนวนนักเรียนทั้งหมด (${studentsTotal})`;
    }
    if (studentsAssessed > studentsPresent) {
      return `นักเรียนที่ได้รับการประเมิน (${studentsAssessed}) ต้องไม่เกินจำนวนที่มาเรียน (${studentsPresent})`;
    }
    return null;
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taught_at: new Date(taughtAt).toISOString(),
          actual_duration_minutes: actualDuration,
          students_total: studentsTotal,
          students_present: studentsPresent,
          students_absent: studentsAbsent,
          students_assessed: studentsAssessed,
          students_passed: studentsPassed,
          students_need_support: studentsNeedSupport,
          actual_teaching_notes: teachingNotes,
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

  const handleCommitTeaching = async () => {
    const valErr = validate();
    if (valErr) {
      setError(valErr);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/plan/v3/${planId}/post-teaching/teach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taught_at: new Date(taughtAt).toISOString(),
          actual_duration_minutes: actualDuration,
          students_total: studentsTotal,
          students_present: studentsPresent,
          students_absent: studentsAbsent,
          students_assessed: studentsAssessed,
          students_passed: studentsPassed,
          students_need_support: studentsNeedSupport,
          actual_teaching_notes: teachingNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'บันทึกผลการสอนไม่สำเร็จ');

      setSuccessMsg('บันทึกผลการสอนเรียบร้อย — แผนเปลี่ยนสถานะเป็น "จัดกิจกรรมแล้ว (TAUGHT)"');
      if (onStatusUpdated) onStatusUpdated();
      setTimeout(() => {
        onNavigateToStep(9);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        กำลังโหลดข้อมูลผลการจัดการเรียนรู้...
      </div>
    );
  }

  const isLocked = lessonStatus === 'DRAFT' || lessonStatus === 'REVIEWED';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ขั้นตอนที่ 8</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">ผลการจัดการเรียนรู้ (Teaching Results)</h1>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
            lessonStatus === 'TAUGHT' || lessonStatus === 'REFLECTED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            สถานะแผน: {lessonStatus}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          บันทึกข้อมูลและสถิติที่เกิดขึ้นจริงจากการจัดการเรียนรู้ในชั้นเรียน เพื่อใช้เป็นฐานข้อมูลในการสะท้อนผลและพัฒนาการเรียนรู้
        </p>
      </div>

      {isLocked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          ⚠️ แผนการสอนนี้ยังไม่ได้ล็อคเป็นฉบับสมบูรณ์ (FINAL) กรุณาตรวจสอบคุณภาพและสั่งพิมพ์/ล็อคแผนในขั้นตอนก่อนหน้าให้เรียบร้อยก่อนบันทึกผลการสอนจริง
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

      {/* Form Content */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. ข้อมูลการสอนและเวลาที่ใช้จริง
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่สอนจริง</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={taughtAt}
              onChange={(e) => setTaughtAt(e.target.value)}
              disabled={isLocked || saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาที่ใช้จริง (นาที)</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={actualDuration}
              onChange={(e) => setActualDuration(Number(e.target.value))}
              disabled={isLocked || saving}
            />
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 pt-2">
          2. สถิติและจำนวนผู้เรียน
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">จำนวนนักเรียนทั้งหมด (คน) *</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={studentsTotal}
              onChange={(e) => setStudentsTotal(Number(e.target.value))}
              disabled={isLocked || saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">มาเรียน (คน)</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={studentsPresent}
              onChange={(e) => {
                const p = Number(e.target.value);
                setStudentsPresent(p);
                setStudentsAbsent(Math.max(0, studentsTotal - p));
              }}
              disabled={isLocked || saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ขาดเรียน (คน)</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={studentsAbsent}
              onChange={(e) => {
                const a = Number(e.target.value);
                setStudentsAbsent(a);
                setStudentsPresent(Math.max(0, studentsTotal - a));
              }}
              disabled={isLocked || saving}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ได้รับการประเมิน (คน)</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={studentsAssessed}
              onChange={(e) => setStudentsAssessed(Number(e.target.value))}
              disabled={isLocked || saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-emerald-700 mb-1">ผ่านเกณฑ์การประเมิน (คน) *</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-900 bg-emerald-50/30 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={studentsPassed}
              onChange={(e) => setStudentsPassed(Number(e.target.value))}
              disabled={isLocked || saving}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-700 mb-1">ต้องช่วยเหลือ / ซ่อมเสริม (คน) *</label>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold text-amber-900 bg-amber-50/30 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              value={studentsNeedSupport}
              onChange={(e) => setStudentsNeedSupport(Number(e.target.value))}
              disabled={isLocked || saving}
            />
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 pt-2">
          3. บันทึกการจัดการเรียนรู้จริง
        </h2>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            บันทึกการจัดกิจกรรม บรรยากาศในชั้นเรียน และข้อสังเกตทั่วไป
          </label>
          {(() => {
            const group = POST_TEACHING_SUGGESTION_GROUPS.find((g) => g.field === 'actualTeachingNotes');
            if (!group) return null;
            return (
              <div className="flex gap-1.5 flex-wrap mb-2">
                <span className="text-xs text-slate-500 font-medium self-center">💡 ตัวเลือกด่วน:</span>
                {group.chips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isLocked || saving}
                    onClick={() => {
                      setTeachingNotes((prev) => (prev ? `${prev}\n• ${chip}` : `• ${chip}`));
                    }}
                    className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 rounded-lg transition"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            );
          })()}
          <textarea
            rows={4}
            className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="เช่น นักเรียนมีความกระตือรือร้นในการทำกิจกรรมกลุ่ม สามารถสร้างแบบจำลองได้ตามเวลาที่กำหนด..."
            value={teachingNotes}
            onChange={(e) => setTeachingNotes(e.target.value)}
            disabled={isLocked || saving}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => onNavigateToStep(7)}
          className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          ← ย้อนกลับไปขั้นที่ 7
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isLocked || saving}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกแบบร่าง'}
          </button>
          <button
            type="button"
            onClick={handleCommitTeaching}
            disabled={isLocked || saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {saving ? 'กำลังประมวลผล...' : 'บันทึกผลการสอน (ยืนยัน TAUGHT) →'}
          </button>
        </div>
      </div>
    </div>
  );
}
