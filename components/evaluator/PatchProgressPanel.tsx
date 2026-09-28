'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Sparkles, RefreshCw } from 'lucide-react';

interface Props {
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  stepsCount: number;
  errorMessage?: string | null;
  reviewRequired?: boolean;
  proposals?: Array<{
    id: string;
    target_section: string;
    severity?: string | null;
    before_content?: unknown;
    after_content?: unknown;
    reason?: string | null;
    applied?: boolean;
  }>;
  onRetry?: () => void;
}

const STEP_LABELS: Record<string, string> = {
  objectives_kpa: 'ปรับปรุงจุดประสงค์การเรียนรู้ (KPA)',
  learning_activities: 'ปรับปรุงกระบวนการจัดการเรียนรู้',
  assessment_quality: 'ปรับปรุงการวัดและประเมินผล',
  curriculum_alignment: 'ปรับปรุงความสอดคล้องหลักสูตร',
  active_learning: 'ปรับปรุงกิจกรรม Active Learning',
  constructive_alignment: 'ปรับปรุงความสอดคล้องเชิงโครงสร้าง',
};

export default function PatchProgressPanel({
  progress,
  status,
  currentStep,
  completedSteps,
  failedSteps,
  skippedSteps,
  stepsCount,
  errorMessage,
  reviewRequired = false,
  proposals = [],
  onRetry,
}: Props) {
  const getStepLabel = (step: string) => STEP_LABELS[step] ?? `ปรับปรุงส่วน ${step}`;
  const previewValue = (value: unknown) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    return text.length > 700 ? `${text.slice(0, 700)}…` : text;
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '2rem',
      padding: '24px md:32px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      color: '#f8fafc',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          background: 'rgba(236, 72, 153, 0.15)',
          borderRadius: 12,
          padding: 8,
          color: '#f472b6',
        }}>
          <Sparkles size={22} className="animate-pulse" />
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>
            Smart Auto-Fix Pipeline
          </h3>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0' }}>
            AI สร้างข้อเสนอทีละส่วน โดยแผนต้นฉบับจะไม่ถูกแก้ไขจนกว่าครูอนุมัติ
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f472b6' }}>
            {status === 'completed'
              ? reviewRequired ? 'ข้อเสนอพร้อมให้ครูตรวจทาน' : 'สร้างข้อเสนอเสร็จสมบูรณ์'
              : status === 'failed' ? 'การสร้างข้อเสนอหยุดชะงัก' : 'กำลังสร้างข้อเสนอ...'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginLeft: 'auto' }}>
            {progress}% ({completedSteps.length + skippedSteps.length + failedSteps.length}/{stepsCount} ขั้นตอน)
          </span>
        </div>
        <div style={{
          width: '100%',
          height: 8,
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: status === 'failed' 
              ? 'linear-gradient(90deg, #f87171, #ef4444)'
              : 'linear-gradient(90deg, #ec4899, #f43f5e)',
            width: `${progress}%`,
            transition: 'width 0.4s ease-out',
          }} />
        </div>
      </div>

      {/* Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {currentStep && status === 'processing' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(236, 72, 153, 0.06)',
            border: '1px dashed rgba(236, 72, 153, 0.3)',
            borderRadius: 12,
            padding: '10px 14px',
          }}>
            <Loader2 size={16} className="animate-spin text-pink-400" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f472b6' }}>
              กำลังดำเนินการ: {getStepLabel(currentStep)}
            </span>
          </div>
        )}

        {/* Completed Steps */}
        {completedSteps.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px' }}>
            <CheckCircle2 size={16} color="#34d399" />
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>{getStepLabel(step)}</span>
            <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginLeft: 'auto' }}>สร้างข้อเสนอแล้ว</span>
          </div>
        ))}

        {/* Skipped Steps */}
        {skippedSteps.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px' }}>
            <AlertTriangle size={16} color="#fbbf24" />
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>{getStepLabel(step)}</span>
            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginLeft: 'auto' }}>AI ปรับอัตโนมัติไม่ได้ (ข้าม)</span>
          </div>
        ))}

        {/* Failed Steps */}
        {failedSteps.map((step) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 8px' }}>
            <XCircle size={16} color="#f87171" />
            <span style={{ fontSize: 13, color: '#f87171' }}>{getStepLabel(step)}</span>
            <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, marginLeft: 'auto' }}>ล้มเหลว</span>
          </div>
        ))}
      </div>

      {/* Error Message & Retry */}
      {status === 'failed' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 16,
          padding: 16,
          marginTop: 16,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>
            พบข้อผิดพลาดในการรัน Auto-Fix:
          </p>
          <p style={{ margin: '4px 0 12px 0', fontSize: 12, color: '#cbd5e1' }}>
            {errorMessage || 'เกิดข้อผิดพลาดในการประมวลผลขั้นตอน'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              <RefreshCw size={13} />
              เริ่มต้นใหม่ในขั้นตอนที่ล้มเหลว
            </button>
          )}
        </div>
      )}

      {reviewRequired && (
        <div style={{
          marginTop: 20,
          borderRadius: 16,
          border: '1px solid rgba(251, 191, 36, 0.35)',
          background: 'rgba(251, 191, 36, 0.08)',
          padding: 16,
        }}>
          <p style={{ margin: 0, color: '#fde68a', fontSize: 13, fontWeight: 800 }}>
            รอการตัดสินใจของครู — AI ยังไม่ได้แก้ไขแผนต้นฉบับ
          </p>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: 12 }}>
            ตรวจความแตกต่างด้านล่างก่อนเลือกใช้ข้อเสนอในขั้นตอน Teacher Review
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {proposals.map(proposal => (
              <article key={proposal.id} style={{ borderRadius: 12, background: 'rgba(15, 23, 42, 0.6)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: '#f8fafc', fontSize: 13 }}>{getStepLabel(proposal.target_section)}</strong>
                  {proposal.severity && <span style={{ color: '#fbbf24', fontSize: 11 }}>{proposal.severity}</span>}
                </div>
                {proposal.reason && <p style={{ margin: '6px 0', color: '#cbd5e1', fontSize: 12 }}>{proposal.reason}</p>}
                <div style={{ display: 'grid', gap: 8 }}>
                  <Preview label="เดิม" value={previewValue(proposal.before_content)} color="#fca5a5" />
                  <Preview label="ข้อเสนอ AI" value={previewValue(proposal.after_content)} color="#86efac" />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Preview({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p style={{ margin: 0, color, fontSize: 11, fontWeight: 800 }}>{label}</p>
      <pre style={{ margin: '3px 0 0', color: '#e2e8f0', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit' }}>{value || '-'}</pre>
    </div>
  );
}
