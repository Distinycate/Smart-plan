'use client';

import React from 'react';
import { CheckCircle, AlertTriangle, Loader2, Circle, XCircle } from 'lucide-react';

export interface SectionStatus {
  id: string;
  label?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'failed_rate_limited';
}

interface Props {
  progress: number;          // 0-100
  currentSection?: string;
  sections: SectionStatus[];
  isProcessing: boolean;
  loadingText?: string;
}

const statusIcon = (status: SectionStatus['status']) => {
  if (status === 'completed') return <CheckCircle size={14} color="#34d399" />;
  if (status === 'failed' || status === 'failed_rate_limited') return <XCircle size={14} color="#f87171" />;
  if (status === 'processing') return <Loader2 size={14} color="#818cf8" className="spin" />;
  return <Circle size={14} color="#475569" />;
};

export default function EvaluationProgressPanel({
  progress,
  currentSection,
  sections,
  isProcessing,
  loadingText,
}: Props) {
  const completed = sections.filter(s => s.status === 'completed').length;
  const failed = sections.filter(s => s.status === 'failed' || s.status === 'failed_rate_limited').length;

  return (
    <div style={{
      background: 'rgba(15,23,42,0.8)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 16,
      padding: '20px 24px',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {isProcessing && <Loader2 size={18} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />}
        <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>
          {isProcessing ? 'กำลังประเมิน...' : progress >= 100 ? 'ประเมินเสร็จสมบูรณ์' : 'สถานะการประเมิน'}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 22,
          fontWeight: 800,
          color: progress >= 80 ? '#34d399' : progress >= 50 ? '#fbbf24' : '#818cf8',
        }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 8,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 100,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: 100,
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12 }}>
        <span style={{ color: '#34d399' }}>✓ {completed} เสร็จ</span>
        {failed > 0 && <span style={{ color: '#f87171' }}>✗ {failed} ล้มเหลว</span>}
        <span style={{ color: '#64748b' }}>{sections.length} sections ทั้งหมด</span>
        {currentSection && (
          <span style={{ color: '#818cf8', marginLeft: 'auto' }}>
            กำลังทำ: <strong>{currentSection}</strong>
          </span>
        )}
      </div>

      {/* Section chips */}
      {sections.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {sections.map(section => (
            <div
              key={section.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                background: section.status === 'completed'
                  ? 'rgba(52,211,153,0.12)'
                  : section.status === 'failed'
                  ? 'rgba(248,113,113,0.12)'
                  : section.status === 'processing'
                  ? 'rgba(129,140,248,0.18)'
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${
                  section.status === 'completed' ? 'rgba(52,211,153,0.3)'
                  : section.status === 'failed' ? 'rgba(248,113,113,0.3)'
                  : section.status === 'processing' ? 'rgba(129,140,248,0.4)'
                  : 'rgba(255,255,255,0.08)'
                }`,
                fontSize: 11,
                color: section.status === 'completed' ? '#6ee7b7'
                  : section.status === 'failed' ? '#fca5a5'
                  : section.status === 'processing' ? '#a5b4fc'
                  : '#64748b',
              }}
            >
              {statusIcon(section.status)}
              {section.label ?? section.id}
            </div>
          ))}
        </div>
      )}

      {loadingText && isProcessing && (
        <p style={{ marginTop: 10, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
          {loadingText}
        </p>
      )}

      {/* Global spin keyframe */}
      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
