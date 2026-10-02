'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, Search, Filter, BookOpen, Clock, Calendar, CheckCircle2, 
  ChevronRight, Eye, Sparkles, Layers, GraduationCap, ArrowRight, 
  FileText, Check, AlertCircle, RefreshCw 
} from 'lucide-react';
import { V3LessonPlan } from '@/lib/smartPlanV3/types';
import { getStatusLabel, getSubjectLabel, formatDuration } from '@/lib/smartPlanV3/labels';

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-5 bg-slate-200 rounded-md w-3/5" />
        <div className="h-5 bg-slate-200 rounded-full w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-100 rounded-md w-4/5" />
        <div className="h-3 bg-slate-100 rounded-md w-1/2" />
      </div>
      <div className="flex gap-2 pt-2">
        <div className="h-6 bg-slate-100 rounded-lg w-16" />
        <div className="h-6 bg-slate-100 rounded-lg w-16" />
        <div className="h-6 bg-slate-100 rounded-lg w-20" />
      </div>
      <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
        <div className="h-3 bg-slate-100 rounded w-24" />
        <div className="h-7 bg-slate-200 rounded-lg w-24" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 px-4 bg-white border border-slate-200/80 rounded-3xl shadow-xs max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
        <Sparkles className="w-8 h-8 text-blue-600" />
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">ยังไม่มีแผนการสอน V3</h2>
      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6 max-w-sm mx-auto leading-relaxed">
        เริ่มต้นสร้างแผนการจัดการเรียนรู้ตามเกณฑ์ ว.PA พร้อมระบบจัดกิจกรรม Active Learning และประเมินผลอัตโนมัติ
      </p>
      <Link href="/plan/v3/new" className="v3-btn v3-btn-primary v3-btn-lg shadow-md inline-flex items-center gap-2">
        <Plus className="w-4 h-4" />
        <span>สร้างแผนการสอน V3 แรก</span>
      </Link>
    </div>
  );
}

