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
  FileUp, 
  ArrowRight,
  RefreshCw
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

  return (
    <div className="page">
      {/* ─── HOME PAGE HERO ─── */}
      <div className="home-hero">
        <div className="home-hero-badge">
          <Sparkles size={13} /> พลัง AI อัจฉริยะ Gemini 2.5 Flash
        </div>
        <h2>ระบบช่วยจัดทำแผนการจัดการเรียนรู้กึ่งอัตโนมัติ</h2>
        <p>
          ระบบจัดเตรียมแผนงานวิชาการสำหรับครูผู้สอนเพื่อความสะดวกรวดเร็วในการทำงาน 
          วิเคราะห์มาตรฐาน ตัวชี้วัด และจุดประสงค์การเรียนรู้ครบ 19 ฟิลด์ผ่านระบบฐานข้อมูล Supabase 
          พร้อมส่งออกไฟล์มาตรฐาน Microsoft Word และ PDF ทันที
        </p>
        <div className="home-hero-actions">
          <button className="btn btn-hero" onClick={() => router.push('/plan/new')}>
            <Plus size={16} /> สร้างแผนการจัดการเรียนรู้ใหม่
          </button>
          <button className="btn btn-hero-outline" onClick={() => loadData(true)}>
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> 
            {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}
          </button>
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FileText color="#3b82f6" />
          </div>
          <div className="stat-info">
            <p>แผนการสอนทั้งหมด</p>
            <strong>{totalPlans} แผน</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FileEdit color="#8b5cf6" />
          </div>
          <div className="stat-info">
            <p>ร่างแผนที่ยังไม่เสร็จ</p>
            <strong>{draftPlans} ร่าง</strong>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <CheckCircle2 color="#22c55e" />
          </div>
          <div className="stat-info">
            <p>แผนการสอนที่สมบูรณ์</p>
            <strong>{completedPlans} แผน</strong>
          </div>
        </div>
      </div>

      {/* ─── FILTER CARD ─── */}
      <div className="card">
        <h3>
          <Filter size={16} color="#4f46e5" /> ค้นหาและคัดกรองแผนการสอน
        </h3>
        <div className="g3" style={{ gap: '12px' }}>
          <label className="field">
            ระดับชั้น
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {gradeLevels.map((g: any) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="field">
            รายวิชา
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {subjectNames.map((s: any) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="g2">
            <label className="field">
              ภาคเรียน
              <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                <option value="">ทั้งหมด</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>
            <label className="field">
              ปีการศึกษา
              <input 
                placeholder="เช่น 2569" 
                value={filterYear} 
                onChange={e => setFilterYear(e.target.value)} 
              />
            </label>
          </div>
        </div>
        <div style={{ marginTop: '12px', position: 'relative' }}>
          <label className="field">
            คำค้นหา
            <div style={{ position: 'relative' }}>
              <input 
                placeholder="พิมพ์ รหัสวิชา / ชื่อหน่วย / หัวเรื่องที่สอน..." 
                value={filterKeyword}
                onChange={e => setFilterKeyword(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Search 
                size={16} 
                color="#9ca3af" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
            </div>
          </label>
        </div>
      </div>

      {/* ─── PLANS TABLE CARD ─── */}
      <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: '0' }}>
            <FileText size={16} color="#4f46e5" /> รายการแผนการจัดการเรียนรู้ ({filteredPlans.length})
          </h3>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            แสดงข้อมูลล่าสุดตามประวัติการแก้ไข
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <span>กำลังโหลดข้อมูลแผนการสอน...</span>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
            <FileText size={44} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p style={{ margin: '0', fontSize: '14px' }}>ไม่พบรายการแผนการจัดการเรียนรู้ตามตัวเลือกนี้</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>รหัส / รายวิชา</th>
                  <th>หน่วย / เรื่องที่สอน</th>
                  <th>ระดับชั้น</th>
                  <th>ภาค/ปีการศึกษา</th>
                  <th>เวลา</th>
                  <th>สถานะ</th>
                  <th style={{ textAlign: 'right' }}>เครื่องมือจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map(plan => (
                  <tr key={plan.planId}>
                    <td>
                      <strong style={{ color: '#4f46e5' }}>{plan.subjectCode}</strong>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{plan.subjectName}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{plan.lessonTopic}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{plan.unitName}</div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{plan.gradeLevel}</span>
                    </td>
                    <td style={{ fontSize: '12.5px' }}>
                      {plan.semester}/{plan.academicYear}
                    </td>
                    <td>
                      <strong>{plan.totalHours}</strong> ชม.
                    </td>
                    <td>
                      <span className={`ps-badge ${plan.planStatus}`}>
                        {plan.planStatus === 'complete' ? 'สมบูรณ์' : 'ร่างแผน'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => window.open(`/plan/${plan.planId}/preview`, '_blank')}
                          title="ดูตัวอย่างแผน"
                          style={{ borderColor: 'var(--c-primary)', color: 'var(--c-primary)' }}
                        >
                          👁️ ดูตัวอย่าง
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => router.push(`/plan/${plan.planId}`)}
                          title="แก้ไขแผนการสอน"
                        >
                          <FileEdit size={13} /> แก้ไข
                        </button>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleExportWord(plan.planId)}
                          title="ดาวน์โหลด Word (.doc)"
                        >
                          📝 Word
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleExportPdf(plan.planId)}
                          title="พิมพ์เอกสาร / PDF"
                        >
                          🖨️ PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
