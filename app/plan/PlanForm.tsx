'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft, 
  Info,
  CheckCircle,
  HelpCircle,
  FileDown
} from 'lucide-react';

interface PlanFormProps {
  planId?: string;
}

// Helper to clean JSON syntax, brackets, braces, and quotes from string values
const cleanJSONString = (val: any): string => {
  if (!val) return '';
  let strVal = typeof val === 'string' ? val : JSON.stringify(val);
  strVal = strVal.trim();
  if (strVal.startsWith('[') || strVal.startsWith('{')) {
    try {
      const parsed = JSON.parse(strVal);
      if (Array.isArray(parsed)) {
        return parsed.map(x => cleanJSONString(x)).join('\n');
      }
      if (typeof parsed === 'object') {
        if (parsed.measure) return cleanJSONString(parsed.measure);
        if (parsed.optionText) return cleanJSONString(parsed.optionText);
        if (parsed.text) return cleanJSONString(parsed.text);
        return Object.values(parsed).map(x => cleanJSONString(x)).join('\n');
      }
    } catch (e) {
      // fallback
    }
  }
  // Remove typical JSON syntax brackets, double-quotes, braces and escaped quotes
  return strVal.replace(/[{}|[\]"]/g, '').trim();
};

// Helper to format values as clean, newline-separated bullet points
const ensureBulletString = (val: any): string => {
  if (!val) return '';
  
  if (Array.isArray(val)) {
    return val
      .map(item => {
        let cleaned = cleanJSONString(item);
        if (cleaned && !cleaned.startsWith('-') && !cleaned.startsWith('*')) {
          cleaned = `- ${cleaned}`;
        }
        return cleaned;
      })
      .filter(Boolean)
      .join('\n');
  }
  
  let strVal = String(val).trim();
  if (strVal.startsWith('[') || strVal.startsWith('{')) {
    try {
      const parsed = JSON.parse(strVal);
      return ensureBulletString(parsed);
    } catch (e) {
      // not valid JSON, proceed as regular string
    }
  }
  
  return strVal
    .split('\n')
    .map(line => {
      let cleaned = cleanJSONString(line);
      if (cleaned && !cleaned.startsWith('-') && !cleaned.startsWith('*')) {
        cleaned = `- ${cleaned}`;
      }
      return cleaned;
    })
    .filter(Boolean)
    .join('\n');
};

const getCleanedPayload = (fieldsObj: any) => {
  const cleanedFields: Record<string, any> = {};
  Object.keys(fieldsObj).forEach(key => {
    if (typeof fieldsObj[key] === 'string') {
      if (['competencies', 'desiredAttributes', 'skills21', 'learningMedia', 'learningSources', 'tasks'].includes(key)) {
        cleanedFields[key] = ensureBulletString(fieldsObj[key]);
      } else {
        cleanedFields[key] = cleanJSONString(fieldsObj[key]);
      }
    } else {
      cleanedFields[key] = fieldsObj[key];
    }
  });
  return cleanedFields;
};

export default function PlanForm({ planId }: PlanFormProps) {
  const router = useRouter();
  const isEdit = !!planId;

  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [initialData, setInitialData] = useState<any>(null);
  
  // Backups modal state (only for Edit Mode)
  const [showBackupReason, setShowBackupReason] = useState(false);
  const [backupReasonText, setBackupReasonText] = useState('แก้ไขรายละเอียดทั่วไป');
  
  // Toast notifications
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    msg: '',
    type: 'info'
  });

  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(t => ({ ...t, show: false }));
    }, 3000);
  };

  // 19+ Document fields states
  const [fields, setFields] = useState<Record<string, any>>({
    planStatus: 'draft',
    teacherName: '',
    schoolName: '',
    organization: '',
    headerLearningArea: 'ภาษาต่างประเทศ',
    headerGradeLevel: '',
    
    subjectId: '',
    subjectName: '',
    subjectCode: '',
    learningArea: 'ภาษาต่างประเทศ',
    gradeLevel: '',
    semester: '1',
    academicYear: '2569',
    totalHours: 2,
    
    unitId: '',
    unitName: '',
    topicId: '',
    lessonTopic: '',
    
    learningStandard: '',
    indicatorDuring: '',
    indicatorFinal: '',
    indicatorSelectedIds: '',
    essentialConcept: '',
    objectiveK: '',
    objectiveP: '',
    objectiveA: '',
    learningContent: '',
    competencies: '',
    desiredAttributes: '',
    skills21: '',
    learningProcess: '',
    
    measureK: '', methodK: '', toolK: '', criteriaK: 'ผ่านเกณฑ์ร้อยละ 60 ขึ้นไป',
    measureP: '', methodP: '', toolP: '', criteriaP: 'ผ่านเกณฑ์ระดับคุณภาพระดับดีขึ้นไป',
    measureA: '', methodA: '', toolA: '', criteriaA: 'ผ่านเกณฑ์ระดับคุณภาพระดับดีขึ้นไป',
    
    learningMedia: '',
    learningSources: '',
    tasks: '',
    
    resultK: '',
    resultP: '',
    resultA: '',
    problems: '',
    solutions: ''
  });

  // Load configuration & master data
  useEffect(() => {
    async function fetchData() {
      try {
        const initRes = await fetch('/api/initial-data');
        const initJson = await initRes.json();
        
        if (initJson.success) {
          setInitialData(initJson.data);
          
          // Seed defaults from config if creating new
          if (!isEdit && initJson.data.config) {
            setFields(prev => ({
              ...prev,
              teacherName: initJson.data.config.teacherName || '',
              schoolName: initJson.data.config.schoolName || '',
              organization: initJson.data.config.organization || '',
              learningArea: initJson.data.config.learningArea || 'ภาษาต่างประเทศ',
              headerLearningArea: initJson.data.config.learningArea || 'ภาษาต่างประเทศ',
              gradeLevel: initJson.data.config.defaultGradeLevel || '',
              headerGradeLevel: initJson.data.config.defaultGradeLevel || ''
            }));
          }
        }

        // If Edit Mode, load existing plan data
        if (isEdit) {
          const planRes = await fetch(`/api/plans/${planId}`);
          const planJson = await planRes.json();
          if (planJson.success) {
            const planData = planJson.data;
            const cleanedData: Record<string, any> = { ...planData };
            const bulletFields = ['competencies', 'desiredAttributes', 'skills21', 'learningMedia', 'learningSources', 'tasks'];
            
            Object.keys(cleanedData).forEach(key => {
              if (typeof cleanedData[key] === 'string') {
                if (bulletFields.includes(key)) {
                  cleanedData[key] = ensureBulletString(cleanedData[key]);
                } else {
                  cleanedData[key] = cleanJSONString(cleanedData[key]);
                }
              }
            });
            setFields(cleanedData);
          } else {
            triggerToast('ไม่พบรหัสแผนการสอนนี้', 'error');
            router.push('/');
          }
        }
      } catch (err: any) {
        triggerToast('เกิดข้อผิดพลาดในการดึงข้อมูลระบบ', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [planId, isEdit, router]);

  // Master lists
  const subjects = initialData?.subjects || [];
  const units = initialData?.units || [];
  const topics = initialData?.topics || [];
  const indicators = initialData?.indicators || [];
  const options = initialData?.options || {};

  // Filters based on selections
  const filteredUnits = fields.subjectId 
    ? units.filter((u: any) => u.subjectId === fields.subjectId)
    : [];
    
  const filteredTopics = fields.unitId 
    ? topics.filter((t: any) => t.unitId === fields.unitId)
    : [];

  const filteredIndicators = fields.gradeLevel
    ? indicators.filter((ind: any) => ind.gradeLevel === fields.gradeLevel)
    : [];

  // 1. Select Subject Handler
  const handleSubjectChange = (subjectId: string) => {
    const selected = subjects.find((s: any) => s.subjectId === subjectId);
    if (selected) {
      setFields(prev => ({
        ...prev,
        subjectId,
        subjectCode: selected.subjectCode,
        subjectName: selected.subjectName,
        gradeLevel: selected.gradeLevel,
        headerGradeLevel: selected.gradeLevel === 'ม.1' ? 'มัธยมศึกษาปีที่ 1' : selected.gradeLevel === 'ม.2' ? 'มัธยมศึกษาปีที่ 2' : 'มัธยมศึกษาปีที่ 3',
        learningArea: selected.learningArea,
        // Reset subsequent selections
        unitId: '',
        unitName: '',
        topicId: '',
        lessonTopic: '',
        totalHours: 2,
        indicatorSelectedIds: ''
      }));
    }
  };

  // 2. Select Unit Handler (Automaps indicators associated with this unit)
  const handleUnitChange = (unitId: string) => {
    const selected = units.find((u: any) => u.unitId === unitId);
    if (selected) {
      // Find indicators matching the mapped IDs in unit
      const associatedIds = selected.indicatorIds ? selected.indicatorIds.split(',') : [];
      const matchedInds = indicators.filter((ind: any) => associatedIds.includes(ind.indicatorId));
      
      const duringList = matchedInds.filter((ind: any) => ind.indicatorType === 'during').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
      const finalList = matchedInds.filter((ind: any) => ind.indicatorType === 'final').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
      const uniqueStandards = Array.from(new Set(matchedInds.map((ind: any) => `${ind.standardCode} ${ind.standardText}`))).join('\n');

      setFields(prev => ({
        ...prev,
        unitId,
        unitName: selected.unitName,
        indicatorSelectedIds: selected.indicatorIds || '',
        indicatorDuring: duringList,
        indicatorFinal: finalList,
        learningStandard: uniqueStandards,
        // Reset topic
        topicId: '',
        lessonTopic: '',
        totalHours: 2
      }));
    }
  };

  // 3. Select Topic Handler
  const handleTopicChange = (topicId: string) => {
    const selected = topics.find((t: any) => t.topicId === topicId);
    if (selected) {
      setFields(prev => ({
        ...prev,
        topicId,
        lessonTopic: selected.lessonTopic,
        totalHours: selected.defaultHours || 2
      }));
    }
  };

  // 4. Update Indicators Checkboxes Check Handler
  const handleIndicatorCheck = (indId: string, checked: boolean) => {
    let selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
    if (checked) {
      if (!selectedArr.includes(indId)) selectedArr.push(indId);
    } else {
      selectedArr = selectedArr.filter((id: string) => id !== indId);
    }
    
    // Recompute values for textareas
    const updatedIds = selectedArr.join(',');
    const matchedInds = indicators.filter((ind: any) => selectedArr.includes(ind.indicatorId));
    
    const duringList = matchedInds.filter((ind: any) => ind.indicatorType === 'during').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
    const finalList = matchedInds.filter((ind: any) => ind.indicatorType === 'final').map((ind: any) => `${ind.indicatorCode} ${ind.indicatorText}`).join('\n');
    const uniqueStandards = Array.from(new Set(matchedInds.map((ind: any) => `${ind.standardCode} ${ind.standardText}`))).join('\n');

    setFields(prev => ({
      ...prev,
      indicatorSelectedIds: updatedIds,
      indicatorDuring: duringList,
      indicatorFinal: finalList,
      learningStandard: uniqueStandards
    }));
  };

  // 5. Add / Remove options chips to text fields
  const handleChipClick = (fieldName: string, optionText: string) => {
    const currentVal = fields[fieldName] || '';
    const currentItems = currentVal.split('\n').map((i: string) => i.trim()).filter(Boolean);
    const chipText = `- ${optionText}`;
    
    if (currentItems.includes(chipText)) {
      // Remove
      const filtered = currentItems.filter((i: string) => i !== chipText);
      setFields(prev => ({ ...prev, [fieldName]: filtered.join('\n') }));
    } else {
      // Add
      currentItems.push(chipText);
      setFields(prev => ({ ...prev, [fieldName]: currentItems.join('\n') }));
    }
  };

  // 6. Gemini AI Magic Autofill Handler
  const handleAIMagicFill = async () => {
    if (!fields.gradeLevel || !fields.subjectName || !fields.lessonTopic) {
      triggerToast('กรุณาระบุ ระดับชั้น, วิชา และ เรื่องที่สอน ก่อนใช้ระบบ AI', 'error');
      return;
    }

    setAiLoading(true);
    triggerToast('Gemini AI กำลังวิเคราะห์หลักสูตรและจัดทำร่างแผน...', 'info');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gradeLevel: fields.gradeLevel,
          subjectName: fields.subjectName,
          lessonTopic: fields.lessonTopic
        })
      });

      const json = await response.json();
      if (json.success && json.data) {
        const ai = json.data;
        
        // Auto populate all generated 19 fields, sanitizing JSON characters and formatting lists
        setFields(prev => ({
          ...prev,
          learningStandard: cleanJSONString(ai.learningStandard) || prev.learningStandard,
          indicatorDuring: cleanJSONString(ai.indicatorDuring) || prev.indicatorDuring,
          indicatorFinal: cleanJSONString(ai.indicatorFinal) || prev.indicatorFinal,
          essentialConcept: cleanJSONString(ai.essentialConcept) || prev.essentialConcept,
          objectiveK: cleanJSONString(ai.objectiveK) || prev.objectiveK,
          objectiveP: cleanJSONString(ai.objectiveP) || prev.objectiveP,
          objectiveA: cleanJSONString(ai.objectiveA) || prev.objectiveA,
          learningContent: cleanJSONString(ai.learningContent) || prev.learningContent,
          competencies: ensureBulletString(ai.competencies) || prev.competencies,
          desiredAttributes: ensureBulletString(ai.desiredAttributes) || prev.desiredAttributes,
          skills21: ensureBulletString(ai.skills21) || prev.skills21,
          learningMedia: ensureBulletString(ai.learningMedia) || prev.learningMedia,
          learningSources: ensureBulletString(ai.learningSources) || prev.learningSources,
          tasks: ensureBulletString(ai.tasks) || prev.tasks,
          learningProcess: cleanJSONString(ai.learningProcess) || prev.learningProcess,
          
          methodK: cleanJSONString(ai.methodK) || prev.methodK,
          toolK: cleanJSONString(ai.toolK) || prev.toolK,
          criteriaK: cleanJSONString(ai.criteriaK) || prev.criteriaK,
          
          methodP: cleanJSONString(ai.methodP) || prev.methodP,
          toolP: cleanJSONString(ai.toolP) || prev.toolP,
          criteriaP: cleanJSONString(ai.criteriaP) || prev.criteriaP,
          
          methodA: cleanJSONString(ai.methodA) || prev.methodA,
          toolA: cleanJSONString(ai.toolA) || prev.toolA,
          criteriaA: cleanJSONString(ai.criteriaA) || prev.criteriaA,
          
          resultK: cleanJSONString(ai.resultK) || prev.resultK,
          resultP: cleanJSONString(ai.resultP) || prev.resultP,
          resultA: cleanJSONString(ai.resultA) || prev.resultA,
          problems: cleanJSONString(ai.problems) || prev.problems,
          solutions: cleanJSONString(ai.solutions) || prev.solutions
        }));

        triggerToast('AI ทำร่างแผนการสอนเสร็จสมบูรณ์แล้ว!', 'success');
        setActiveTab(2); // Auto jump to review tab

      } else {
        triggerToast('AI ล้มเหลว: ' + (json.error || 'กรุณาลองใหม่อีกครั้ง'), 'error');
      }
    } catch (err: any) {
      triggerToast('ล้มเหลวในการเชื่อมต่อกับ AI: ' + err.message, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // 7. Save to Database Handler
  const handleSave = async (status: 'draft' | 'complete') => {
    if (!fields.lessonTopic || !fields.subjectName) {
      triggerToast('กรุณาระบุ เรื่องที่สอน และ วิชา ก่อนทำการบันทึก', 'error');
      return;
    }

    if (isEdit) {
      // Edit Mode -> open reason dialog first
      fields.planStatus = status;
      setShowBackupReason(true);
    } else {
      // Create Mode -> POST direct
      setSaving(true);
      try {
        const payload = {
          ...getCleanedPayload(fields),
          planStatus: status
        };
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.success) {
          triggerToast('บันทึกแผนการสอนใหม่เรียบร้อยแล้ว', 'success');
          router.push('/');
          router.refresh();
        } else {
          triggerToast('ไม่สามารถบันทึกข้อมูล: ' + json.error, 'error');
        }
      } catch (err: any) {
        triggerToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  // Confirm revision update in edit mode (includes reasons logging)
  const confirmUpdate = async () => {
    setShowBackupReason(false);
    setSaving(true);
    
    try {
      const payload = {
        ...getCleanedPayload(fields),
        backupReason: backupReasonText
      };
      
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        triggerToast('อัปเดตรายละเอียดแผนการสอนและสำรองข้อมูลรุ่นเก่าเรียบร้อยแล้ว', 'success');
        router.push('/');
        router.refresh();
      } else {
        triggerToast('ไม่สามารถบันทึกข้อมูล: ' + json.error, 'error');
      }
    } catch (err: any) {
      triggerToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '14px', fontFamily: 'Sarabun, sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <strong>กำลังดึงโครงสร้างแผนการสอน...</strong>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`} style={{ borderLeftColor: toast.type === 'success' ? '#16a34a' : toast.type === 'error' ? '#dc2626' : '#6366f1' }}>
          {toast.msg}
        </div>
      )}

      {/* ─── ACTION BAR ─── */}
      <div className="action-bar no-print">
        <button className="btn btn-ghost" onClick={() => router.push('/')}>
          <ArrowLeft size={14} /> กลับหน้าแดชบอร์ด
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEdit && (
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => window.open(`/plan/${planId}/preview`, '_blank')}
              title="ดูตัวอย่างแผน"
              style={{ borderColor: 'var(--c-primary)', color: 'var(--c-primary)' }}
            >
              👁️ ดูตัวอย่างแผน (Preview)
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-success" 
            onClick={() => handleSave('complete')}
            disabled={saving || aiLoading}
          >
            <Save size={14} /> บันทึกเสร็จสมบูรณ์
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => handleSave('draft')}
            disabled={saving || aiLoading}
          >
            <Save size={14} /> บันทึกแบบร่าง (Draft)
          </button>
        </div>
      </div>

      {/* ─── WIZARD FORM CARDS ─── */}
      <form onSubmit={e => e.preventDefault()} style={{ position: 'relative' }}>
        
        {/* Form Tabs Navigation */}
        <div className="form-tabs">
          <button type="button" className={`form-tab ${activeTab === 1 ? 'active' : ''}`} onClick={() => setActiveTab(1)}>1. ข้อมูลวิชาและรายคาบ</button>
          <button type="button" className={`form-tab ${activeTab === 2 ? 'active' : ''}`} onClick={() => setActiveTab(2)}>2. สาระสำคัญและตัวชี้วัด</button>
          <button type="button" className={`form-tab ${activeTab === 3 ? 'active' : ''}`} onClick={() => setActiveTab(3)}>3. จุดประสงค์และการประเมิน</button>
          <button type="button" className={`form-tab ${activeTab === 4 ? 'active' : ''}`} onClick={() => setActiveTab(4)}>4. กระบวนการและสื่อ</button>
          <button type="button" className={`form-tab ${activeTab === 5 ? 'active' : ''}`} onClick={() => setActiveTab(5)}>5. บันทึกผลหลังสอน</button>
        </div>

        {/* ─── TAB 1: BASIC INFO ─── */}
        {activeTab === 1 && (
          <div className="tab-panel card">
            <h3>ข้อมูลวิชาเบื้องต้น และ ผู้ใช้งาน</h3>
            <div className="g3">
              <label className="field">
                ชื่อ-นามสกุลผู้สอน
                <input value={fields.teacherName} onChange={e => setFields({ ...fields, teacherName: e.target.value })} required />
              </label>
              <label className="field">
                โรงเรียน
                <input value={fields.schoolName} onChange={e => setFields({ ...fields, schoolName: e.target.value })} required />
              </label>
              <label className="field">
                หน่วยงานสังกัด
                <input value={fields.organization} onChange={e => setFields({ ...fields, organization: e.target.value })} required />
              </label>
            </div>

            <hr className="divider" style={{ borderTopStyle: 'dashed' }} />
            
            <h3>รายวิชาและหัวข้อสอน</h3>
            <div className="g3">
              <label className="field">
                เลือกวิชา
                <select value={fields.subjectId} onChange={e => handleSubjectChange(e.target.value)}>
                  <option value="">-- กรุณาเลือกรายวิชา --</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.subjectId} value={sub.subjectId}>
                      {sub.subjectCode} - {sub.subjectName} ({sub.gradeLevel})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                วิชา (แสดงในหัวกระดาษ)
                <input value={fields.subjectName} onChange={e => setFields({ ...fields, subjectName: e.target.value })} required />
              </label>

              <label className="field">
                รหัสวิชา (แสดงในหัวกระดาษ)
                <input value={fields.subjectCode} onChange={e => setFields({ ...fields, subjectCode: e.target.value })} required />
              </label>
            </div>

            <div className="g3" style={{ marginTop: '12px' }}>
              <label className="field">
                ระดับชั้น
                <input value={fields.gradeLevel} readOnly className="readonly-field" />
              </label>
              <label className="field">
                ภาคเรียน
                <select value={fields.semester} onChange={e => setFields({ ...fields, semester: e.target.value })}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </label>
              <label className="field">
                ปีการศึกษา
                <input value={fields.academicYear} onChange={e => setFields({ ...fields, academicYear: e.target.value })} />
              </label>
            </div>

            <div className="g3" style={{ marginTop: '12px' }}>
              <label className="field">
                เลือกหน่วยการเรียนรู้
                <select 
                  value={fields.unitId} 
                  onChange={e => handleUnitChange(e.target.value)}
                  disabled={!fields.subjectId}
                >
                  <option value="">{fields.subjectId ? '-- กรุณาเลือกหน่วย --' : 'กรุณาเลือกรายวิชาก่อน'}</option>
                  {filteredUnits.map((u: any) => (
                    <option key={u.unitId} value={u.unitId}>
                      หน่วยที่ {u.unitNumber}: {u.unitName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                เลือกหัวเรื่อง/หัวข้อย่อย
                <select 
                  value={fields.topicId} 
                  onChange={e => handleTopicChange(e.target.value)}
                  disabled={!fields.unitId}
                >
                  <option value="">{fields.unitId ? '-- กรุณาเลือกเรื่องที่สอน --' : 'กรุณาเลือกหน่วยการเรียนรู้ก่อน'}</option>
                  {filteredTopics.map((t: any) => (
                    <option key={t.topicId} value={t.topicId}>
                      {t.topicNumber}. {t.lessonTopic} ({t.defaultHours} ชม.)
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                จำนวนชั่วโมงสอนของแผนนี้
                <input type="number" value={fields.totalHours} onChange={e => setFields({ ...fields, totalHours: parseInt(e.target.value) || 2 })} />
              </label>
            </div>

            {/* AI AUTOFILL CALLOUT PANEL */}
            <div className="db-warn" style={{ marginTop: '24px', background: 'rgba(99, 102, 241, 0.1)', borderColor: '#818cf8', color: '#1e1b4b' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Sparkles size={18} color="#4f46e5" style={{ marginTop: '2px' }} />
                <div>
                  <strong>พลังสร้างสรรค์แผนการสอนด้วย Gemini AI</strong>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#4b5563' }}>
                    เมื่อคุณกรอกข้อมูลชั้น วิชา และเรื่องที่สอนเสร็จเรียบร้อย 
                    คุณสามารถกดปุ่ม Magic Fill เพื่อวิเคราะห์มาตรฐาน ตัวชี้วัด และจุดประสงค์ ทั้ง 19 ฟิลด์อัตโนมัติ
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAIMagicFill}
                disabled={aiLoading || !fields.lessonTopic}
              >
                <Sparkles size={13} /> {aiLoading ? 'กำลังสร้างแผนด้วย AI...' : 'Magic AutoFill'}
              </button>
            </div>

            <div className="tab-nav">
              <div></div>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(2)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 2: STANDARDS & CORE CONTENTS ─── */}
        {activeTab === 2 && (
          <div className="tab-panel card">
            <h3>มาตรฐานการเรียนรู้ และ ตัวชี้วัดหลักสูตร</h3>
            
            <div className="g1">
              <label className="field">
                1. มาตรฐานการเรียนรู้ที่เกี่ยวข้อง (Learning Standards)
                <textarea className="lg" value={fields.learningStandard} onChange={e => setFields({ ...fields, learningStandard: e.target.value })} placeholder="เช่น มาตรฐาน ต 1.1 เข้าใจและตีความ..." />
              </label>

              {/* Standards Repository Panel */}
              <div className="chip-wrap" style={{ marginTop: '4px', marginBottom: '14px' }}>
                <span className="help-text" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>คลังมาตรฐานการเรียนรู้แนะนำ (คลิกเพื่อเลือกมาตรฐาน)</span>
                <div className="chip-list">
                  {options.standard?.map((opt: any) => {
                    const standardText = `${opt.optionName} ${opt.optionText}`;
                    const hasIt = (fields.learningStandard || '').includes(opt.optionName);
                    return (
                      <div 
                        key={opt.optionId} 
                        className={`chip ${hasIt ? 'on' : ''}`} 
                        onClick={() => {
                          const currentVal = fields.learningStandard || '';
                          const currentItems = currentVal.split('\n').map((i: string) => i.trim()).filter(Boolean);
                          if (hasIt) {
                            // Find and remove standard text line
                            const filtered = currentItems.filter((i: string) => !i.includes(opt.optionName));
                            setFields(prev => ({ ...prev, learningStandard: filtered.join('\n') }));
                          } else {
                            currentItems.push(standardText);
                            setFields(prev => ({ ...prev, learningStandard: currentItems.join('\n') }));
                          }
                        }}
                      >
                        {opt.optionName}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* During Indicators Section */}
              <div className="g1" style={{ marginTop: '12px' }}>
                <label className="field">
                  ตัวชี้วัดระหว่างทาง (Indicator During)
                  <textarea className="lg" value={fields.indicatorDuring} onChange={e => setFields({ ...fields, indicatorDuring: e.target.value })} placeholder="คลิกเลือกตัวชี้วัดระหว่างทางด้านล่าง..." />
                </label>
                
                {fields.gradeLevel && (
                  <div className="ind-panel" style={{ marginTop: '4px', marginBottom: '14px' }}>
                    <div className="ind-header" style={{ background: '#eff6ff', borderBottomColor: '#bfdbfe' }}>
                      <span className="ind-header-text" style={{ color: '#1e40af' }}>คลังตัวชี้วัดระหว่างทางแนะนำ ({fields.gradeLevel})</span>
                    </div>
                    <div className="ind-list">
                      {filteredIndicators.filter((ind: any) => ind.indicatorType === 'during').map((ind: any) => {
                        const selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
                        const isChecked = selectedArr.includes(ind.indicatorId);
                        return (
                          <div 
                            key={ind.indicatorId} 
                            className="ind-item"
                            onClick={() => handleIndicatorCheck(ind.indicatorId, !isChecked)}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => {}}
                            />
                            <div className="ind-text">
                              <span className="ind-code">{ind.indicatorCode}</span>
                              {ind.indicatorText}
                              <span className="ind-type during">ระหว่างทาง</span>
                            </div>
                          </div>
                        );
                      })}
                      {filteredIndicators.filter((ind: any) => ind.indicatorType === 'during').length === 0 && (
                        <div className="ind-empty">ไม่มีตัวชี้วัดระหว่างทางสำหรับระดับชั้นนี้</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Final Indicators Section */}
              <div className="g1" style={{ marginTop: '12px' }}>
                <label className="field">
                  ตัวชี้วัดปลายทาง (Indicator Final)
                  <textarea className="lg" value={fields.indicatorFinal} onChange={e => setFields({ ...fields, indicatorFinal: e.target.value })} placeholder="คลิกเลือกตัวชี้วัดปลายทางด้านล่าง..." />
                </label>

                {fields.gradeLevel && (
                  <div className="ind-panel" style={{ marginTop: '4px', marginBottom: '14px' }}>
                    <div className="ind-header" style={{ background: '#ecfdf5', borderBottomColor: '#a7f3d0' }}>
                      <span className="ind-header-text" style={{ color: '#065f46' }}>คลังตัวชี้วัดปลายทางแนะนำ ({fields.gradeLevel})</span>
                    </div>
                    <div className="ind-list">
                      {filteredIndicators.filter((ind: any) => ind.indicatorType === 'final').map((ind: any) => {
                        const selectedArr = fields.indicatorSelectedIds ? fields.indicatorSelectedIds.split(',') : [];
                        const isChecked = selectedArr.includes(ind.indicatorId);
                        return (
                          <div 
                            key={ind.indicatorId} 
                            className="ind-item"
                            onClick={() => handleIndicatorCheck(ind.indicatorId, !isChecked)}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => {}}
                            />
                            <div className="ind-text">
                              <span className="ind-code">{ind.indicatorCode}</span>
                              {ind.indicatorText}
                              <span className="ind-type final">ปลายทาง</span>
                            </div>
                          </div>
                        );
                      })}
                      {filteredIndicators.filter((ind: any) => ind.indicatorType === 'final').length === 0 && (
                        <div className="ind-empty">ไม่มีตัวชี้วัดปลายทางสำหรับระดับชั้นนี้</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <hr className="divider" />

              <label className="field">
                2. สาระสำคัญ (Concept / Big Idea)
                <textarea className="lg" value={fields.essentialConcept} onChange={e => setFields({ ...fields, essentialConcept: e.target.value })} />
              </label>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(1)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(3)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 3: OBJECTIVES & ASSESSMENT ─── */}
        {activeTab === 3 && (
          <div className="tab-panel card">
            <h3>3. จุดประสงค์การเรียนรู้ (Learning Objectives)</h3>
            <div className="g1">
              <label className="field">
                จุดประสงค์ด้านความรู้ (Knowledge - K)
                <textarea value={fields.objectiveK} onChange={e => setFields({ ...fields, objectiveK: e.target.value })} />
              </label>
              <label className="field">
                จุดประสงค์ด้านทักษะกระบวนการ (Process - P)
                <textarea value={fields.objectiveP} onChange={e => setFields({ ...fields, objectiveP: e.target.value })} />
              </label>
              <label className="field">
                จุดประสงค์ด้านคุณลักษณะ (Attitude - A)
                <textarea value={fields.objectiveA} onChange={e => setFields({ ...fields, objectiveA: e.target.value })} />
              </label>
            </div>

            <hr className="divider" />
            
            <h3>9. การวัดและการประเมินผล (K/P/A Assessment)</h3>
            
            {/* K Assessment Card */}
            <div className="assess-card">
              <div className="assess-header">
                <h4>ประเมินด้านความรู้ (Knowledge - K)</h4>
              </div>
              <div className="g3">
                <label className="field">
                  วิธีการวัดผล
                  <input value={fields.methodK} onChange={e => setFields({ ...fields, methodK: e.target.value })} placeholder="เช่น การทำใบงานคำศัพท์" />
                </label>
                <label className="field">
                  เครื่องมือประเมิน
                  <input value={fields.toolK} onChange={e => setFields({ ...fields, toolK: e.target.value })} placeholder="เช่น ใบงานที่ 1.1" />
                </label>
                <label className="field">
                  เกณฑ์ผ่านประเมิน
                  <input value={fields.criteriaK} onChange={e => setFields({ ...fields, criteriaK: e.target.value })} />
                </label>
              </div>
            </div>

            {/* P Assessment Card */}
            <div className="assess-card">
              <div className="assess-header">
                <h4>ประเมินด้านทักษะกระบวนการ (Process - P)</h4>
              </div>
              <div className="g3">
                <label className="field">
                  วิธีการวัดผล
                  <input value={fields.methodP} onChange={e => setFields({ ...fields, methodP: e.target.value })} placeholder="เช่น การสังเกตพฤติกรรมการพูด" />
                </label>
                <label className="field">
                  เครื่องมือประเมิน
                  <input value={fields.toolP} onChange={e => setFields({ ...fields, toolP: e.target.value })} placeholder="เช่น แบบสังเกตการพูดประโยค" />
                </label>
                <label className="field">
                  เกณฑ์ผ่านประเมิน
                  <input value={fields.criteriaP} onChange={e => setFields({ ...fields, criteriaP: e.target.value })} />
                </label>
              </div>
            </div>

            {/* A Assessment Card */}
            <div className="assess-card">
              <div className="assess-header">
                <h4>ประเมินด้านคุณลักษณะ (Attitude - A)</h4>
              </div>
              <div className="g3">
                <label className="field">
                  วิธีการวัดผล
                  <input value={fields.methodA} onChange={e => setFields({ ...fields, methodA: e.target.value })} placeholder="เช่น สังเกตพฤติกรรมใฝ่เรียนรู้" />
                </label>
                <label className="field">
                  เครื่องมือประเมิน
                  <input value={fields.toolA} onChange={e => setFields({ ...fields, toolA: e.target.value })} placeholder="เช่น แบบประเมินคุณลักษณะอันพึงประสงค์" />
                </label>
                <label className="field">
                  เกณฑ์ผ่านประเมิน
                  <input value={fields.criteriaA} onChange={e => setFields({ ...fields, criteriaA: e.target.value })} />
                </label>
              </div>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(2)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(4)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 4: PROCESS & MEDIA ─── */}
        {activeTab === 4 && (
          <div className="tab-panel card">
            <h3>8. กระบวนการเรียนรู้ (Active Learning Steps)</h3>
            <label className="field">
              กระบวนการสอน (เช่น ขั้นนำ ขั้นสอน ขั้นสรุป หรือ 5E Model)
              <textarea className="lg" style={{ minHeight: '220px' }} value={fields.learningProcess} onChange={e => setFields({ ...fields, learningProcess: e.target.value })} />
            </label>

            <hr className="divider" />
            
            <h3>สมรรถนะ, ทักษะ และสื่อแนะนำ</h3>
            
            {/* Competency Chips */}
            <div className="chip-wrap">
              <span className="help-text" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>สมรรถนะสำคัญผู้เรียน (กดเลือกเพื่อเติมใน textarea ด้านล่าง)</span>
              <div className="chip-list">
                {options.competency?.map((opt: any) => {
                  const hasIt = (fields.competencies || '').includes(opt.optionName);
                  return (
                    <div key={opt.optionId} className={`chip ${hasIt ? 'on' : ''}`} onClick={() => handleChipClick('competencies', opt.optionName)}>
                      {opt.optionName}
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="field" style={{ marginBottom: '16px' }}>
              สมรรถนะสำคัญผู้เรียนจริงที่แสดงในแผน
              <textarea value={fields.competencies} onChange={e => setFields({ ...fields, competencies: e.target.value })} />
            </label>

            {/* Desired Attributes Chips */}
            <div className="chip-wrap">
              <span className="help-text" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>คุณลักษณะอันพึงประสงค์ (กดเลือกเพื่อเติมใน textarea ด้านล่าง)</span>
              <div className="chip-list">
                {options.attribute?.map((opt: any) => {
                  const hasIt = (fields.desiredAttributes || '').includes(opt.optionName);
                  return (
                    <div key={opt.optionId} className={`chip ${hasIt ? 'on' : ''}`} onClick={() => handleChipClick('desiredAttributes', opt.optionName)}>
                      {opt.optionName}
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="field" style={{ marginBottom: '16px' }}>
              คุณลักษณะอันพึงประสงค์จริงที่เลือก
              <textarea value={fields.desiredAttributes} onChange={e => setFields({ ...fields, desiredAttributes: e.target.value })} />
            </label>

            {/* Century Skills Chips */}
            <div className="chip-wrap">
              <span className="help-text" style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>ทักษะแห่งศตวรรษที่ 21 (Skills 21)</span>
              <div className="chip-list">
                {options.skill21?.map((opt: any) => {
                  const hasIt = (fields.skills21 || '').includes(opt.optionName);
                  return (
                    <div key={opt.optionId} className={`chip ${hasIt ? 'on' : ''}`} onClick={() => handleChipClick('skills21', opt.optionName)}>
                      {opt.optionName}
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="field" style={{ marginBottom: '16px' }}>
              ทักษะศตวรรษที่ 21 จริงที่เลือก
              <textarea value={fields.skills21} onChange={e => setFields({ ...fields, skills21: e.target.value })} />
            </label>

            {/* Media & Sources Fields */}
            <div className="g3">
              <label className="field">
                สื่อการจัดการเรียนรู้
                <textarea className="lg" value={fields.learningMedia} onChange={e => setFields({ ...fields, learningMedia: e.target.value })} placeholder="- ใบงาน\n- สไลด์ประกอบการสอน" />
              </label>
              <label className="field">
                แหล่งเรียนรู้ภายนอก
                <textarea className="lg" value={fields.learningSources} onChange={e => setFields({ ...fields, learningSources: e.target.value })} placeholder="- ห้องสมุดโรงเรียน\n- สื่ออินเทอร์เน็ต" />
              </label>
              <label className="field">
                ภาระงาน / ชิ้นงานหลัก (Tasks)
                <textarea className="lg" value={fields.tasks} onChange={e => setFields({ ...fields, tasks: e.target.value })} placeholder="- ใบงานสรุปคำศัพท์" />
              </label>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(3)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(5)}>ถัดไป <ChevronRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ─── TAB 5: AFTER ACTION REVIEW ─── */}
        {activeTab === 5 && (
          <div className="tab-panel card">
            <h3>13. บันทึกหลังการสอน (After Action Review)</h3>
            <div className="g3">
              <label className="field">
                ผลการเรียนรู้ด้านความรู้ (K)
                <textarea className="lg" value={fields.resultK} onChange={e => setFields({ ...fields, resultK: e.target.value })} placeholder="เช่น นักเรียนจำนวน 85% ผ่านเกณฑ์..." />
              </label>
              <label className="field">
                ผลการเรียนรู้ด้านทักษะกระบวนการ (P)
                <textarea className="lg" value={fields.resultP} onChange={e => setFields({ ...fields, resultP: e.target.value })} placeholder="เช่น นักเรียนพูดตอบคำถามได้ถูกต้อง..." />
              </label>
              <label className="field">
                ผลการเรียนรู้ด้านคุณลักษณะ (A)
                <textarea className="lg" value={fields.resultA} onChange={e => setFields({ ...fields, resultA: e.target.value })} placeholder="เช่น นักเรียนมีความตั้งใจเรียนดี..." />
              </label>
            </div>

            <div className="g2" style={{ marginTop: '16px' }}>
              <label className="field">
                ปัญหาและอุปสรรคที่พบ
                <textarea className="lg" value={fields.problems} onChange={e => setFields({ ...fields, problems: e.target.value })} placeholder="เช่น นักเรียนบางส่วนเขียนสะกดคำได้ช้า..." />
              </label>
              <label className="field">
                แนวทางการแก้ไขและการพัฒนานักเรียน
                <textarea className="lg" value={fields.solutions} onChange={e => setFields({ ...fields, solutions: e.target.value })} placeholder="เช่น จัดทำสื่อเสริมฝึกหัดเพิ่มเติมหลังสอน..." />
              </label>
            </div>

            <div className="tab-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setActiveTab(4)}><ChevronLeft size={14} /> ย้อนกลับ</button>
              <div></div>
            </div>
          </div>
        )}

      </form>

      {/* ─── AI LOADING SPINNER OVERLAY ─── */}
      {aiLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <strong>Gemini AI กำลังวิเคราะห์และร่างข้อความแผนการสอน...</strong>
          <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.85 }}>วิเคราะห์สัมพันธ์ มาตรฐานและตัวชี้วัด (อาจใช้เวลา 5-10 วินาที)</span>
        </div>
      )}

      {/* ─── SAVING SPINNER OVERLAY ─── */}
      {saving && (
        <div className="loading-overlay">
          <div className="spinner" />
          <strong>กำลังบันทึกข้อมูลแผนการเรียนรู้ลง Supabase...</strong>
        </div>
      )}

      {/* ─── BACKUP REASON MODAL (EDIT MODE) ─── */}
      {showBackupReason && (
        <div className="modal-bg">
          <div className="modal-box">
            <h3>ระบุเหตุผลในการแก้ไขแผน</h3>
            <p>ระบบจะสร้างประวัติสำรอง (Version History) แผนการสอนเวอร์ชันก่อนหน้านี้เก็บไว้ในตารางสำรอง เพื่อให้คุณย้อนกลับได้เสมอ</p>
            <label className="field">
              คำอธิบายการสำรองข้อมูล
              <input 
                value={backupReasonText} 
                onChange={e => setBackupReasonText(e.target.value)} 
                placeholder="เช่น ปรับปรุงกระบวนการ Active Learning, แก้ไขตัวสะกดคำ"
              />
            </label>
            <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowBackupReason(false)}>ยกเลิก</button>
              <button type="button" className="btn btn-primary" onClick={confirmUpdate}>ตกลง (บันทึก)</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
