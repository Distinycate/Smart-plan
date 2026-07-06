'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Loader2, Pencil, Plus, X } from 'lucide-react';

type UnitLesson = {
  unitLessonId: string;
  lessonOrder: number;
  lessonTitle: string;
  lessonTopic?: string;
  estimatedHours: number;
  learningFocus?: string;
  lessonStatus: string;
};

const emptyLesson = {
  lessonTitle: '',
  lessonTopic: '',
  estimatedHours: 1,
  learningFocus: '',
};

export default function UnitLessonSequence({
  unitPlanId,
  lessons,
  onChanged,
}: {
  unitPlanId: string;
  lessons: UnitLesson[];
  onChanged: () => Promise<void>;
}) {
  const activeLessons = useMemo(
    () => [...lessons]
      .filter(lesson => lesson.lessonStatus !== 'archived')
      .sort((a, b) => Number(a.lessonOrder) - Number(b.lessonOrder)),
    [lessons]
  );
  const [form, setForm] = useState(emptyLesson);
  const [editingId, setEditingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!editingId) setForm(emptyLesson);
  }, [editingId, lessons]);

  const totalHours = activeLessons.reduce(
    (sum, lesson) => sum + Number(lesson.estimatedHours || 0),
    0
  );

  const submitLesson = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const currentLesson = activeLessons.find(lesson => lesson.unitLessonId === editingId);
      const payload = {
        ...form,
        lessonOrder: currentLesson?.lessonOrder || activeLessons.length + 1,
      };
      const url = editingId
        ? `/api/unit-plans/${unitPlanId}/lessons/${editingId}`
        : `/api/unit-plans/${unitPlanId}/lessons`;
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'บันทึกแผนรายคาบไม่สำเร็จ');

      setForm(emptyLesson);
      setEditingId('');
      setMessage({ type: 'success', text: result.message });
      await onChanged();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (lesson: UnitLesson) => {
    setEditingId(lesson.unitLessonId);
    setForm({
      lessonTitle: lesson.lessonTitle || '',
      lessonTopic: lesson.lessonTopic || '',
      estimatedHours: Number(lesson.estimatedHours || 1),
      learningFocus: lesson.learningFocus || '',
    });
    setMessage(null);
  };

  const archiveLesson = async (lesson: UnitLesson) => {
    if (!window.confirm(`นำ "${lesson.lessonTitle}" ออกจากลำดับแผนรายคาบหรือไม่? ข้อมูลจะถูกเก็บถาวร ไม่ได้ลบ`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/unit-plans/${unitPlanId}/lessons/${lesson.unitLessonId}`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'ไม่สามารถนำแผนออกได้');
      setMessage({ type: 'success', text: result.message });
      await onChanged();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  const moveLesson = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activeLessons.length) return;
    const reordered = [...activeLessons];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/unit-plans/${unitPlanId}/lessons/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map(lesson => lesson.unitLessonId) }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || 'จัดลำดับไม่สำเร็จ');
      setMessage({ type: 'success', text: result.message });
      await onChanged();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-700">แผนรายคาบในหน่วย {activeLessons.length} รายการ</p>
          <p className="text-sm text-slate-500">รวม {totalHours} ชั่วโมง</p>
        </div>
        {busy && <span className="inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> กำลังบันทึก...</span>}
      </div>

      {message && (
        <div className={`rounded-xl border p-3 text-sm font-bold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {activeLessons.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-3">ลำดับ</th>
                <th className="px-3 py-3">ชื่อแผน / เรื่อง</th>
                <th className="px-3 py-3">ชั่วโมง</th>
                <th className="px-3 py-3">จุดเน้น</th>
                <th className="px-3 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeLessons.map((lesson, index) => (
                <tr key={lesson.unitLessonId}>
                  <td className="px-3 py-3 font-black text-slate-700">{index + 1}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-800">{lesson.lessonTitle}</p>
                    {lesson.lessonTopic && <p className="text-xs text-slate-500">{lesson.lessonTopic}</p>}
                  </td>
                  <td className="px-3 py-3">{Number(lesson.estimatedHours)} ชม.</td>
                  <td className="max-w-xs px-3 py-3 text-slate-600">{lesson.learningFocus || '-'}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" disabled={busy || index === 0} onClick={() => moveLesson(index, -1)} className="rounded-lg border p-2 disabled:opacity-30" title="เลื่อนขึ้น"><ArrowUp size={15} /></button>
                      <button type="button" disabled={busy || index === activeLessons.length - 1} onClick={() => moveLesson(index, 1)} className="rounded-lg border p-2 disabled:opacity-30" title="เลื่อนลง"><ArrowDown size={15} /></button>
                      <button type="button" disabled={busy} onClick={() => startEdit(lesson)} className="rounded-lg border p-2 text-blue-600 disabled:opacity-30" title="แก้ไข"><Pencil size={15} /></button>
                      <button type="button" disabled={busy} onClick={() => archiveLesson(lesson)} className="rounded-lg border p-2 text-amber-600 disabled:opacity-30" title="นำออก"><Archive size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-black text-slate-800">{editingId ? 'แก้ไขแผนรายคาบ' : 'เพิ่มแผนรายคาบ'}</h3>
          {editingId && (
            <button type="button" onClick={() => setEditingId('')} className="inline-flex items-center gap-1 text-sm text-slate-500"><X size={15} /> ยกเลิกแก้ไข</button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            ชื่อแผน
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5" value={form.lessonTitle} onChange={event => setForm(current => ({ ...current, lessonTitle: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            เรื่องที่สอน
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5" value={form.lessonTopic} onChange={event => setForm(current => ({ ...current, lessonTopic: event.target.value }))} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            จำนวนชั่วโมง
            <input type="number" min="0.5" step="0.5" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5" value={form.estimatedHours} onChange={event => setForm(current => ({ ...current, estimatedHours: Number(event.target.value) }))} />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            จุดเน้นการเรียนรู้
            <input className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2.5" value={form.learningFocus} onChange={event => setForm(current => ({ ...current, learningFocus: event.target.value }))} />
          </label>
        </div>
        <button type="button" disabled={busy} onClick={submitLesson} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 font-bold text-white disabled:opacity-50">
          {busy ? <Loader2 className="animate-spin" size={17} /> : editingId ? <Pencil size={17} /> : <Plus size={17} />}
          {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มแผนรายคาบ'}
        </button>
      </div>
    </div>
  );
}

