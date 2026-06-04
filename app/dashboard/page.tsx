'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, FileEdit, Plus, Search, Filter, Sparkles,
  CheckCircle2, Clock, Download, Eye, Archive, RefreshCw,
  GraduationCap, BarChart3, FileDown, Printer, PenLine, 
  Calendar, Layers, BookOpen, Zap, TrendingUp, Star,
  Folder, FolderOpen, ChevronRight, ChevronDown
} from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'ai_fixed'>('active');
  
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const loadData = async (isRefresh = false, tab = activeTab) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let qs = '';
      if (tab === 'archived') qs = '?status=archived';
      if (tab === 'ai_fixed') qs = '?status=ai_fixed';
      const [plansRes, initRes] = await Promise.all([
        fetch(`/api/plans${qs}`),
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

  useEffect(() => { loadData(false, activeTab); }, [activeTab]);

  const filteredPlans = plans.filter(p => {
    const isAIFixed = p.planId && p.planId.startsWith('ai-fixed-');
    if (activeTab === 'active' && isAIFixed) return false;
    if (activeTab === 'ai_fixed' && !isAIFixed) return false;

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

  const groupedPlans = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, any[]>>> = {};
    filteredPlans.forEach(plan => {
      const year = plan.academicYear ? `ปีการศึกษา ${plan.academicYear}` : 'ไม่ระบุปีการศึกษา';
      const grade = plan.gradeLevel || 'ไม่ระบุระดับชั้น';
      const subject = plan.subjectName || 'ไม่ระบุรายวิชา';

      if (!groups[year]) groups[year] = {};
      if (!groups[year][grade]) groups[year][grade] = {};
      if (!groups[year][grade][subject]) groups[year][grade][subject] = [];
      groups[year][grade][subject].push(plan);
    });
    return groups;
  }, [filteredPlans]);

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
      if (json.success) loadData(true, activeTab);
      else alert('เกิดข้อผิดพลาด: ' + json.error);
    } catch (err: any) { alert('เกิดข้อผิดพลาด: ' + err.message); }
  };
  const handleRestorePlan = async (planId: string, topic: string) => {
    if (!window.confirm(`กู้คืนแผนการสอน "${topic || 'ไม่มีชื่อ'}"?\nแผนนี้จะกลับไปอยู่ที่หน้ารายการหลัก`)) return;
    try {
      const res = await fetch(`/api/plans/${planId}/restore`, { method: 'PATCH' });
      const json = await res.json();
      if (json.success) loadData(true, activeTab);
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

  const getStatusBadge = (status: string) => {
    if (status === 'complete') return '✅ สมบูรณ์';
    if (status === 'archived') return '🗄️ เก็บถาวร';
    if (status === 'ai_fixed') return '✨ แก้ไขโดย AI';
    return '📝 ร่างแผน';
  };

  const emptyStateTitle = activeTab === 'archived'
    ? 'ยังไม่มีแผนการสอนในที่เก็บถาวร'
    : activeTab === 'ai_fixed'
    ? 'ยังไม่มีแผนที่ถูกแก้ไขโดย AI'
    : 'ยังไม่มีแผนการสอนในระบบ';

  const emptyStateDescription = activeTab === 'archived'
    ? 'เมื่อเก็บถาวรแผนการสอน แผนจะปรากฏที่นี่ และสามารถกู้คืนกลับมาใช้งานได้'
    : activeTab === 'ai_fixed'
    ? 'เมื่อ AI ทำการแก้ไขจุดบกพร่องในแผน แผนฉบับใหม่จะมาปรากฏที่นี่'
    : 'กดปุ่มด้านล่างเพื่อสร้างแผนการสอนแรกของคุณ';

  return (
    <div className="page">

      {/* ══════════════════════ HERO ══════════════════════ */}
      <div className="hero-wrap">
        <div className="hero-content">
          <div className="hero-text">
            <div className="home-hero-badge">
              <Sparkles size={12} />
              <span>Smart Lesson plan By Kruteh</span>
            </div>
            <h2 className="hero-title">
              สร้างแผนการสอน<br />
              <span className="hero-accent">อัจฉริยะ</span> ใน&nbsp;3&nbsp;นาที
            </h2>
            <p className="hero-desc">
              เปลี่ยนความยุ่งยากให้เป็นเรื่องง่าย สร้างแผนการสอนที่สมบูรณ์แบบ<br/>
              พร้อมออกแบบกิจกรรมล้ำสมัย และส่งออก Word · PDF ได้ทันที
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
              <button className="btn btn-hero-outline" style={{ borderColor: '#818cf8', color: '#4f46e5', backgroundColor: '#e0e7ff' }} onClick={() => router.push('/evaluator')}>
                <Zap size={15} /> ประเมินและพัฒนาแผน
              </button>
              <button className="btn btn-hero-outline" onClick={() => loadData(true)} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
                {refreshing ? 'กำลังรีเฟรช...' : 'รีเฟรช'}
              </button>
            </div>
          </div>
          <div className="hero-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/magical_book.png" alt="illustration" className="hero-img" />
          </div>
        </div>

        {/* Floating mini-stats inside hero */}
        <div className="hero-ministats">
          <div className="hero-ministat">
            <Layers size={16} className="ms-icon rose-i" />
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
            <TrendingUp size={16} className="ms-icon rose-i" />
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
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ background: 'var(--c-gray-100)', padding: 4, borderRadius: 8, display: 'flex', gap: 4 }}>
              <button 
                className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : ''}`}
                style={{ background: activeTab === 'active' ? '#fff' : 'transparent', color: activeTab === 'active' ? 'var(--c-primary)' : 'var(--c-gray-500)', boxShadow: activeTab === 'active' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', padding: '4px 10px', fontSize: 12.5 }}
                onClick={() => setActiveTab('active')}
              >
                แผนที่ใช้งาน
              </button>
              <button 
                className={`btn btn-sm ${activeTab === 'ai_fixed' ? 'btn-primary' : ''}`}
                style={{ background: activeTab === 'ai_fixed' ? '#fff' : 'transparent', color: activeTab === 'ai_fixed' ? '#6366f1' : 'var(--c-gray-500)', boxShadow: activeTab === 'ai_fixed' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', padding: '4px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setActiveTab('ai_fixed')}
              >
                <Sparkles size={12} /> AI ปรับปรุง
              </button>
              <button 
                className={`btn btn-sm ${activeTab === 'archived' ? 'btn-primary' : ''}`}
                style={{ background: activeTab === 'archived' ? '#fff' : 'transparent', color: activeTab === 'archived' ? 'var(--c-primary)' : 'var(--c-gray-500)', boxShadow: activeTab === 'archived' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', padding: '4px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setActiveTab('archived')}
              >
                <Archive size={12} /> ที่เก็บถาวร
              </button>
              <button 
                className={`btn btn-sm ${activeTab === 'ai_fixed' ? 'btn-primary' : ''}`}
                style={{ background: activeTab === 'ai_fixed' ? '#fff' : 'transparent', color: activeTab === 'ai_fixed' ? 'var(--c-primary)' : 'var(--c-gray-500)', boxShadow: activeTab === 'ai_fixed' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', border: 'none', padding: '4px 10px', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setActiveTab('ai_fixed')}
              >
                <Sparkles size={12} /> แผนที่แก้ไขโดย AI
              </button>
            </div>
            <button className="btn btn-hero btn-sm" style={{ background: 'var(--c-primary)', color: '#fff', height: '100%' }} onClick={() => router.push('/plan/new')}>
              <Plus size={13} /> สร้างแผนใหม่
            </button>
          </div>
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
            <h3 style={{ margin: '0 0 8px', fontSize: 17, color: 'var(--c-gray-700)' }}>{emptyStateTitle}</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--c-gray-400)' }}>{emptyStateDescription}</p>
            {activeTab === 'active' && (
              <button className="btn btn-primary" onClick={() => router.push('/plan/new')}>
                <Plus size={14} /> สร้างแผนการสอนใหม่
              </button>
            )}
            {activeTab === 'ai_fixed' && (
              <button className="btn btn-primary" style={{ background: '#ec4899', borderColor: '#ec4899' }} onClick={() => router.push('/evaluator')}>
                <Zap size={14} /> ไปที่ระบบตรวจแผน AI
              </button>
            )}
          </div>
        ) : (
          <div className="folders-container p-2">
            {Object.keys(groupedPlans).sort((a,b) => b.localeCompare(a)).map(year => (
              <div key={year} className="folder-level-1">
                <div 
                  className="folder-header bg-slate-50 hover:bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-center gap-3 cursor-pointer mb-3 transition-colors shadow-sm"
                  onClick={() => toggleFolder(year)}
                >
                  {expandedFolders.has(year) ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                  {expandedFolders.has(year) ? <FolderOpen size={24} className="text-pink-400 fill-pink-100" /> : <Folder size={24} className="text-pink-400 fill-pink-100" />}
                  <h3 className="font-bold text-lg text-slate-800 m-0">{year}</h3>
                  <span className="ml-auto bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">
                    {Object.values(groupedPlans[year]).reduce((acc, gradeObj) => acc + Object.values(gradeObj).reduce((acc2, subjArr) => acc2 + subjArr.length, 0), 0)} แผน
                  </span>
                </div>

                {expandedFolders.has(year) && (
                  <div className="pl-6 md:pl-10 space-y-4 mb-6 border-l-2 border-slate-100 ml-4">
                    {Object.keys(groupedPlans[year]).sort().map(grade => (
                      <div key={grade} className="folder-level-2 mt-4">
                        <div 
                          className="folder-header flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"
                          onClick={() => toggleFolder(`${year}-${grade}`)}
                        >
                          {expandedFolders.has(`${year}-${grade}`) ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                          {expandedFolders.has(`${year}-${grade}`) ? <FolderOpen size={20} className="text-cyan-500 fill-cyan-50" /> : <Folder size={20} className="text-cyan-500 fill-cyan-50" />}
                          <h4 className="font-bold text-slate-700 m-0">{grade}</h4>
                          <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {Object.values(groupedPlans[year][grade]).reduce((acc, subjArr) => acc + subjArr.length, 0)} แผน
                          </span>
                        </div>

                        {expandedFolders.has(`${year}-${grade}`) && (
                          <div className="pl-6 space-y-3 mt-2 border-l border-slate-100 ml-3">
                            {Object.keys(groupedPlans[year][grade]).sort().map(subject => (
                              <div key={subject} className="folder-level-3">
                                <div 
                                  className="folder-header flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                  onClick={() => toggleFolder(`${year}-${grade}-${subject}`)}
                                >
                                  {expandedFolders.has(`${year}-${grade}-${subject}`) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                  {expandedFolders.has(`${year}-${grade}-${subject}`) ? <FolderOpen size={18} className="text-emerald-500 fill-emerald-50" /> : <Folder size={18} className="text-emerald-500 fill-emerald-50" />}
                                  <h5 className="font-semibold text-slate-600 m-0">{subject}</h5>
                                  <span className="ml-auto text-xs font-medium text-slate-400">
                                    {groupedPlans[year][grade][subject].length} แผน
                                  </span>
                                </div>

                                {expandedFolders.has(`${year}-${grade}-${subject}`) && (
                                  <div className="plan-cards-grid mt-4 mb-8">
                                    {groupedPlans[year][grade][subject].map((plan, idx) => (
                                      <div key={plan.planId} className="plan-card" style={{ animationDelay: `${Math.min(idx * 50, 400)}ms` }}>
                                        {/* Top bar */}
                                        <div className="plan-card-top">
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                            <span className="plan-code">{plan.subjectCode}</span>
                                            <span className={`ps-badge ${plan.planStatus}`}>
                                              {getStatusBadge(plan.planStatus)}
                                            </span>
                                          </div>
                                          <span className="plan-grade-badge">{plan.gradeLevel}</span>
                                        </div>

                                        {/* Body */}
                                        <div className="plan-card-body">
                                          <div className="plan-subject-name">{plan.subjectName}</div>
                                          <div className="plan-topic">{plan.lessonTopic}</div>
                                          {plan.author_email && <div className="text-[10px] text-slate-400 mt-1 font-mono">เจ้าของ: {plan.author_email}</div>}
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
                                          {activeTab !== 'archived' ? (
                                            <>
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
                                            </>
                                          ) : (
                                            <button className="pact-btn pact-word" style={{ background: '#dcfce7', color: '#15803d' }} onClick={() => handleRestorePlan(plan.planId, plan.lessonTopic)}>
                                              <RefreshCw size={13} /> กู้คืนแผนนี้
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
          background: linear-gradient(135deg, #be185d 0%, #db2777 45%, #ec4899 80%, #f43f5e 100%);
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
          margin: 12px 0 12px;
          letter-spacing: -0.8px;
        }
        .hero-accent {
          background: linear-gradient(90deg, #fde68a, #fca5a5, #c4b5fd);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          color: rgba(255,255,255,0.82);
          font-size: 14.5px;
          line-height: 1.75;
          margin: 0 0 18px;
        }
        .home-hero-badge {
          display: inline-flex; align-items:center; gap:6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }
        .hero-pills { display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 20px; }
        .h-pill {
          padding: 6px 11px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          font-weight: 600;
        }
        .home-hero-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .btn-hero {
          background:#fff; color:#db2777;
          box-shadow: 0 14px 30px rgba(0,0,0,0.18);
        }
        .btn-hero-outline {
          background: rgba(255,255,255,0.14);
          color:#fff;
          border:1px solid rgba(255,255,255,0.28);
        }
        .hero-img-wrap { width: 300px; display:flex; justify-content:center; align-items:center; }
        .hero-img {
          width: 260px; max-height: 240px; object-fit: contain;
          mix-blend-mode: multiply;
          filter: contrast(1.05) brightness(1.05);
          animation: floaty 5s ease-in-out infinite;
        }
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }

        .hero-ministats {
          position: relative;
          display:grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          background: rgba(255,255,255,0.12);
          border-top: 1px solid rgba(255,255,255,0.16);
          backdrop-filter: blur(10px);
        }
        .hero-ministat {
          padding: 14px 18px;
          display:flex; align-items:center; gap:10px;
          color:#fff;
        }
        .hero-ministat strong { font-size:20px; font-weight:800; }
        .hero-ministat span { color:rgba(255,255,255,.78); font-size:12.5px; }
        .hero-ministat-divider { width:1px; background:rgba(255,255,255,.16); }
        .ms-icon { padding:5px; border-radius:10px; background:rgba(255,255,255,.16); }

        /* ── Stat cards ── */
        .stat-grid-4 { display:grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .scard {
          border-radius: 18px;
          padding: 18px;
          display:flex; justify-content:space-between; align-items:center;
          box-shadow: var(--shadow-card);
          position: relative; overflow:hidden;
          background:#fff;
        }
        .scard::after { content:''; position:absolute; width:120px; height:120px; border-radius:50%; right:-35px; top:-45px; opacity:.12; }
        .scard-blue::after { background:#2563eb; } .scard-green::after{background:#16a34a;} .scard-amber::after{background:#d97706;} .scard-violet::after{background:#7c3aed;}
        .scard-num { font-size: 28px; font-weight: 800; color: var(--c-gray-900); line-height:1; }
        .scard-label { font-weight: 700; margin-top: 7px; color: var(--c-gray-700); font-size: 13.5px; }
        .scard-sub { color: var(--c-gray-400); font-size: 11.5px; margin-top: 3px; }
        .scard-icon { opacity:.16; }
        .scard-blue .scard-icon{color:#2563eb;} .scard-green .scard-icon{color:#16a34a;} .scard-amber .scard-icon{color:#d97706;} .scard-violet .scard-icon{color:#7c3aed;}

        .filter-search-row { display:flex; gap:12px; }

        /* ── Plans header ── */
        .plans-header {
          display:flex; justify-content:space-between; align-items:center;
          padding: 15px 18px;
          border-bottom: 1px solid var(--c-gray-100);
          background: linear-gradient(180deg, #fff, #fbfdff);
        }
        .plans-count {
          background: var(--c-primary-soft);
          color: var(--c-primary);
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 999px;
          font-weight:700;
        }

        /* ── Plan grid/cards ── */
        .plan-cards-grid {
          padding: 18px;
          display:grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 16px;
        }
        .plan-card {
          border: 1px solid var(--c-gray-100);
          border-radius: 18px;
          background:#fff;
          overflow:hidden;
          box-shadow: 0 10px 28px rgba(15,23,42,.06);
          transition: .22s ease;
          animation: cardIn .42s ease both;
        }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(15,23,42,.11); border-color:#dbeafe; }
        .plan-card-top { display:flex; align-items:center; justify-content:space-between; padding: 13px 14px 9px; }
        .plan-code {
          background:#eef2ff; color:#db2777;
          border-radius: 8px;
          padding: 4px 8px;
          font-weight:800;
          font-size:12px;
          letter-spacing:.2px;
        }
        .ps-badge { font-size:11px; padding:4px 7px; border-radius:999px; font-weight:700; }
        .ps-badge.complete { background:#dcfce7; color:#15803d; }
        .ps-badge.draft { background:#fef3c7; color:#92400e; }
        .ps-badge.ai_fixed { background:#f5f3ff; color:#7c3aed; }
        .ps-badge.archived { background:#e5e7eb; color:#374151; }
        .plan-grade-badge { font-size:11.5px; color:var(--c-gray-500); background:var(--c-gray-50); padding:4px 7px; border-radius:8px; }
        .plan-card-body { padding: 0 14px 12px; min-height: 94px; }
        .plan-subject-name { color: var(--c-gray-500); font-size: 12px; font-weight: 700; margin-bottom: 7px; }
        .plan-topic {
          color: var(--c-gray-900);
          font-weight: 800;
          line-height:1.45;
          font-size: 15px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow:hidden;
        }
        .plan-unit { display:flex; align-items:flex-start; gap:5px; color:var(--c-gray-400); font-size:11.5px; margin-top:8px; line-height:1.35; }
        .plan-meta {
          display:flex; flex-wrap:wrap; gap:8px 10px;
          padding: 10px 14px;
          border-top: 1px solid var(--c-gray-100);
          background: #fbfdff;
          color: var(--c-gray-500);
          font-size: 11.2px;
        }
        .plan-meta span { display:inline-flex; align-items:center; gap:4px; }
        .plan-actions {
          display:grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1px;
          background: var(--c-gray-100);
        }
        .pact-btn {
          border:0; background:#fff;
          padding: 9px 5px;
          font-size:11.5px;
          font-weight:700;
          color:var(--c-gray-600);
          cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:4px;
          transition:.16s;
        }
        .pact-btn:hover { background:#f8fafc; color:var(--c-primary); }
        .pact-preview{color:#2563eb;} .pact-edit{color:#7c3aed;} .pact-word{color:#0891b2;} .pact-pdf{color:#dc2626;} .pact-archive{color:#6b7280;}
        .pact-archive:hover { background:#fee2e2; color:#dc2626; }

        @media (max-width: 900px) {
          .hero-content { flex-direction:column; align-items:flex-start; padding: 32px 24px 24px; }
          .hero-img-wrap { display:none; }
          .hero-ministats { grid-template-columns: repeat(2, 1fr); }
          .stat-grid-4 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .stat-grid-4 { grid-template-columns: 1fr; }
          .plans-header { flex-direction:column; align-items:flex-start; gap:10px; }
          .plan-cards-grid { grid-template-columns:1fr; padding:12px; }
          .hero-ministats { grid-template-columns:1fr; }
          .hero-title { font-size:28px; }
        }
      `}</style>
    </div>
  );
}
