'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  V3LessonPlan,
  V3LessonObjective,
  V3LearningEvidence,
  V3LessonActivity,
  V3TeachingAsset,
  V3TeachingAssetWithLinks,
  V3TeachingAssetRequirements,
  V3TeachingAssetRequirementItem,
  V3TeachingPackageReadiness,
  V3AudienceType,
} from '@/lib/smartPlanV3/types';
import { validateAssetDuration } from '@/lib/smartPlanV3/teachingAssets/schemas';

interface Step5Props {
  planId: string;
  lesson: V3LessonPlan;
  objectives: V3LessonObjective[];
  evidence: V3LearningEvidence[];
  activities?: V3LessonActivity[];
  onLessonStatusChange?: (status: any) => void;
  onNavigateToStep?: (step: number) => void;
}

export default function Step5TeachingPackage({
  planId,
  lesson,
  objectives,
  evidence,
  activities = [],
  onLessonStatusChange,
  onNavigateToStep,
}: Step5Props) {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<V3TeachingAssetWithLinks[]>([]);
  const [requirements, setRequirements] = useState<V3TeachingAssetRequirements | null>(null);
  const [readiness, setReadiness] = useState<V3TeachingPackageReadiness | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>('ALL');

  // Generation & Preview Modal State
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewAssetType, setPreviewAssetType] = useState('');
  const [previewAudience, setPreviewAudience] = useState<V3AudienceType>('STUDENT');
  const [previewValidationErrors, setPreviewValidationErrors] = useState<string[]>([]);
  const [existingAssetForCompare, setExistingAssetForCompare] = useState<V3TeachingAssetWithLinks | null>(null);
  const [compareTab, setCompareTab] = useState<'NEW' | 'EXISTING'>('NEW');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [userPromptNotes, setUserPromptNotes] = useState('');
  const [isSavingAsset, setIsSavingAsset] = useState(false);

  // Bulk Generation State
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Record<string, string>>({});

  // Manual Asset Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState('WORKSHEET');
  const [manualAudience, setManualAudience] = useState<V3AudienceType>('STUDENT');
  const [manualDescription, setManualDescription] = useState('');
  const [manualObjIds, setManualObjIds] = useState<string[]>([]);
  const [manualActIds, setManualActIds] = useState<string[]>([]);

  // View / Edit Modal State
  const [editingAsset, setEditingAsset] = useState<V3TeachingAssetWithLinks | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContentText, setEditContentText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/plan/v3/${planId}/assets`);
      const resJson = await res.json();
      if (resJson.success) {
        setAssets(resJson.data || []);
        setRequirements(resJson.requirements || null);
        setReadiness(resJson.readiness || null);
      }
    } catch (err) {
      console.error('Failed to load teaching assets:', err);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Synchronize ungenerated assets for bulk checklist
  useEffect(() => {
    if (requirements) {
      const needed: string[] = [];
      requirements.required.forEach((r) => {
        if (!r.isAssessmentToolReuse && !assets.some((a) => a.asset_type.toUpperCase() === r.assetType.toUpperCase())) {
          needed.push(r.assetType);
        }
      });
      requirements.recommended.forEach((r) => {
        if (!assets.some((a) => a.asset_type.toUpperCase() === r.assetType.toUpperCase())) {
          needed.push(r.assetType);
        }
      });
      setSelectedAssetTypes(needed);
    }
  }, [requirements, assets]);

  // Sequential Bulk Generation (1 Asset = 1 Scoped Job, no cascade failure)
  const handleBulkGenerate = async () => {
    if (selectedAssetTypes.length === 0 || bulkGenerating) return;
    setBulkGenerating(true);
    setBulkErrors({});

    const allReqs = [
      ...(requirements?.required || []),
      ...(requirements?.recommended || []),
      ...(requirements?.optional || []),
    ];

    const itemsToGenerate = selectedAssetTypes
      .map((t) => allReqs.find((r) => r.assetType === t))
      .filter((r): r is V3TeachingAssetRequirementItem => !!r && !r.isAssessmentToolReuse);

    const errors: Record<string, string> = {};

    for (let i = 0; i < itemsToGenerate.length; i++) {
      const req = itemsToGenerate[i];
      setBulkProgress({
        current: i + 1,
        total: itemsToGenerate.length,
        currentName: req.labelTh,
      });

      try {
        const genRes = await fetch(`/api/plan/v3/${planId}/assets/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetType: req.assetType,
            activityId: activities[0]?.id,
          }),
        });

        const genJson = await genRes.json();
        if (!genJson.success) {
          errors[req.labelTh] = genJson.error || 'สร้างไม่สำเร็จ';
          continue;
        }

        const saveRes = await fetch(`/api/plan/v3/${planId}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: genJson.data.title || req.labelTh,
            asset_type: req.assetType,
            audience: req.audience,
            content: genJson.data.preview,
            generation_status: 'READY',
            needs_review: false,
            source: 'AI',
            activityIds: activities.length > 0 ? [activities[0].id] : [],
          }),
        });

        const saveJson = await saveRes.json();
        if (!saveJson.success) {
          errors[req.labelTh] = saveJson.error || 'บันทึกไม่สำเร็จ';
        }
      } catch (err: any) {
        errors[req.labelTh] = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
      }
    }

    setBulkErrors(errors);
    setBulkProgress(null);
    setBulkGenerating(false);
    await loadData();
  };

  // Precondition Check
  const hasActivities = activities.length > 0;
  const isAssessmentReady = readiness?.summary?.assessmentReady ?? true;
  const isPreconditionMet = hasActivities && isAssessmentReady;

  // Handle AI Generate Scoped Preview
  const handleOpenGenerate = (reqItem: V3TeachingAssetRequirementItem, existing?: V3TeachingAssetWithLinks) => {
    setGeneratingType(reqItem.assetType);
    setPreviewAssetType(reqItem.assetType);
    setPreviewAudience(reqItem.audience);
    setPreviewTitle(reqItem.labelTh);
    setExistingAssetForCompare(existing || null);
    setCompareTab('NEW');
    setPreviewData(null);
    setGenerateError(null);
    setUserPromptNotes('');
    setPreviewValidationErrors([]);
    // Select first matching activity if available
    if (activities.length > 0) {
      setSelectedActivityId(activities[0].id);
    }
  };

  const handleExecuteGenerate = async () => {
    if (!previewAssetType) return;
    try {
      setIsGenerating(true);
      setGenerateError(null);
      const res = await fetch(`/api/plan/v3/${planId}/assets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetType: previewAssetType,
          activityId: selectedActivityId || undefined,
          userPromptNotes: userPromptNotes.trim() || undefined,
        }),
      });

      const resJson = await res.json();
      if (!resJson.success) {
        setGenerateError(resJson.error || 'ยังสร้างสื่อนี้ไม่สำเร็จ ข้อมูลแผนของคุณยังอยู่ครบ');
        return;
      }

      setPreviewData(resJson.data.preview);
      if (resJson.data.title) {
        setPreviewTitle(resJson.data.title);
      }
      setPreviewValidationErrors(resJson.data.validationErrors || []);
    } catch (err: any) {
      setGenerateError(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Apply Preview to DB
  const handleApplyPreview = async () => {
    if (!previewData) return;
    try {
      setIsSavingAsset(true);
      const payload: any = {
        title: previewTitle,
        asset_type: previewAssetType,
        audience: previewAudience,
        content: previewData,
        generation_status: 'READY',
        needs_review: false,
        source: 'AI',
        activityIds: selectedActivityId ? [selectedActivityId] : [],
      };

      let res;
      if (existingAssetForCompare) {
        // Update existing asset
        res = await fetch(`/api/plan/v3/${planId}/assets/${existingAssetForCompare.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new asset
        res = await fetch(`/api/plan/v3/${planId}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const resJson = await res.json();
      if (resJson.success) {
        if (resJson.newStatus && onLessonStatusChange) {
          onLessonStatusChange(resJson.newStatus);
        }
        setGeneratingType(null);
        setPreviewData(null);
        await loadData();
      } else {
        alert(resJson.error || 'เกิดข้อผิดพลาดในการบันทึกสื่อการสอน');
      }
    } catch (err: any) {
      alert(`บันทึกไม่สำเร็จ: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingAsset(false);
    }
  };

  // Handle Manual Asset Save
  const handleSaveManualAsset = async () => {
    if (!manualTitle.trim()) return;
    try {
      setIsSavingAsset(true);
      const res = await fetch(`/api/plan/v3/${planId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          asset_type: manualType,
          audience: manualAudience,
          content: {
            title: manualTitle.trim(),
            description: manualDescription.trim(),
          },
          generation_status: 'READY',
          needs_review: false,
          source: 'MANUAL',
          objectiveIds: manualObjIds,
          activityIds: manualActIds,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        if (resJson.newStatus && onLessonStatusChange) {
          onLessonStatusChange(resJson.newStatus);
        }
        setIsManualModalOpen(false);
        setManualTitle('');
        setManualDescription('');
        setManualObjIds([]);
        setManualActIds([]);
        await loadData();
      } else {
        alert(resJson.error || 'ไม่สามารถบันทึกสื่อได้');
      }
    } catch (err: any) {
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsSavingAsset(false);
    }
  };

  // Handle Delete Asset
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('คุณต้องการลบสื่อการสอนนี้ใช่หรือไม่? (จุดประสงค์ กิจกรรม และการประเมินจะไม่ถูกลบ)')) {
      return;
    }
    try {
      const res = await fetch(`/api/plan/v3/${planId}/assets/${assetId}`, {
        method: 'DELETE',
      });
      const resJson = await res.json();
      if (resJson.success) {
        if (resJson.newStatus && onLessonStatusChange) {
          onLessonStatusChange(resJson.newStatus);
        }
        await loadData();
      } else {
        alert(resJson.error || 'ลบสื่อการสอนไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(`ลบไม่สำเร็จ: ${err.message}`);
    }
  };

  // Handle Stale Mark as Reviewed
  const handleMarkAsReviewed = async (asset: V3TeachingAssetWithLinks) => {
    try {
      const res = await fetch(`/api/plan/v3/${planId}/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needs_review: false }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        if (resJson.newStatus && onLessonStatusChange) {
          onLessonStatusChange(resJson.newStatus);
        }
        await loadData();
      }
    } catch (err) {
      console.error('Error marking as reviewed:', err);
    }
  };

  // Filter Assets by Audience
  const filteredAssets = assets.filter((a) => {
    if (audienceFilter === 'ALL') return true;
    if (audienceFilter === 'STUDENT') return a.audience === 'STUDENT' || a.audience === 'BOTH';
    if (audienceFilter === 'TEACHER') return a.audience === 'TEACHER' || a.audience === 'BOTH';
    return true;
  });

  if (loading) {
    return (
      <div className="v3-loading-screen">
        <div className="v3-spinner" />
        <p>กำลังเตรียมชุดพร้อมสอนสำหรับคาบนี้...</p>
      </div>
    );
  }

  // Precondition Guard Banner
  if (!isPreconditionMet) {
    return (
      <div className="v3-editor-section" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#991B1B', margin: '0 0 0.5rem' }}>
          ยังสร้างชุดพร้อมสอนไม่ได้
        </h2>
        <p style={{ color: '#4B5563', maxWidth: '500px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
          กรุณาตรวจการจัดกิจกรรมและการวัดและประเมินผลให้ครบถ้วนก่อน เพื่อให้ระบบวิเคราะห์สื่อและเอกสารที่จำเป็นจริงได้อย่างถูกต้อง
        </p>
        <button
          className="v3-btn v3-btn-primary"
          onClick={() => {
            if (onNavigateToStep) onNavigateToStep(4);
            else router.push(`/plan/v3/${planId}?step=4`);
          }}
        >
          ← ตรวจสอบการวัดและประเมินผล (ขั้นที่ 4)
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ─── Top Header & Package Readiness Summary ───────────────────────── */}
      <div
        className="v3-editor-section"
        style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📦</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1E3A8A' }}>
                ขั้นที่ 5 — ชุดพร้อมสอน (Teaching Package)
              </h2>
            </div>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
              วิเคราะห์และจัดเตรียมเฉพาะสื่อการสอนที่จำเป็นต่อแผนการเรียนรู้นี้ตามธรรมชาติวิชา
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                background: readiness?.ready ? '#DCFCE7' : '#FEF3C7',
                color: readiness?.ready ? '#166534' : '#92400E',
                border: `1px solid ${readiness?.ready ? '#86EFAC' : '#FCD34D'}`,
              }}
            >
              {readiness?.ready ? '✓ ชุดพร้อมสอนครบถ้วน (PACKAGE_READY)' : '○ ยังมีสื่อจำเป็นที่ต้องเตรียม'}
            </span>

            <button
              className="v3-btn v3-btn-ghost v3-btn-sm"
              onClick={() => setIsManualModalOpen(true)}
              title="เพิ่มสื่อหรือใบงานด้วยตนเอง"
            >
              + เพิ่มสื่อเอง
            </button>
          </div>
        </div>

        {/* Readiness Checklist */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid #DBEAFE',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>✓</span>
            <span>กิจกรรม 60 นาที ({activities.length} กิจกรรม)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>✓</span>
            <span>การวัดและประเมินผลครบถ้วน</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
            <span style={{ color: readiness?.summary.requiredAssetsComplete ? '#16A34A' : '#D97706', fontWeight: 700 }}>
              {readiness?.summary.requiredAssetsComplete ? '✓' : '⚠'}
            </span>
            <span>สื่อจำเป็น ({readiness?.requiredAssets.filter((r) => r.ready).length || 0}/{readiness?.requiredAssets.length || 0})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#334155' }}>
            <span style={{ color: (readiness?.assetsNeedReview.length || 0) === 0 ? '#16A34A' : '#DC2626', fontWeight: 700 }}>
              {(readiness?.assetsNeedReview.length || 0) === 0 ? '✓' : '⚠'}
            </span>
            <span>รายการต้องตรวจ ({readiness?.assetsNeedReview.length || 0})</span>
          </div>
        </div>
      </div>

      {/* ─── Guided Choice Checklist for Teaching Package ─────────────────── */}
      <div
        className="v3-editor-section"
        style={{
          background: '#FFFFFF',
          border: '1.5px solid #E0E7FF',
          borderRadius: '12px',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#312E81' }}>
              ✨ แนะนำสำหรับแผนนี้ (เลือกและสร้างชุดพร้อมสอน)
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              เลือกรายการที่ต้องการจัดเตรียม แล้วกดสร้างพร้อมกันได้ โดยระบบจะประมวลผลแยกรายชิ้นอย่างปลอดภัย
            </p>
          </div>

          <button
            className="v3-btn v3-btn-primary v3-btn-sm"
            onClick={handleBulkGenerate}
            disabled={bulkGenerating || selectedAssetTypes.length === 0}
            style={{ fontWeight: 600 }}
          >
            {bulkGenerating
              ? `กำลังสร้าง (${bulkProgress?.current || 0}/${bulkProgress?.total || 0})...`
              : `สร้างรายการที่เลือก (${selectedAssetTypes.length}) 🚀`}
          </button>
        </div>

        {bulkProgress && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#1E40AF' }}>
            ⏳ กำลังสร้าง: <strong>{bulkProgress.currentName}</strong> ({bulkProgress.current} จาก {bulkProgress.total} รายการ)...
          </div>
        )}

        {Object.keys(bulkErrors).length > 0 && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#991B1B' }}>
            ⚠️ มี {Object.keys(bulkErrors).length} รายการที่สร้างไม่สำเร็จ (รายการอื่นที่สำเร็จยังอยู่ครบ):
            <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem' }}>
              {Object.entries(bulkErrors).map(([name, err]) => (
                <li key={name}>{name}: {err}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
          {[
            ...(requirements?.required || []).map((r) => ({ ...r, badge: 'แนะนำ', isReq: true })),
            ...(requirements?.recommended || []).map((r) => ({ ...r, badge: 'ทางเลือก', isReq: false })),
          ].map((item) => {
            const isReady = assets.some((a) => a.asset_type.toUpperCase() === item.assetType.toUpperCase()) || item.isAssessmentToolReuse;
            const isChecked = selectedAssetTypes.includes(item.assetType);

            return (
              <label
                key={item.assetType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: isChecked ? '1.5px solid #818CF8' : '1px solid #E2E8F0',
                  background: isReady ? '#F0FDF4' : isChecked ? '#F5F7FF' : '#FAFAFA',
                  cursor: isReady ? 'default' : 'pointer',
                  opacity: isReady ? 0.85 : 1,
                }}
              >
                <input
                  type="checkbox"
                  disabled={isReady || bulkGenerating}
                  checked={isReady || isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAssetTypes([...selectedAssetTypes, item.assetType]);
                    } else {
                      setSelectedAssetTypes(selectedAssetTypes.filter((t) => t !== item.assetType));
                    }
                  }}
                  style={{ accentColor: '#4F46E5', width: '16px', height: '16px' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.labelTh}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: item.isReq ? '#FEE2E2' : '#E0E7FF', color: item.isReq ? '#991B1B' : '#3730A3', fontWeight: 600 }}>
                      {item.badge}
                    </span>
                    {isReady && (
                      <span style={{ fontSize: '0.65rem', padding: '0.05rem 0.35rem', borderRadius: '4px', background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>
                        ✓ พร้อมใช้
                      </span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ─── Audience Filter & Stats ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '8px' }}>
          {(['ALL', 'STUDENT', 'TEACHER'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setAudienceFilter(filter)}
              style={{
                border: 'none',
                background: audienceFilter === filter ? 'white' : 'transparent',
                color: audienceFilter === filter ? '#1E293B' : '#64748B',
                fontWeight: audienceFilter === filter ? 600 : 500,
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: audienceFilter === filter ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {filter === 'ALL' ? 'ทั้งหมด' : filter === 'STUDENT' ? '👨‍🎓 สำหรับนักเรียน' : '👩‍🏫 สำหรับครู'}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
          สื่อพร้อมใช้ในระบบ: <strong>{assets.length}</strong> รายการ
        </span>
      </div>

      {/* ─── 1. Required Teaching Assets Section ────────────────────────────── */}
      <div className="v3-editor-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '1rem' }}>●</span>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>
            สื่อและเอกสารที่จำเป็น (Required Assets)
          </h3>
          <span style={{ fontSize: '0.75rem', background: '#FEE2E2', color: '#991B1B', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
            {requirements?.required.length || 0} รายการ
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {requirements?.required.map((req, idx) => {
            const matchedAsset = assets.find(
              (a) =>
                a.asset_type.toUpperCase() === req.assetType.toUpperCase() ||
                (req.assetType === 'PROBLEM_SET' && (a.asset_type === 'PROBLEM_SET' || a.asset_type === 'WORKSHEET')) ||
                (req.assetType === 'WORKSHEET' && (a.asset_type === 'WORKSHEET' || a.asset_type === 'PROBLEM_SET'))
            );

            // Time warning check
            let durationWarning = '';
            if (matchedAsset && matchedAsset.content?.estimatedMinutes && activities.length > 0) {
              const actMinutes = activities[0]?.minutes || 15;
              const durCheck = validateAssetDuration(matchedAsset.content.estimatedMinutes, actMinutes);
              if (!durCheck.valid && durCheck.warning) {
                durationWarning = durCheck.warning;
              }
            }

            return (
              <div
                key={idx}
                style={{
                  border: matchedAsset ? '1px solid #CBD5E1' : '1px dashed #F87171',
                  borderRadius: '10px',
                  background: matchedAsset ? 'white' : '#FFF5F5',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: req.audience === 'STUDENT' ? '#E0F2FE' : '#FEF3C7',
                        color: req.audience === 'STUDENT' ? '#0369A1' : '#92400E',
                      }}
                    >
                      {req.audience === 'STUDENT' ? 'นักเรียน' : req.audience === 'TEACHER' ? 'ครู' : 'ทั้งสองฝ่าย'}
                    </span>

                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                      {matchedAsset ? matchedAsset.title : req.labelTh}
                    </h4>

                    {matchedAsset?.needs_review && (
                      <span style={{ fontSize: '0.7rem', background: '#FEF3C7', color: '#B45309', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                        ⚠ ต้องตรวจสอบอีกครั้ง
                      </span>
                    )}

                    {req.isAssessmentToolReuse && (
                      <span style={{ fontSize: '0.7rem', background: '#F3E8FF', color: '#6B21A8', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                        อ้างอิงเครื่องมือขั้นที่ 4 ✓
                      </span>
                    )}
                  </div>

                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    {req.rationale}
                  </p>

                  {durationWarning && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#B45309', background: '#FFFBEB', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                      {durationWarning}
                    </div>
                  )}

                  {matchedAsset?.needs_review && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#B45309' }}>แผนมีการเปลี่ยนแปลง สื่อนี้ควรตรวจสอบอีกครั้ง</span>
                      <button
                        className="v3-btn v3-btn-ghost v3-btn-xs"
                        onClick={() => handleMarkAsReviewed(matchedAsset)}
                      >
                        ✓ ตรวจทานแล้ว
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {matchedAsset ? (
                    <>
                      <button
                        className="v3-btn v3-btn-ghost v3-btn-sm"
                        onClick={() => {
                          setEditingAsset(matchedAsset);
                          setEditTitle(matchedAsset.title);
                          setEditContentText(JSON.stringify(matchedAsset.content, null, 2));
                        }}
                      >
                        👁️ เปิดดู / แก้ไข
                      </button>
                      {!req.isAssessmentToolReuse && (
                        <button
                          className="v3-btn v3-btn-ghost v3-btn-sm"
                          onClick={() => handleOpenGenerate(req, matchedAsset)}
                          title="สร้างแนวทางเลือกใหม่โดยไม่ทับของเดิม"
                        >
                          ✨ ขอแนวทางใหม่
                        </button>
                      )}
                      <button
                        className="v3-btn v3-btn-ghost v3-btn-sm"
                        style={{ color: '#DC2626' }}
                        onClick={() => handleDeleteAsset(matchedAsset.id)}
                      >
                        🗑️
                      </button>
                    </>
                  ) : req.isAssessmentToolReuse ? (
                    <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                      ✓ เครื่องมือในขั้นที่ 4 พร้อมใช้
                    </span>
                  ) : (
                    <button
                      className="v3-btn v3-btn-primary v3-btn-sm"
                      onClick={() => handleOpenGenerate(req)}
                    >
                      ✨ สร้างด้วย AI
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 2. Recommended Teaching Assets Section ─────────────────────────── */}
      {requirements?.recommended && requirements.recommended.length > 0 && (
        <div className="v3-editor-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '1rem' }}>●</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1E293B' }}>
              สื่อที่แนะนำเพิ่มเติม (Recommended)
            </h3>
            <span style={{ fontSize: '0.75rem', background: '#DBEAFE', color: '#1E40AF', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
              {requirements.recommended.length} รายการ
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {requirements.recommended.map((req, idx) => {
              const matchedAsset = assets.find((a) => a.asset_type.toUpperCase() === req.assetType.toUpperCase());
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    background: 'white',
                    padding: '0.875rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#F1F5F9', color: '#475569' }}>
                        {req.audience === 'STUDENT' ? 'นักเรียน' : req.audience === 'TEACHER' ? 'ครู' : 'ทั้งสองฝ่าย'}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>
                        {matchedAsset ? matchedAsset.title : req.labelTh}
                      </h4>
                      {matchedAsset && (
                        <span style={{ fontSize: '0.7rem', background: '#DCFCE7', color: '#166534', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                          ✓ พร้อมใช้
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                      {req.rationale}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {matchedAsset ? (
                      <>
                        <button
                          className="v3-btn v3-btn-ghost v3-btn-xs"
                          onClick={() => {
                            setEditingAsset(matchedAsset);
                            setEditTitle(matchedAsset.title);
                            setEditContentText(JSON.stringify(matchedAsset.content, null, 2));
                          }}
                        >
                          เปิดดู
                        </button>
                        <button
                          className="v3-btn v3-btn-ghost v3-btn-xs"
                          style={{ color: '#DC2626' }}
                          onClick={() => handleDeleteAsset(matchedAsset.id)}
                        >
                          ลบ
                        </button>
                      </>
                    ) : (
                      <button
                        className="v3-btn v3-btn-ghost v3-btn-xs"
                        style={{ border: '1px solid #93C5FD', color: '#1D4ED8' }}
                        onClick={() => handleOpenGenerate(req)}
                      >
                        + สร้างสื่อนี้
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. Optional Teaching Assets Section ───────────────────────────── */}
      {requirements?.optional && requirements.optional.length > 0 && (
        <div className="v3-editor-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ color: '#64748B', fontWeight: 700, fontSize: '1rem' }}>○</span>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#475569' }}>
              สื่อทางเลือกเพิ่มเติม (Optional)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {requirements.optional.map((req, idx) => {
              const matchedAsset = assets.find((a) => a.asset_type.toUpperCase() === req.assetType.toUpperCase());
              return (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #F1F5F9',
                    borderRadius: '8px',
                    background: '#FAFAFA',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: '#334155' }}>{matchedAsset ? matchedAsset.title : req.labelTh}</span>
                  {matchedAsset ? (
                    <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600 }}>✓ พร้อมใช้</span>
                  ) : (
                    <button
                      className="v3-btn v3-btn-ghost v3-btn-xs"
                      onClick={() => handleOpenGenerate(req)}
                    >
                      + สร้าง
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Modal: Scoped AI Generation & Preview ──────────────────────────── */}
      {generatingType && (
        <div className="v3-modal-overlay">
          <div className="v3-modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>
                ✨ ออกแบบสื่อ: {previewTitle || generatingType}
              </h3>
              <button
                className="v3-icon-btn"
                onClick={() => setGeneratingType(null)}
                title="ปิด"
              >
                ✕
              </button>
            </div>

            {/* Existing vs Alternative tabs if regenerating */}
            {existingAssetForCompare && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                <button
                  className={`v3-btn v3-btn-xs ${compareTab === 'NEW' ? 'v3-btn-primary' : 'v3-btn-ghost'}`}
                  onClick={() => setCompareTab('NEW')}
                >
                  ✨ แนวทางใหม่ (Alternative)
                </button>
                <button
                  className={`v3-btn v3-btn-xs ${compareTab === 'EXISTING' ? 'v3-btn-primary' : 'v3-btn-ghost'}`}
                  onClick={() => setCompareTab('EXISTING')}
                >
                  📄 สื่อปัจจุบัน (Existing)
                </button>
              </div>
            )}

            {/* Generation Parameters */}
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="v3-form-label">ใช้กับกิจกรรม</label>
                  <select
                    className="v3-select"
                    value={selectedActivityId}
                    onChange={(e) => setSelectedActivityId(e.target.value)}
                  >
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        ขั้นที่ {a.position} ({a.phase}) {a.title || ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="v3-form-label">กลุ่มเป้าหมาย</label>
                  <select
                    className="v3-select"
                    value={previewAudience}
                    onChange={(e) => setPreviewAudience(e.target.value as V3AudienceType)}
                  >
                    <option value="STUDENT">👨‍🎓 นักเรียน (Student)</option>
                    <option value="TEACHER">👩‍🏫 ครูผู้สอน (Teacher)</option>
                    <option value="BOTH">👥 ทั้งสองฝ่าย (Both)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="v3-form-label">คำขอหรือบริบทเพิ่มเติม (Optional)</label>
                <input
                  className="v3-input"
                  value={userPromptNotes}
                  onChange={(e) => setUserPromptNotes(e.target.value)}
                  placeholder="เช่น เน้นสถานการณ์สัมภาษณ์งาน, มีคำศัพท์คำว่า..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  className="v3-btn v3-btn-primary v3-btn-sm"
                  onClick={handleExecuteGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'กำลังออกแบบด้วย AI...' : '🚀 สั่งสร้างเนื้อหา Preview'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {generateError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FEE2E2', border: '1px solid #F87171', borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem' }}>
                ⚠️ {generateError}
              </div>
            )}

            {/* Validation Warnings */}
            {previewValidationErrors.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', color: '#92400E', fontSize: '0.85rem' }}>
                <strong>ข้อสังเกตโครงสร้างข้อมูล:</strong>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
                  {previewValidationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Body */}
            {previewData && compareTab === 'NEW' && (
              <div style={{ marginTop: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                    📋 ตัวอย่างสื่อ (Preview): {previewTitle}
                  </h4>
                  {previewData.estimatedMinutes && (
                    <span style={{ fontSize: '0.75rem', background: '#EEF2FF', color: '#4F46E5', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                      ⏱️ {previewData.estimatedMinutes} นาที
                    </span>
                  )}
                </div>

                {previewData.instruction && (
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
                    คำชี้แจง: {previewData.instruction}
                  </p>
                )}

                {/* Structured render by type */}
                {previewData.cards && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {previewData.cards.map((c: any, i: number) => (
                      <div key={i} style={{ border: '1px solid #CBD5E1', borderRadius: '6px', background: 'white', padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600, color: '#0369A1', fontSize: '0.85rem' }}>{c.assignedTo} ({c.roleTitle || c.cardId})</div>
                        <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.25rem' }}><strong>สถานการณ์:</strong> {c.situation}</div>
                        {c.cuesOrClues && (
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                            <strong>ประเด็นคำถาม/ข้อมูล:</strong> {Array.isArray(c.cuesOrClues) ? c.cuesOrClues.join(' | ') : c.cuesOrClues}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {previewData.sections && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {previewData.sections.map((sec: any, sI: number) => (
                      <div key={sI} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white', padding: '0.75rem' }}>
                        <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.85rem' }}>{sec.title}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                          {(sec.items || []).map((it: any, iI: number) => (
                            <div key={iI} style={{ fontSize: '0.8rem', color: '#334155', paddingLeft: '0.5rem', borderLeft: '2px solid #818CF8' }}>
                              <span>{it.itemNumber || iI + 1}. {it.prompt}</span>
                              {it.answerSpace && <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>[{it.answerSpace}]</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {previewData.dataTable && (
                  <div style={{ marginTop: '0.5rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9' }}>
                          {(previewData.dataTable.columns || []).map((col: string, idx: number) => (
                            <th key={idx} style={{ border: '1px solid #CBD5E1', padding: '0.4rem', textAlign: 'left' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(previewData.dataTable.initialRows || []).map((row: string[], rIdx: number) => (
                          <tr key={rIdx}>
                            {row.map((cell: string, cIdx: number) => (
                              <td key={cIdx} style={{ border: '1px solid #CBD5E1', padding: '0.4rem' }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {previewData.timeline && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {previewData.timeline.map((tl: any, idx: number) => (
                      <div key={idx} style={{ border: '1px solid #E2E8F0', borderRadius: '6px', background: 'white', padding: '0.6rem 0.75rem', fontSize: '0.8rem' }}>
                        <strong>{tl.phaseName} ({tl.timeRange}):</strong>
                        <div style={{ color: '#475569', marginTop: '0.2rem' }}>สิ่งที่ครูทำ: {(tl.teacherActions || []).join(', ')}</div>
                        <div style={{ color: '#059669', marginTop: '0.2rem' }}>สิ่งที่นักเรียนทำ: {(tl.studentActions || []).join(', ')}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Raw JSON viewer toggle */}
                <details style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748B' }}>
                  <summary style={{ cursor: 'pointer' }}>ดูโครงสร้าง JSON ดิบ</summary>
                  <pre style={{ background: '#1E293B', color: '#E2E8F0', padding: '0.75rem', borderRadius: '6px', overflowX: 'auto', marginTop: '0.4rem' }}>
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            {/* Compare: Existing Asset View */}
            {existingAssetForCompare && compareTab === 'EXISTING' && (
              <div style={{ marginTop: '1.25rem', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem', background: '#FAFAFA' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 700, color: '#475569' }}>
                  📄 สื่อปัจจุบัน: {existingAssetForCompare.title}
                </h4>
                <pre style={{ background: '#1E293B', color: '#E2E8F0', padding: '0.75rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.75rem' }}>
                  {JSON.stringify(existingAssetForCompare.content, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => setGeneratingType(null)}
              >
                ยกเลิก
              </button>
              {previewData && (
                <button
                  className="v3-btn v3-btn-primary"
                  onClick={handleApplyPreview}
                  disabled={isSavingAsset}
                >
                  {isSavingAsset ? 'กำลังนำไปใช้...' : '✓ บันทึกและนำไปใช้ (Apply)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Manual Asset Form ───────────────────────────────────────── */}
      {isManualModalOpen && (
        <div className="v3-modal-overlay">
          <div className="v3-modal-content" style={{ maxWidth: '580px' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>
              + เพิ่มสื่อ/ใบงานด้วยตนเอง
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="v3-form-label">ชื่อสื่อการสอน *</label>
                <input
                  className="v3-input"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="เช่น ใบงานคำศัพท์อาชีพ, การทดลองแรงเสียดทาน"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="v3-form-label">ประเภทสื่อ</label>
                  <select
                    className="v3-select"
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                  >
                    <option value="WORKSHEET">ใบงาน (Worksheet)</option>
                    <option value="SPEAKING_CARD">บัตรสนทนา (Speaking Card)</option>
                    <option value="PROBLEM_SET">ชุดโจทย์ปัญหา (Problem Set)</option>
                    <option value="EXPERIMENT_SHEET">ใบการทดลอง (Experiment)</option>
                    <option value="TASK_CARD">บัตรภารกิจ (Task Card)</option>
                    <option value="EXIT_TICKET">Exit Ticket</option>
                    <option value="TEACHER_GUIDE">คู่มือครู (Teacher Guide)</option>
                    <option value="OTHER">อื่นๆ (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="v3-form-label">ผู้ใช้งาน</label>
                  <select
                    className="v3-select"
                    value={manualAudience}
                    onChange={(e) => setManualAudience(e.target.value as V3AudienceType)}
                  >
                    <option value="STUDENT">👨‍🎓 นักเรียน</option>
                    <option value="TEACHER">👩‍🏫 ครู</option>
                    <option value="BOTH">👥 ทั้งสองฝ่าย</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="v3-form-label">รายละเอียด / คำสั่งการจัดการเรียนรู้</label>
                <textarea
                  className="v3-textarea"
                  rows={4}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="ระบุคำสั่ง คำถาม หรือแนวทางการนำไปใช้งานในชั้นเรียน..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => setIsManualModalOpen(false)}
              >
                ยกเลิก
              </button>
              <button
                className="v3-btn v3-btn-primary"
                onClick={handleSaveManualAsset}
                disabled={!manualTitle.trim() || isSavingAsset}
              >
                {isSavingAsset ? 'กำลังบันทึก...' : 'บันทึกสื่อ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: View / Edit Asset ───────────────────────────────────────── */}
      {editingAsset && (
        <div className="v3-modal-overlay">
          <div className="v3-modal-content" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>
              ✏️ แก้ไขสื่อการสอน: {editingAsset.title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="v3-form-label">ชื่อสื่อการสอน</label>
                <input
                  className="v3-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="v3-form-label">เนื้อหา JSON ของสื่อ</label>
                <textarea
                  className="v3-textarea"
                  rows={10}
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  value={editContentText}
                  onChange={(e) => setEditContentText(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                className="v3-btn v3-btn-ghost"
                onClick={() => setEditingAsset(null)}
              >
                ยกเลิก
              </button>
              <button
                className="v3-btn v3-btn-primary"
                disabled={isSavingEdit}
                onClick={async () => {
                  try {
                    setIsSavingEdit(true);
                    let parsedContent = editingAsset.content;
                    try {
                      parsedContent = JSON.parse(editContentText);
                    } catch (pErr) {
                      alert('เนื้อหา JSON ไม่ถูกต้อง กรุณาตรวจสอบวงเล็บและเครื่องหมายคำพูด');
                      setIsSavingEdit(false);
                      return;
                    }

                    const res = await fetch(`/api/plan/v3/${planId}/assets/${editingAsset.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: editTitle.trim(),
                        content: parsedContent,
                        needs_review: false,
                      }),
                    });

                    const resJson = await res.json();
                    if (resJson.success) {
                      if (resJson.newStatus && onLessonStatusChange) {
                        onLessonStatusChange(resJson.newStatus);
                      }
                      setEditingAsset(null);
                      await loadData();
                    } else {
                      alert(resJson.error || 'บันทึกไม่สำเร็จ');
                    }
                  } catch (err: any) {
                    alert(`บันทึกไม่สำเร็จ: ${err.message}`);
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
              >
                {isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Bottom Navigation ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
        <button
          className="v3-btn v3-btn-ghost"
          onClick={() => {
            if (onNavigateToStep) onNavigateToStep(4);
            else router.push(`/plan/v3/${planId}?step=4`);
          }}
        >
          ← ย้อนกลับไปขั้นที่ 4 (ประเมินผล)
        </button>

        <button
          className="v3-btn v3-btn-primary"
          disabled={!readiness?.ready}
          onClick={() => {
            if (onNavigateToStep) onNavigateToStep(6);
            else router.push(`/plan/v3/${planId}?step=6`);
          }}
          title={!readiness?.ready ? 'กรุณาเตรียมสื่อจำเป็นให้ครบก่อน' : 'ไปต่อขั้นตรวจคุณภาพ'}
        >
          {readiness?.ready ? 'ไปขั้นที่ 6 — ตรวจคุณภาพ (Quality Review) →' : 'กรุณาเตรียมสื่อจำเป็นให้ครบก่อน'}
        </button>
      </div>

      <style jsx>{`
        .v3-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .v3-modal-content {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          width: 100%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .v3-form-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
