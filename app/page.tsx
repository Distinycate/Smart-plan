'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, FileEdit, Plus, Search, Filter, Sparkles,
  CheckCircle2, Clock, Download, Eye, Archive, RefreshCw,
  GraduationCap, BarChart3, FileDown, Printer, PenLine, 
  Calendar, Layers, BookOpen, Zap, TrendingUp, Star
} from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [plansRes, initRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/initial-data')
      ]);
      const plansJson = await plansRes.json();
      const initJson = await initRes.json();
      if (plansJson.success) setPlans(plansJson.data || []);
      if (initJson.success) setInitialData(initJson.data);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredPlans = plans.filter(p => {
    if (filterGrade && p.gradeLevel !== filterGrade) return false;
    if (filterSubject && p.subjectName !== filterSubject) return false;
    if (filterSemester && String(p.semester) !== filterSemester) return false;
    if (filterStatus && p.planStatus !== filterStatus) return false;
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase();
      return (
        String(p.lessonTopic || '').toLowerCase().includes(kw) ||
        String(p.unitName || '').toLowerCase().includes(kw) ||
        String(p.subjectCode || '').toLowerCase().includes(kw)
      );
    }
    return true;
  });

  const handleExportWord = (planId: string) => window.open(`/api/plans/${planId}/export/word`, '_blank');
  const handleExportPdf = async (planId: string) => {
    try {
      const res = await fetch(`/api/plans/${planId}/export/pdf`, { method: 'POST' });
      const json = await res.json();
      if (json.success) window.open(json.pdfUrl, '_blank');
      else alert('เกิดข้อผิดพลาด: ' + json.error);
    } catch (err: any) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };
  const handleArchivePlan = async (planId: string, topic: string) => {
    if (!window.confirm(`เก็บถาวรแผนการสอน "${topic || 'ไม่มีชื่อ'}"?\nแผนนี้จะถูกซ่อนจากหน้ารายการ แต่ยังเก็บข้อมูลและประวัติสำรองไว้ในระบบ`)) return;
    try {
      const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) loadData(true);
      else alert('เกิดข้อผิดพลาด: ' + json.error);
    } catch (err: any) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };

  const totalPlans = plans.length;
  const draftPlans = plans.filter(p => p.planStatus === 'draft').length;
  const completedPlans = plans.filter(p => p.planStatus === 'complete').length;
  const successRate = totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0;

  const gradeLevels: any[] = initialData?.subjects 
    ? Array.from(new Set(initialData.subjects.map((s: any) => s.gradeLevel))) : [];
  const subjectNames: any[] = initialData?.subjects 
    ? Array.from(new Set(initialData.subjects.map((s: any) => s.subjectName))) : [];

  const hasFilter = filterGrade || filterSubject || filterSemester || filterKeyword || filterStatus;

  const formatDate = (d: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); }
    catch { return '—'; }
  };

  return (
    <div className="page">

      {/* ══════════════════════ HERO ══════════════════════ */}
      <div className="hero-wrap">
        <div className="hero-content">
          <div className="hero-text">
            <div className="home-hero-badge">
              <Sparkles size={12} />
              <span>ขับเคลื่อนด้วย Gemini 2.5 Flash AI</span>
            </div>
            <h2 className="hero-title">
              สร้างแผนการสอน<br />
              <span className="hero-accent">อัจฉริยะ</span> ใน&nbsp;3&nbsp;นาที
            </h2>
            <p className="hero-desc">
              วิเคราะห์มาตรฐานตัวชี้วัด KPA ครบ 19 ฟิลด์อัตโนมัติ<br/>
              ส่งออก Word · PDF ได้ทันที สำรองข้อมูลอัตโนมัติ
            </p>
            <div className="hero-pills">
              <span className="h-pill">✅ มาตรฐานการเรียนรู้</span>
              <span className="h-pill">✅ ตัวชี้วัด K/P/A</span>
              <span className="h-pill">✅ Rubric 5 ระดับ</span>
              <span className="h-pill">✅ Active Learning</span>
            </div>
            <div className="home-hero-actions">
              <button className="btn btn-hero" onClick={() => router.push('/plan/new')}>
                <Plus size={15} /> สร้างแผนการสอนใหม่
              </button>
              <button className="btn btn-hero-outline" onClick={() => loadData(true)} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
                {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช'}
              </button>
            </div>
          </div>
          <div className="hero-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-illustration.png" alt="illustration" className="hero-img" />
          </div>
        </div>

        {/* Floating mini-stats inside hero */}
        <div className="hero-ministats">
          <div className="hero-ministat">
            <Layers size={16} className="ms-icon blue-i" />
            <strong>{totalPlans}</strong>
            <span>แผนทั้งหมด</span>
          </div>
          <div className="hero-ministat-divider" />
          <div className="hero-ministat">
            <CheckCircle2 size={16} className="ms-icon green-i" />
            <strong>{completedPlans}</strong>
            <span>สำเร็จแล้ว</span>
          </div>
          <div className="hero-ministat-divider" />
          <div className="hero-ministat">
            <Clock size={16} className="ms-icon amber-i" />
            <strong>{draftPlans}</strong>
            <span>ยังไม่เสร็จ</span>
          </div>
          <div className="hero-ministat-divider" />
          <div className="hero-ministat">
            <TrendingUp size={16} className="ms-icon purple-i" />
            <strong>{successRate}%</strong>
            <span>ความสำเร็จ</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════ STAT CARDS ══════════════════════ */}
      <div className="stat-grid-4">
        <div className="scard scard-blue">
          <div className="scard-left">
            <div className="scard-num">{totalPlans}</div>
            <div className="scard-label">แผนการสอนทั้งหมด</div>
            <div className="scard-sub">ในระบบทั้งหมด</div>
          </div>
          <div className="scard-icon"><Layers size={32} /></div>
        </div>
        <div className="scard scard-green">
          <div className="scard-left">
            <div className="scard-num">{completedPlans}</div>
            <div className="scard-label">แผนที่สมบูรณ์</div>
            <div className="scard-sub">พร้อมส่งออก Word/PDF</div>
          </div>
          <div className="scard-icon"><CheckCircle2 size={32} /></div>
        </div>
        <div className="scard scard-amber">
          <div className="scard-left">
            <div className="scard-num">{draftPlans}</div>
            <div className="scard-label">ร่างแผนค้างอยู่</div>
            <div className="scard-sub">รอการแก้ไขให้สมบูรณ์</div>
          </div>
          <div className="scard-icon"><Clock size={32} /></div>
        </div>
        <div className="scard scard-violet">
          <div className="scard-left">
            <div className="scard-num">{successRate}%</div>
            <div className="scard-label">อัตราความสำเร็จ</div>
            <div className="scard-sub">แผนสมบูรณ์ / ทั้งหมด</div>
          </div>
          <div className="scard-icon"><BarChart3 size={32} /></div>
        </div>
      </div>

      {/* ══════════════════════ FILTER ══════════════════════ */}
      <div className="card">
        <h3><Filter size={15} /> ค้นหาและกรองแผนการสอน</h3>
        <div className="filter-search-row">
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-gray-400)', pointerEvents: 'none' }} />
            <input
              placeholder="ค้นหา รหัสวิชา / ชื่อหน่วย / หัวเรื่องที่สอน..."
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
              style={{ paddingLeft: 38 }}
            />
          </div>
        </div>
        <div className="g3" style={{ marginTop: 12 }}>
          <label className="field">
            ระดับชั้น
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {gradeLevels.map((g: any) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="field">
            รายวิชา
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {subjectNames.map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div className="g2">
            <label className="field">
              ภาคเรียน
              <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="1">ภาค 1</option>
                <option value="2">ภาค 2</option>
              </select>
            </label>
            <label className="field">
              สถานะ
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="complete">✅ สมบูรณ์</option>
                <option value="draft">📝 ร่างแผน</option>
              </select>
            </label>
          </div>
        </div>
        {hasFilter && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, color: 'var(--c-gray-500)' }}>
              แสดง <strong style={{ color: 'var(--c-primary)' }}>{filteredPlans.length}</strong> / {totalPlans} รายการ
            </span>
            <button
              className="btn btn-danger btn-sm"
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => { setFilterGrade(''); setFilterSubject(''); setFilterSemester(''); setFilterKeyword(''); setFilterStatus(''); }}
            >
              ล้างตัวกรอง ✕
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════ PLAN CARDS GRID ══════════════════════ */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="plans-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} color="var(--c-primary)" />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-gray-900)' }}>
              รายการแผนการจัดการเรียนรู้
            </span>
            <span className="plans-count">{filteredPlans.length}</span>
          </div>
          <button className="btn btn-hero btn-sm" style={{ background: 'var(--c-primary)', color: '#fff' }} onClick={() => router.push('/plan/new')}>
            <Plus size={13} /> สร้างแผนใหม่
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--c-gray-400)' }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 14px', border: '4px solid var(--c-gray-100)', borderTopColor: 'var(--c-primary)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 14 }}>กำลังโหลดข้อมูลแผนการสอน...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ padding: '70px 24px', textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <BookOpen size={36} color="var(--c-gray-300)" strokeWidth={1.2} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: 'var(--c-gray-700)' }}>ยังไม่มีแผนการสอนในระบบ</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--c-gray-400)' }}>กดปุ่มด้านล่างเพื่อสร้างแผนการสอนแรกของคุณ</p>
            <button className="btn btn-primary" onClick={() => router.push('/plan/new')}>
              <Plus size={14} /> สร้างแผนการสอนใหม่
            </button>
          </div>
        ) : (
          <div className="plan-cards-grid">
            {filteredPlans.map((plan, idx) => (
              <div key={plan.planId} className="plan-card" style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}>
                {/* Top bar */}
                <div className="plan-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span className="plan-code">{plan.subjectCode}</span>
                    <span className={`ps-badge ${plan.planStatus}`}>
                      {plan.planStatus === 'complete' ? '✅ สมบูรณ์' : '📝 ร่างแผน'}
                    </span>
                  </div>
                  <span className="plan-grade-badge">{plan.gradeLevel}</span>
                </div>

                {/* Body */}
                <div className="plan-card-body">
                  <div className="plan-subject-name">{plan.subjectName}</div>
                  <div className="plan-topic">{plan.lessonTopic}</div>
                  <div className="plan-unit">
                    <BookOpen size={11} style={{ flexShrink: 0 }} />
                    <span>{plan.unitName || '—'}</span>
                  </div>
                </div>

                {/* Meta row */}
                <div className="plan-meta">
                  <span><Calendar size={11} /> ภาค {plan.semester}/{plan.academicYear}</span>
                  <span><Clock size={11} /> {plan.totalHours} ชม.</span>
                  <span><PenLine size={11} /> {formatDate(plan.updatedAt || plan.createdAt)}</span>
                </div>

                {/* Actions */}
                <div className="plan-actions">
                  <button className="pact-btn pact-preview" onClick={() => window.open(`/plan/${plan.planId}/preview`, '_blank')}>
                    <Eye size={13} /> ดูตัวอย่าง
                  </button>
                  <button className="pact-btn pact-edit" onClick={() => router.push(`/plan/${plan.planId}`)}>
                    <FileEdit size={13} /> แก้ไข
                  </button>
                  <button className="pact-btn pact-word" onClick={() => handleExportWord(plan.planId)}>
                    <FileDown size={13} /> Word
                  </button>
                  <button className="pact-btn pact-pdf" onClick={() => handleExportPdf(plan.planId)}>
                    <Printer size={13} /> PDF
                  </button>
                  <button className="pact-btn pact-archive" onClick={() => handleArchivePlan(plan.planId, plan.lessonTopic)} title="เก็บถาวรแผนการสอน">
                    <Archive size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        /* ── Spin ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes cardIn { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .spin-icon { animation: spin 1s linear infinite; }

        /* ── HERO ── */
        .hero-wrap {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4f46e5 80%, #6d28d9 100%);
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 20px;
          position: relative;
        }
        .hero-wrap::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 70% 20%, rgba(129,140,248,0.25) 0%, transparent 60%);
          pointer-events: none;
        }
        .hero-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 44px 44px 28px;
        }
        .hero-text { flex: 1; color: #fff; }
        .hero-title {
          font-family: var(--font-head);
          font-size: 34px;
          font-weight: 800;
          line-height: 1.22;
          margin: 12px 0 10px;
          letter-spacing: -0.5px;
          color: #fff;
        }
        .hero-accent {
          background: linear-gradient(90deg, #a5b4fc, #f9a8d4, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-desc {
          font-size: 14.5px;
          line-height: 1.7;
          color: rgba(255,255,255,0.78);
          margin: 0 0 18px;
        }
        .hero-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }
        .h-pill {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
          white-space: nowrap;
        }
        .hero-img-wrap {
          flex-shrink: 0;
          width: 220px;
        }
        .hero-img {
          width: 100%;
          height: auto;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          display: block;
        }

        /* Mini stats bar inside hero */
        .hero-ministats {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.08);
          border-top: 1px solid rgba(255,255,255,0.12);
          padding: 14px 44px;
          gap: 0;
          backdrop-filter: blur(4px);
        }
        .hero-ministat {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
        }
        .hero-ministat strong {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          font-family: var(--font-head);
        }
        .hero-ministat span {
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          font-weight: 500;
        }
        .hero-ministat-divider {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .ms-icon { flex-shrink: 0; }
        .blue-i { color: #93c5fd; }
        .green-i { color: #6ee7b7; }
        .amber-i { color: #fcd34d; }
        .purple-i { color: #c4b5fd; }

        /* ── STAT CARDS 4 ── */
        .stat-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        .scard {
          border-radius: 16px;
          padding: 20px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .scard:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.18); }
        .scard-blue   { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
        .scard-green  { background: linear-gradient(135deg, #047857, #10b981); }
        .scard-amber  { background: linear-gradient(135deg, #b45309, #f59e0b); }
        .scard-violet { background: linear-gradient(135deg, #6d28d9, #a78bfa); }
        .scard-num {
          font-size: 36px;
          font-weight: 800;
          font-family: var(--font-head);
          line-height: 1;
          margin-bottom: 4px;
        }
        .scard-label { font-size: 13px; font-weight: 700; opacity: 0.95; }
        .scard-sub { font-size: 11px; opacity: 0.7; margin-top: 3px; }
        .scard-icon { opacity: 0.25; flex-shrink: 0; }

        /* ── Filter search row ── */
        .filter-search-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        /* ── Plans header ── */
        .plans-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px 14px;
          border-bottom: 1px solid var(--c-gray-100);
          background: #fafbff;
        }
        .plans-count {
          background: var(--c-primary-l);
          color: var(--c-primary);
          border-radius: 100px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        /* ── Plan Cards Grid ── */
        .plan-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1px;
          background: var(--c-gray-100);
        }
        .plan-card {
          background: #fff;
          display: flex;
          flex-direction: column;
          animation: cardIn 0.4s ease both;
          transition: background 0.15s;
        }
        .plan-card:hover { background: #fafbff; }

        .plan-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px 10px;
          border-bottom: 1px solid var(--c-gray-100);
          gap: 8px;
        }
        .plan-code {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--c-primary);
          letter-spacing: 0.3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .plan-grade-badge {
          background: var(--c-primary-l);
          color: var(--c-primary);
          border-radius: 8px;
          padding: 3px 9px;
          font-size: 11.5px;
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .plan-card-body {
          padding: 12px 14px 10px;
          flex: 1;
        }
        .plan-subject-name {
          font-size: 11.5px;
          color: var(--c-gray-400);
          margin-bottom: 5px;
          font-weight: 500;
        }
        .plan-topic {
          font-size: 15px;
          font-weight: 700;
          color: var(--c-gray-900);
          line-height: 1.4;
          margin-bottom: 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .plan-unit {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--c-gray-400);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .plan-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          padding: 8px 14px;
          border-top: 1px solid var(--c-gray-100);
          background: var(--c-gray-50);
        }
        .plan-meta span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--c-gray-400);
          font-weight: 500;
        }

        .plan-actions {
          display: flex;
          gap: 6px;
          padding: 10px 12px;
          border-top: 1px solid var(--c-gray-100);
          flex-wrap: wrap;
        }
        .pact-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 7px 6px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
          white-space: nowrap;
        }
        .pact-preview { background: #f3f0ff; color: #6d28d9; }
        .pact-preview:hover { background: #ede9fe; }
        .pact-edit { background: #e0f2fe; color: #0369a1; }
        .pact-edit:hover { background: #bae6fd; }
        .pact-word { background: #dcfce7; color: #15803d; }
        .pact-word:hover { background: #bbf7d0; }
        .pact-pdf { background: #e0e7ff; color: #4338ca; }
        .pact-pdf:hover { background: #c7d2fe; }
        .pact-archive { flex: 0 0 auto; background: #ffedd5; color: #c2410c; padding: 7px 10px; }
        .pact-archive:hover { background: #fed7aa; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hero-content { padding: 32px 24px 20px; }
          .hero-img-wrap { display: none; }
          .hero-title { font-size: 26px; }
          .hero-ministats { padding: 12px 24px; }
          .stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .plan-cards-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .stat-grid-4 { grid-template-columns: 1fr 1fr; gap: 10px; }
          .hero-ministats { flex-wrap: wrap; gap: 12px; padding: 12px 20px; }
          .hero-ministat-divider { display: none; }
          .plan-cards-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
