'use client';

import React from 'react';
import { BookOpen, Award, Users } from 'lucide-react';

export type EvaluationMode = 'lesson_plan_basic' | 'wpa_w9' | 'committee_4d';

export const EVALUATION_MODE_OPTIONS: {
  value: EvaluationMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: 'lesson_plan_basic',
    label: 'ตรวจแผนทั่วไป',
    description: 'ตรวจความครบถ้วน ความสอดคล้อง และความพร้อมใช้ในชั้นเรียน',
    icon: <BookOpen size={20} />,
    color: 'from-blue-500 to-blue-600',
  },
  {
    value: 'wpa_w9',
    label: 'ตรวจ วPA / ว9',
    description: 'ตรวจหลักฐานเชิงประจักษ์และความพร้อมด้านวิทยฐานะ',
    icon: <Award size={20} />,
    color: 'from-purple-500 to-purple-600',
  },
  {
    value: 'committee_4d',
    label: 'กรรมการ 4 มิติ',
    description: 'ตรวจในมิติหลักสูตร การออกแบบ การประเมิน และ วPA/ว9',
    icon: <Users size={20} />,
    color: 'from-emerald-500 to-emerald-600',
  },
];

interface Props {
  value: EvaluationMode;
  onChange: (mode: EvaluationMode) => void;
  disabled?: boolean;
}

export default function EvaluationModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="evaluation-mode-selector">
      <p className="mode-label-header">โหมดการประเมิน</p>
      <div className="mode-grid">
        {EVALUATION_MODE_OPTIONS.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className={`mode-card ${isSelected ? 'mode-card--selected' : ''}`}
              style={{
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))'
                  : 'rgba(255,255,255,0.04)',
                border: isSelected
                  ? '1.5px solid rgba(139,92,246,0.7)'
                  : '1.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                textAlign: 'left',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{
                  background: isSelected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '4px 6px',
                  color: isSelected ? '#a78bfa' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {opt.icon}
                </span>
                <span style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: isSelected ? '#e2e8f0' : '#94a3b8',
                }}>
                  {opt.label}
                </span>
                {isSelected && (
                  <span style={{
                    marginLeft: 'auto',
                    background: 'rgba(139,92,246,0.3)',
                    color: '#a78bfa',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                  }}>
                    เลือกอยู่
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
