'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { V3LessonPlan } from '@/lib/smartPlanV3/types';
import { getStatusLabel, getSubjectLabel, formatDuration } from '@/lib/smartPlanV3/labels';

function SkeletonRow() {
  return (
    <div className="v3-plan-row skeleton">
      <div className="skeleton-line w-40 h-5" />
      <div className="skeleton-line w-24 h-4" />
      <div className="skeleton-line w-16 h-4" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="v3-empty-state">
      <div className="v3-empty-icon">📋</div>
      <h2>ยังไม่มีแผนการสอน V3</h2>
      <p>เริ่มต้นสร้างแผนการสอนแรกของคุณได้เลย</p>
      <Link href="/plan/v3/new" className="v3-btn v3-btn-primary">
        + สร้างแผนการสอนใหม่
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

  return (
    <Link href={`/plan/v3/${plan.id}`} className="v3-plan-card">
      <div className="v3-plan-card-header">
        <h3 className="v3-plan-title">{plan.topic || plan.title}</h3>
        <span className={`v3-badge v3-status-${plan.status.toLowerCase()}`}>{statusLabel}</span>
      </div>
      <div className="v3-plan-meta">
        <span className="v3-meta-item">
          <span className="v3-meta-icon">📚</span>
          {subjectLabel}
        </span>
        <span className="v3-meta-item">
          <span className="v3-meta-icon">🎓</span>
          {plan.grade_level}
        </span>
        <span className="v3-meta-item">
          <span className="v3-meta-icon">⏱</span>
          {formatDuration(plan.duration_minutes)}
        </span>
        {plan.learning_focus && (
          <span className="v3-meta-item v3-meta-focus">
            <span className="v3-meta-icon">🎯</span>
            {plan.learning_focus}
          </span>
        )}
      </div>
      <div className="v3-plan-footer">
        <span className="v3-plan-updated">แก้ไขล่าสุด: {updatedAt}</span>
        <span className="v3-plan-action">เปิดแผน →</span>
      </div>
    </Link>
  );
}

export default function V3HubPage() {
  const [plans, setPlans] = useState<V3LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/plan/v3')
      .then(r => r.json())
      .then(res => {
        if (res.success) setPlans(res.data || []);
        else setError(res.error || 'ไม่สามารถโหลดข้อมูลได้');
      })
      .catch(() => setError('เกิดข้อผิดพลาดในการเชื่อมต่อ'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="v3-hub-page">
      <div className="v3-hub-header">
        <div className="v3-hub-title-row">
          <div>
            <h1 className="v3-page-title">แผนการสอน V3</h1>
            <p className="v3-page-subtitle">PA-Ready Teaching Package Builder</p>
          </div>
          <Link href="/plan/v3/new" className="v3-btn v3-btn-primary v3-btn-lg">
            <span>+</span> สร้างแผนการสอนใหม่
          </Link>
        </div>
      </div>

      <div className="v3-hub-body">
        {loading && (
          <div className="v3-plan-list">
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="v3-alert v3-alert-error">
            <strong>ไม่สามารถโหลดข้อมูลได้:</strong> {error}
          </div>
        )}

        {!loading && !error && plans.length === 0 && <EmptyState />}

        {!loading && !error && plans.length > 0 && (
          <div className="v3-plan-grid">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .v3-hub-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          font-family: 'Noto Sans Thai', sans-serif;
        }
        .v3-hub-header {
          margin-bottom: 2rem;
        }
        .v3-hub-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .v3-page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }
        .v3-page-subtitle {
          color: #718096;
          margin: 0.25rem 0 0;
          font-size: 0.9rem;
        }
        .v3-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          border: none;
          font-size: 0.9rem;
          transition: all 0.15s;
        }
        .v3-btn-primary {
          background: #4F46E5;
          color: white;
        }
        .v3-btn-primary:hover { background: #4338CA; }
        .v3-btn-lg { padding: 0.65rem 1.25rem; font-size: 1rem; }
        .v3-plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
        .v3-plan-card {
          display: block;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .v3-plan-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border-color: #c3cfee;
        }
        .v3-plan-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .v3-plan-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0;
          line-height: 1.4;
        }
        .v3-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 20px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .v3-status-draft { background: #EEF2FF; color: #4F46E5; }
        .v3-status-blueprint_ready { background: #FEF3C7; color: #B45309; }
        .v3-status-final { background: #D1FAE5; color: #065F46; }
        .v3-status-taught { background: #E0E7FF; color: #3730A3; }
        .v3-plan-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .v3-meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: #718096;
          background: #F7FAFC;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }
        .v3-meta-icon { font-size: 0.75rem; }
        .v3-meta-focus { background: #EBF4FF; color: #2B6CB0; }
        .v3-plan-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #A0AEC0;
          border-top: 1px solid #F7FAFC;
          padding-top: 0.75rem;
          margin-top: 0.25rem;
        }
        .v3-plan-action { color: #4F46E5; font-weight: 600; }
        .v3-empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #718096;
        }
        .v3-empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .v3-empty-state h2 { font-size: 1.25rem; color: #2D3748; margin-bottom: 0.5rem; }
        .v3-empty-state p { margin-bottom: 1.5rem; }
        .v3-alert { padding: 1rem 1.25rem; border-radius: 8px; }
        .v3-alert-error { background: #FFF5F5; color: #C53030; border: 1px solid #FED7D7; }
        .skeleton-line { background: #EDF2F7; border-radius: 4px; animation: pulse 1.5s infinite; }
        .w-40 { width: 10rem; }
        .w-24 { width: 6rem; }
        .w-16 { width: 4rem; }
        .h-5 { height: 1.25rem; }
        .h-4 { height: 1rem; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </div>
  );
}