function PlanCard({ plan }: { plan: V3LessonPlan }) {
  const statusLabel = getStatusLabel(plan.status);
  const subjectLabel = getSubjectLabel(plan.subject_key);
  const updatedAt = new Date(plan.updated_at).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const isFinalOrReviewed = ['REVIEWED', 'FINAL', 'TAUGHT', 'REFLECTED'].includes(plan.status);
  const isTaught = ['TAUGHT', 'REFLECTED'].includes(plan.status);

  // Status color styles
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BLUEPRINT_READY':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REVIEWED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'FINAL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TAUGHT':
      case 'REFLECTED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:border-blue-400 hover:-translate-y-0.5 transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(plan.status)}`}>
            {statusLabel}
          </span>
          <span className="text-[11px] font-medium text-slate-400 shrink-0">
            {updatedAt}
          </span>
        </div>

        {/* Title & Topic */}
        <Link href={`/plan/v3/${plan.id}`} className="block">
          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
            {plan.topic || plan.title}
          </h3>
          {plan.unit_reference && (
            <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
              {plan.unit_reference}
            </p>
          )}
        </Link>

        {/* Meta Chips */}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80">
            <BookOpen className="w-3 h-3 text-slate-500" />
            <span>{subjectLabel}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80">
            <GraduationCap className="w-3 h-3 text-slate-500" />
            <span>{plan.grade_level}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200/80">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{formatDuration(plan.duration_minutes)}</span>
          </span>

          {plan.learning_focus && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-blue-50/70 text-blue-700 border border-blue-200/80 max-w-full truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate">{plan.learning_focus}</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-100 pt-4 mt-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isFinalOrReviewed && (
            <Link
              href={`/plan/v3/${plan.id}/preview`}
              className="v3-btn v3-btn-ghost v3-btn-xs text-[11px]"
              title="ดูเอกสารฉบับพิมพ์ A4"
            >
              <Eye className="w-3 h-3" />
              <span>ดู A4</span>
            </Link>
          )}

          {isTaught && (
            <Link
              href={`/plan/v3/${plan.id}?step=8`}
              className="v3-btn v3-btn-ghost v3-btn-xs text-[11px] text-purple-700 border-purple-200 bg-purple-50/50"
              title="บันทึกผลการสอน"
            >
              <span>ผลการสอน</span>
            </Link>
          )}
        </div>

        <Link
          href={`/plan/v3/${plan.id}`}
          className="v3-btn v3-btn-primary v3-btn-sm text-xs shadow-xs"
        >
          <span>เปิดจัดการแผน</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function V3HubPage() {
  const [plans, setPlans] = useState<V3LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchPlans = () => {
    setLoading(true);
    fetch('/api/plan/v3')
      .then(r => r.json())
      .then(res => {
        if (res.success) setPlans(res.data || []);
        else setError(res.error || 'ไม่สามารถโหลดข้อมูลได้');
      })
      .catch(() => setError('เกิดข้อผิดพลาดในการเชื่อมต่อ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (selectedSubject && p.subject_key !== selectedSubject) return false;
      if (selectedStatus && p.status !== selectedStatus) return false;
      if (keyword.trim()) {
        const q = keyword.toLowerCase().trim();
        const matchesTopic = (p.topic || '').toLowerCase().includes(q);
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesUnit = (p.unit_reference || '').toLowerCase().includes(q);
        const matchesCourse = (p.course_name || '').toLowerCase().includes(q);
        if (!matchesTopic && !matchesTitle && !matchesUnit && !matchesCourse) return false;
      }
      return true;
    });
  }, [plans, selectedSubject, selectedStatus, keyword]);

  // Counts
  const totalCount = plans.length;
  const draftCount = plans.filter(p => p.status === 'DRAFT' || p.status === 'BLUEPRINT_READY').length;
  const readyCount = plans.filter(p => p.status === 'REVIEWED' || p.status === 'FINAL').length;
  const taughtCount = plans.filter(p => p.status === 'TAUGHT' || p.status === 'REFLECTED').length;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 font-sans">
      {/* ─── Hero Header ─── */}
      <section className="bg-white border-b border-slate-200/80 pt-8 pb-7">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>PA-Ready Teaching Package Builder V3</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                คลังแผนการจัดการเรียนรู้
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                สร้าง ตรวจสอบคุณภาพ และจัดเตรียมเอกสารแผนการสอนตามแนวทาง ว.PA (ว9/2564) อย่างครบวงจร
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchPlans}
                disabled={loading}
                className="v3-btn v3-btn-secondary text-xs"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
              <Link href="/plan/v3/new" className="v3-btn v3-btn-primary shadow-md">
                <Plus className="w-4 h-4" />
                <span>สร้างแผนการสอนใหม่</span>
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 leading-none">{totalCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">แผนทั้งหมด</div>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 leading-none">{draftCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">กำลังจัดทำ (ร่าง)</div>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 leading-none">{readyCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">พร้อมใช้งาน / สมบูรณ์</div>
              </div>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100/70 text-purple-700 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 leading-none">{taughtCount}</div>
                <div className="text-xs text-slate-500 mt-0.5">สอนแล้ว / สะท้อนผล</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Search & Filters ─── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อแผน, หัวข้อ, หรือหน่วยการเรียนรู้..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
            >
              <option value="">ทุกกลุ่มสาระ</option>
              <option value="ENGLISH">ภาษาต่างประเทศ (อังกฤษ)</option>
              <option value="MATHEMATICS">คณิตศาสตร์</option>
              <option value="SCIENCE">วิทยาศาสตร์และเทคโนโลยี</option>
              <option value="THAI">ภาษาไทย</option>
              <option value="SOCIAL">สังคมศึกษา ศาสนา และวัฒนธรรม</option>
              <option value="HEALTH">สุขศึกษาและพลศึกษา</option>
              <option value="ART">ศิลปะ</option>
              <option value="CAREER">การงานอาชีพ</option>
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white cursor-pointer"
            >
              <option value="">ทุกสถานะ</option>
              <option value="DRAFT">ร่างแผน (Draft)</option>
              <option value="BLUEPRINT_READY">โครงสร้างพร้อม</option>
              <option value="REVIEWED">ผ่านการตรวจคุณภาพ</option>
              <option value="FINAL">แผนสมบูรณ์ (Final)</option>
              <option value="TAUGHT">สอนแล้ว (Taught)</option>
              <option value="REFLECTED">สะท้อนผลแล้ว</option>
            </select>

            {(keyword || selectedSubject || selectedStatus) && (
              <button
                type="button"
                onClick={() => { setKeyword(''); setSelectedSubject(''); setSelectedStatus(''); }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 transition"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>

        {/* ─── Main Grid Content ─── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong>ไม่สามารถโหลดข้อมูลได้:</strong> {error}
            </div>
          </div>
        )}

        {!loading && !error && plans.length === 0 && <EmptyState />}

        {!loading && !error && plans.length > 0 && filteredPlans.length === 0 && (
          <div className="text-center py-12 bg-white border border-slate-200/80 rounded-2xl p-6">
            <p className="text-sm font-semibold text-slate-700">ไม่พบแผนการสอนที่ตรงกับเงื่อนไขการค้นหา</p>
            <button
              onClick={() => { setKeyword(''); setSelectedSubject(''); setSelectedStatus(''); }}
              className="v3-btn v3-btn-secondary text-xs mt-3"
            >
              รีเซ็ตตัวกรองทั้งหมด
            </button>
          </div>
        )}

        {!loading && !error && filteredPlans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
