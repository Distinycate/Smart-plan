'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock, FilePlus2, Loader2, Search } from 'lucide-react';

export default function UnitPlanLibraryPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetch('/api/unit-plans', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || 'โหลดรายการไม่สำเร็จ');
        setPlans(result.data || []);
      })
      .catch(fetchError => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return plans.filter(plan => {
      const statusMatch = status === 'all' || plan.unitPlanStatus === status;
      const text = `${plan.unitName || ''} ${plan.subjectName || ''} ${plan.gradeLevel || ''} ${plan.academicYear || ''}`.toLowerCase();
      return statusMatch && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [plans, query, status]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-pink-500">Unit Plan Library</p>
          <h1 className="text-3xl font-black text-slate-900">คลังแผนระดับหน่วย</h1>
          <p className="mt-1 text-slate-500">ค้นหา แก้ไข ตรวจสอบ และส่งออกแผนระดับหน่วย</p>
        </div>
        <Link href="/unit-plans/new" className="inline-flex items-center gap-2 rounded-xl bg-pink-500 px-5 py-3 font-bold text-white">
          <FilePlus2 size={18} /> สร้างแผนระดับหน่วย
        </Link>
      </div>

      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_200px]">
        <label className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อหน่วย วิชา ชั้น หรือปีการศึกษา" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3" />
        </label>
        <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <option value="all">ทุกสถานะ</option>
          <option value="draft">ฉบับร่าง</option>
          <option value="ready">พร้อมใช้</option>
        </select>
      </div>

      {loading && <div className="flex min-h-64 items-center justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> กำลังโหลด...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

      {!loading && !error && filteredPlans.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <BookOpen className="mx-auto mb-3 text-slate-300" size={42} />
          <p className="font-black text-slate-700">ยังไม่พบแผนระดับหน่วย</p>
          <p className="text-sm text-slate-500">เริ่มสร้างแผนแรกหรือปรับคำค้นหา</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPlans.map(plan => (
          <Link key={plan.unitPlanId} href={`/unit-plans/${plan.unitPlanId}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-pink-200 hover:shadow-md">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="rounded-xl bg-pink-50 p-2.5 text-pink-500"><BookOpen size={22} /></div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${plan.unitPlanStatus === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {plan.unitPlanStatus === 'ready' ? 'พร้อมใช้' : 'ฉบับร่าง'}
              </span>
            </div>
            <h2 className="line-clamp-2 text-xl font-black text-slate-900 group-hover:text-pink-600">{plan.unitName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">{plan.subjectName || 'ไม่ระบุวิชา'} · {plan.gradeLevel}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>ภาคเรียน {plan.semester}/{plan.academicYear}</span>
              <span className="inline-flex items-center gap-1"><Clock size={14} /> {Number(plan.totalUnitHours || 0)} ชม.</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

