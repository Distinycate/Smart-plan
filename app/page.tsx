'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  FileEdit, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  Clock,
  BookOpen,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  GraduationCap,
  BarChart3,
  ChevronRight,
  Star,
  Zap,
  FileDown,
  Printer,
  PenLine,
  Calendar,
  Layers
} from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filter States
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  // Filter Logic
  const filteredPlans = plans.filter(p => {
    if (filterGrade && p.gradeLevel !== filterGrade) return false;
    if (filterSubject && p.subjectName !== filterSubject) return false;
    if (filterSemester && String(p.semester) !== filterSemester) return false;
    if (filterYear && String(p.academicYear) !== filterYear) return false;
    if (filterStatus && p.planStatus !== filterStatus) return false;
    
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase();
      const topic = String(p.lessonTopic || '').toLowerCase();
      const unit = String(p.unitName || '').toLowerCase();
      const code = String(p.subjectCode || '').toLowerCase();
      return topic.includes(kw) || unit.includes(kw) || code.includes(kw);
    }
    
    return true;
  });

  // Export Document Helpers
  const handleExportWord = (planId: string) => {
    window.open(`/api/plans/${planId}/export/word`, '_blank');
  };

  const handleExportPdf = async (planId: string) => {
    try {
      const res = await fetch(`/api/plans/${planId}/export/pdf`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        window.open(json.pdfUrl, '_blank');
      } else {
        alert('เกิดข้อผิดพลาด: ' + json.error);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  const handleDeletePlan = async (planId: string, topic: string) => {
    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแผนการสอน "${topic || 'ไม่มีชื่อหัวข้อ'}"? การดำเนินการนี้จะไม่สามารถย้อนกลับได้`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        loadData(true);
      } else {
        alert('เกิดข้อผิดพลาด: ' + json.error);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  // Stats
  const totalPlans = plans.length;
  const draftPlans = plans.filter(p => p.planStatus === 'draft').length;
  const completedPlans = plans.filter(p => p.planStatus === 'complete').length;

  // Extract master lists for filter dropdowns
  const gradeLevels = initialData?.subjects 
    ? Array.from(new Set(initialData.subjects.map((s: any) => s.gradeLevel))) 
    : [];
  const subjectNames = initialData?.subjects 
    ? Array.from(new Set(initialData.subjects.map((s: any) => s.subjectName))) 
    : [];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });
    } catch { return '—'; }
  };

  return (
    <div className="db-page">

      {/* ═══════════════════════════════════════════ HERO ═══ */}
      <div className="db-hero">
        <div className="db-hero-bg" />
        <div className="db-hero-inner">
          <div className="db-hero-left">
            <div className="db-hero-badge">
              <Sparkles size={13} />
              <span>ขับเคลื่อนด้วย Gemini 2.5 Flash AI</span>
            </div>
            <h1 className="db-hero-title">
              ระบบจัดทำ<br />
              <span className="db-hero-highlight">แผนการเรียนรู้</span>
              <br />อัจฉริยะ
            </h1>
            <p className="db-hero-sub">
              วิเคราะห์มาตรฐาน ตัวชี้วัด จุดประสงค์ KPA ครบ 19 ฟิลด์อัตโนมัติ<br />
              ส่งออก Word และ PDF ได้ทันที พร้อมระบบสำรองข้อมูลอัตโนมัติ
            </p>
            <div className="db-hero-actions">
              <button className="db-btn-primary" onClick={() => router.push('/plan/new')}>
                <Plus size={16} />
                สร้างแผนการสอนใหม่
              </button>
              <button className="db-btn-ghost" onClick={() => loadData(true)} disabled={refreshing}>
                <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
                {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}
              </button>
            </div>
          </div>
          <div className="db-hero-right">
            <div className="db-hero-icon-wrap">
              <GraduationCap size={80} strokeWidth={1.2} className="db-hero-icon" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ STAT CARDS ═══ */}
      <div className="db-stats">
        <div className="db-stat-card blue">
          <div className="db-stat-icon">
            <Layers size={22} />
          </div>
          <div className="db-stat-body">
            <div className="db-stat-num">{totalPlans}</div>
            <div className="db-stat-label">แผนการสอนทั้งหมด</div>
          </div>
          <div className="db-stat-bg-icon"><Layers size={60} /></div>
        </div>
        <div className="db-stat-card green">
          <div className="db-stat-icon">
            <CheckCircle2 size={22} />
          </div>
          <div className="db-stat-body">
            <div className="db-stat-num">{completedPlans}</div>
            <div className="db-stat-label">แผนที่สมบูรณ์แล้ว</div>
          </div>
          <div className="db-stat-bg-icon"><CheckCircle2 size={60} /></div>
        </div>
        <div className="db-stat-card amber">
          <div className="db-stat-icon">
            <Clock size={22} />
          </div>
          <div className="db-stat-body">
            <div className="db-stat-num">{draftPlans}</div>
            <div className="db-stat-label">ร่างที่ยังไม่เสร็จ</div>
          </div>
          <div className="db-stat-bg-icon"><Clock size={60} /></div>
        </div>
        <div className="db-stat-card purple">
          <div className="db-stat-icon">
            <Zap size={22} />
          </div>
          <div className="db-stat-body">
            <div className="db-stat-num">{totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0}%</div>
            <div className="db-stat-label">อัตราความสำเร็จ</div>
          </div>
          <div className="db-stat-bg-icon"><BarChart3 size={60} /></div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ FILTER ═══ */}
      <div className="db-section-card">
        <div className="db-section-header">
          <Filter size={16} />
          <span>ค้นหาและคัดกรองแผนการสอน</span>
        </div>

        <div className="db-filter-row">
          <div className="db-filter-search">
            <Search size={15} className="db-filter-icon" />
            <input 
              className="db-filter-input" 
              placeholder="ค้นหา รหัสวิชา / ชื่อหน่วย / หัวเรื่องที่สอน..." 
              value={filterKeyword}
              onChange={e => setFilterKeyword(e.target.value)}
            />
          </div>
          <div className="db-filter-chips">
            <select className="db-sel" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="">ทุกระดับชั้น</option>
              {gradeLevels.map((g: any) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="db-sel" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">ทุกรายวิชา</option>
              {subjectNames.map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="db-sel" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
              <option value="">ทุกภาคเรียน</option>
              <option value="1">ภาคเรียนที่ 1</option>
              <option value="2">ภาคเรียนที่ 2</option>
            </select>
            <select className="db-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">ทุกสถานะ</option>
              <option value="complete">สมบูรณ์</option>
              <option value="draft">ร่างแผน</option>
            </select>
            {(filterGrade || filterSubject || filterSemester || filterKeyword || filterStatus) && (
              <button className="db-clear-btn" onClick={() => { setFilterGrade(''); setFilterSubject(''); setFilterSemester(''); setFilterKeyword(''); setFilterStatus(''); }}>
                ล้างตัวกรอง ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════ PLAN CARDS ═══ */}
      <div className="db-section-card">
        <div className="db-section-header" style={{ borderBottom: 'none', marginBottom: 0 }}>
          <FileText size={16} />
          <span>รายการแผนการจัดการเรียนรู้</span>
          <span className="db-count-badge">{filteredPlans.length} รายการ</span>
        </div>

        {loading ? (
          <div className="db-loading">
            <div className="db-spinner" />
            <span>กำลังโหลดข้อมูลแผนการสอน...</span>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="db-empty">
            <div className="db-empty-icon"><BookOpen size={48} strokeWidth={1} /></div>
            <h3>ยังไม่มีแผนการสอนในระบบ</h3>
            <p>กดปุ่มด้านล่างเพื่อสร้างแผนการสอนแรกของคุณ</p>
            <button className="db-btn-primary" style={{ marginTop: '16px' }} onClick={() => router.push('/plan/new')}>
              <Plus size={15} /> สร้างแผนการสอนใหม่
            </button>
          </div>
        ) : (
          <div className="db-plan-grid">
            {filteredPlans.map((plan, idx) => (
              <div key={plan.planId} className="db-plan-card" style={{ animationDelay: `${idx * 40}ms` }}>
                {/* Card Top Bar */}
                <div className="db-plan-card-top">
                  <div className="db-plan-code-wrap">
                    <span className="db-plan-code">{plan.subjectCode}</span>
                    <span className={`db-plan-status ${plan.planStatus}`}>
                      {plan.planStatus === 'complete' ? <><CheckCircle2 size={11} /> สมบูรณ์</> : <><Clock size={11} /> ร่างแผน</>}
                    </span>
                  </div>
                  <span className="db-plan-grade">{plan.gradeLevel}</span>
                </div>

                {/* Card Content */}
                <div className="db-plan-card-body">
                  <div className="db-plan-subject">{plan.subjectName}</div>
                  <h3 className="db-plan-topic">{plan.lessonTopic}</h3>
                  <div className="db-plan-unit"><BookOpen size={12} /> {plan.unitName || '—'}</div>
                </div>

                {/* Card Meta */}
                <div className="db-plan-meta">
                  <span><Calendar size={12} /> ภาค {plan.semester}/{plan.academicYear}</span>
                  <span><Clock size={12} /> {plan.totalHours} ชั่วโมง</span>
                  <span><PenLine size={12} /> {formatDate(plan.updatedAt || plan.createdAt)}</span>
                </div>

                {/* Card Actions */}
                <div className="db-plan-actions">
                  <button className="db-act-btn preview" onClick={() => window.open(`/plan/${plan.planId}/preview`, '_blank')} title="ดูตัวอย่างแผน">
                    <Eye size={14} /> ดูตัวอย่าง
                  </button>
                  <button className="db-act-btn edit" onClick={() => router.push(`/plan/${plan.planId}`)} title="แก้ไขแผนการสอน">
                    <FileEdit size={14} /> แก้ไข
                  </button>
                  <button className="db-act-btn word" onClick={() => handleExportWord(plan.planId)} title="ดาวน์โหลด Word">
                    <FileDown size={14} /> Word
                  </button>
                  <button className="db-act-btn pdf" onClick={() => handleExportPdf(plan.planId)} title="พิมพ์ PDF">
                    <Printer size={14} /> PDF
                  </button>
                  <button className="db-act-btn del" onClick={() => handleDeletePlan(plan.planId, plan.lessonTopic)} title="ลบแผนการสอน">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .spin { animation: spin 1s linear infinite; }

        .db-page {
          min-height: 100vh;
          background: #f0f2f8;
          font-family: 'Sarabun', 'Inter', sans-serif;
        }

        /* ── HERO ── */
        .db-hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 75%, #6d28d9 100%);
          padding: 56px 48px 60px;
          color: #fff;
        }
        .db-hero-bg {
          position: absolute; inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .db-hero-inner {
          position: relative;
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
        }
        .db-hero-left { flex: 1; }
        .db-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
          margin-bottom: 18px;
          backdrop-filter: blur(8px);
        }
        .db-hero-title {
          font-size: 38px;
          font-weight: 800;
          line-height: 1.2;
          margin: 0 0 14px;
          letter-spacing: -0.5px;
        }
        .db-hero-highlight {
          background: linear-gradient(90deg, #a5b4fc, #f9a8d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .db-hero-sub {
          font-size: 15px;
          opacity: 0.85;
          line-height: 1.65;
          margin: 0 0 28px;
          max-width: 520px;
        }
        .db-hero-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .db-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }
        .db-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
        }
        .db-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255,255,255,0.12);
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .db-btn-ghost:hover { background: rgba(255,255,255,0.2); }
        .db-btn-ghost:disabled { opacity: 0.6; cursor: not-allowed; }
        .db-hero-right {
          flex-shrink: 0;
        }
        .db-hero-icon-wrap {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(12px);
        }
        .db-hero-icon { color: rgba(255,255,255,0.85); }

        /* ── STATS ── */
        .db-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 24px 48px;
          max-width: 1196px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .db-stat-card {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          padding: 22px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          transition: transform 0.2s;
        }
        .db-stat-card:hover { transform: translateY(-3px); }
        .db-stat-card.blue  { background: linear-gradient(135deg, #2563eb, #3b82f6); }
        .db-stat-card.green { background: linear-gradient(135deg, #059669, #10b981); }
        .db-stat-card.amber { background: linear-gradient(135deg, #d97706, #f59e0b); }
        .db-stat-card.purple{ background: linear-gradient(135deg, #7c3aed, #a78bfa); }
        .db-stat-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .db-stat-body { flex: 1; }
        .db-stat-num {
          font-size: 30px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 4px;
        }
        .db-stat-label {
          font-size: 12.5px;
          opacity: 0.9;
          font-weight: 500;
        }
        .db-stat-bg-icon {
          position: absolute;
          right: -8px;
          bottom: -8px;
          opacity: 0.12;
        }

        /* ── FILTER / SECTION CARD ── */
        .db-section-card {
          max-width: 1100px;
          margin: 0 auto 20px;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
          overflow: hidden;
        }
        .db-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 18px 24px 14px;
          border-bottom: 1px solid #f3f4f6;
          font-weight: 700;
          font-size: 15px;
          color: #1f2937;
        }
        .db-count-badge {
          margin-left: auto;
          background: #ede9fe;
          color: #6d28d9;
          border-radius: 100px;
          padding: 3px 12px;
          font-size: 12px;
          font-weight: 700;
        }
        .db-filter-row {
          padding: 16px 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .db-filter-search {
          position: relative;
        }
        .db-filter-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }
        .db-filter-input {
          width: 100%;
          box-sizing: border-box;
          padding: 11px 14px 11px 40px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s;
        }
        .db-filter-input:focus { border-color: #6366f1; }
        .db-filter-chips {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .db-sel {
          padding: 9px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13.5px;
          font-family: inherit;
          background: #fff;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s;
          min-width: 130px;
        }
        .db-sel:focus { border-color: #6366f1; }
        .db-clear-btn {
          padding: 9px 16px;
          background: #fee2e2;
          color: #dc2626;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .db-clear-btn:hover { background: #fecaca; }

        /* ── LOADING / EMPTY ── */
        .db-loading {
          padding: 64px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          color: #6b7280;
          font-size: 14px;
        }
        .db-spinner {
          width: 34px;
          height: 34px;
          border: 3.5px solid rgba(99,102,241,0.15);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .db-empty {
          padding: 64px 24px;
          text-align: center;
          color: #9ca3af;
        }
        .db-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
        }
        .db-empty h3 { color: #374151; margin: 0 0 8px; font-size: 17px; }
        .db-empty p  { margin: 0; font-size: 13.5px; }

        /* ── PLAN GRID ── */
        .db-plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          padding: 20px 24px 24px;
        }
        .db-plan-card {
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 14px;
          padding: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.2s;
          animation: cardIn 0.35s ease both;
        }
        .db-plan-card:hover {
          border-color: #a5b4fc;
          box-shadow: 0 8px 30px rgba(99,102,241,0.15);
          transform: translateY(-3px);
        }
        .db-plan-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px 10px;
          background: linear-gradient(135deg, #f8faff, #eef2ff);
          border-bottom: 1px solid #e9edf8;
        }
        .db-plan-code-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .db-plan-code {
          font-size: 13px;
          font-weight: 800;
          color: #4f46e5;
          letter-spacing: 0.3px;
        }
        .db-plan-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 9px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
        }
        .db-plan-status.complete {
          background: #d1fae5;
          color: #065f46;
        }
        .db-plan-status.draft {
          background: #fef3c7;
          color: #92400e;
        }
        .db-plan-grade {
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 700;
        }
        .db-plan-card-body {
          padding: 16px 16px 12px;
          flex: 1;
        }
        .db-plan-subject {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .db-plan-topic {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 8px;
          line-height: 1.4;
        }
        .db-plan-unit {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #9ca3af;
        }
        .db-plan-meta {
          display: flex;
          gap: 14px;
          padding: 10px 16px;
          border-top: 1px solid #f3f4f6;
          background: #fafafa;
        }
        .db-plan-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11.5px;
          color: #9ca3af;
          font-weight: 500;
        }
        .db-plan-actions {
          display: flex;
          gap: 6px;
          padding: 10px 12px;
          border-top: 1px solid #f3f4f6;
          flex-wrap: wrap;
        }
        .db-act-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 8px 6px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          min-width: 0;
        }
        .db-act-btn.preview {
          background: #ede9fe;
          color: #6d28d9;
        }
        .db-act-btn.preview:hover { background: #ddd6fe; }
        .db-act-btn.edit {
          background: #e0f2fe;
          color: #0369a1;
        }
        .db-act-btn.edit:hover { background: #bae6fd; }
        .db-act-btn.word {
          background: #d1fae5;
          color: #065f46;
        }
        .db-act-btn.word:hover { background: #a7f3d0; }
        .db-act-btn.pdf {
          background: #e0e7ff;
          color: #3730a3;
        }
        .db-act-btn.pdf:hover { background: #c7d2fe; }
        .db-act-btn.del {
          flex: 0 0 auto;
          background: #fee2e2;
          color: #dc2626;
          padding: 8px 10px;
        }
        .db-act-btn.del:hover { background: #fecaca; }

        @media (max-width: 900px) {
          .db-hero { padding: 40px 24px 48px; }
          .db-hero-right { display: none; }
          .db-hero-title { font-size: 28px; }
          .db-stats { grid-template-columns: repeat(2, 1fr); padding: 16px 24px; }
          .db-section-card { margin: 0 16px 16px; }
          .db-plan-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 580px) {
          .db-stats { grid-template-columns: 1fr 1fr; padding: 12px 16px; }
          .db-filter-chips { flex-direction: column; }
          .db-sel { min-width: unset; width: 100%; }
        }
      `}</style>
    </div>
  );
}
