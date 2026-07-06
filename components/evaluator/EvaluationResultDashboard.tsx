'use client';

import React, { useState } from 'react';
import {
  Trophy, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Lightbulb, Shield, Search, ArrowUp,
} from 'lucide-react';

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue_type: string;
  title: string;
  description: string;
  suggestion: string;
  auto_fixable: boolean;
}

interface SectionResult {
  section: string;
  score: number;
  max_score: number;
  level: string;
  evidence_found: string[];
  missing_evidence: string[];
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  issues: Issue[];
  reason: string;
}

interface AggregateScore {
  totalScore: number;
  totalMax: number;
  percentage: number;
  level: string;
  readinessStatus: string;
  categoryScores: Record<string, { score: number; maxScore: number; percentage: number }>;
}

interface EvalResult {
  jobId?: string;
  lessonPlanId?: string;
  lessonPlanHash?: string;
  evaluationMode?: string;
  aggregate?: AggregateScore;
  sections?: SectionResult[];
  issues?: Issue[] | {
    ordered?: Issue[];
    bySeverity?: Record<string, Issue[]>;
    counts?: Record<string, number>;
  };
}

interface Props {
  result: EvalResult;
  onAutoFix?: (mode: 'auto_fix_critical' | 'auto_fix_critical_high' | 'full_improvement') => void;
  onRecheck?: () => void;
  onViewVersionHistory?: () => void;
  isPatching?: boolean;
  recheckJobId?: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  excellent: 'ดีเลิศ',
  very_good: 'ดีมาก',
  good: 'ดี',
  fair: 'พอใช้',
  needs_improvement: 'ต้องปรับปรุง',
};

const LEVEL_COLORS: Record<string, string> = {
  excellent: '#34d399',
  very_good: '#60a5fa',
  good: '#818cf8',
  fair: '#fbbf24',
  needs_improvement: '#f87171',
};

const READINESS_LABELS: Record<string, string> = {
  ready: 'พร้อมใช้งาน',
  ready_with_minor_revision: 'พร้อมแต่ควรปรับเล็กน้อย',
  needs_revision: 'ต้องปรับปรุง',
  not_ready_critical_issues: 'ยังไม่พร้อม — มีปัญหาวิกฤต',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#60a5fa',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  critical: <XCircle size={14} />,
  high: <AlertTriangle size={14} />,
  medium: <AlertCircle size={14} />,
  low: <Info size={14} />,
};

function ScoreBadge({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171';
  return (
    <span style={{
      fontWeight: 800,
      fontSize: 18,
      color,
      background: `${color}18`,
      padding: '4px 12px',
      borderRadius: 10,
      border: `1px solid ${color}44`,
    }}>
      {score}/{max}
    </span>
  );
}

function SectionCard({ section }: { section: SectionResult }) {
  const [open, setOpen] = useState(false);
  const score = Number(section.score || 0);
  const maxScore = Number(section.max_score || 0);
  const evidenceFound = Array.isArray(section.evidence_found) ? section.evidence_found : [];
  const missingEvidence = Array.isArray(section.missing_evidence) ? section.missing_evidence : [];
  const strengths = Array.isArray(section.strengths) ? section.strengths : [];
  const weaknesses = Array.isArray(section.weaknesses) ? section.weaknesses : [];
  const suggestions = Array.isArray(section.suggestions) ? section.suggestions : [];
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171';

  return (
    <div style={{
      background: 'rgba(15,23,42,0.6)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          width: '100%', padding: '12px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
            {section.section}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color }}>{Math.round(pct)}%</span>
          </div>
        </div>
        <ScoreBadge score={score} max={maxScore} />
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {section.reason && (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, lineHeight: 1.6 }}>
              {section.reason}
            </p>
          )}

          {evidenceFound.length > 0 && (
            <EvidenceList title="หลักฐานที่พบ" items={evidenceFound} icon={<CheckCircle size={12} />} color="#34d399" />
          )}
          {missingEvidence.length > 0 && (
            <EvidenceList title="หลักฐานที่ขาด" items={missingEvidence} icon={<XCircle size={12} />} color="#f87171" />
          )}
          {strengths.length > 0 && (
            <EvidenceList title="จุดเด่น" items={strengths} icon={<Shield size={12} />} color="#818cf8" />
          )}
          {weaknesses.length > 0 && (
            <EvidenceList title="จุดที่ควรปรับปรุง" items={weaknesses} icon={<AlertTriangle size={12} />} color="#fbbf24" />
          )}
          {suggestions.length > 0 && (
            <EvidenceList title="คำแนะนำ" items={suggestions} icon={<Lightbulb size={12} />} color="#60a5fa" />
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceList({
  title, items, icon, color,
}: {
  title: string; items: string[]; icon: React.ReactNode; color: string;
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: '#94a3b8', marginBottom: 3 }}>
            <span style={{ color, marginTop: 2 }}>{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MentorSummary({ aggregate, issues }: { aggregate?: AggregateScore; issues?: Issue[] }) {
  const criticalCount = issues?.filter(i => i.severity === 'critical').length ?? 0;
  const highCount = issues?.filter(i => i.severity === 'high').length ?? 0;
  const autoFixableCount = issues?.filter(i => i.auto_fixable && (i.severity === 'critical' || i.severity === 'high')).length ?? 0;
  const pct = aggregate?.percentage ?? 0;
  const estimatedGain = Math.min(autoFixableCount * 4, 100 - pct);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
      border: '1px solid rgba(139,92,246,0.3)',
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Lightbulb size={18} color="#a78bfa" />
        <span style={{ fontWeight: 700, color: '#c4b5fd', fontSize: 15 }}>คำแนะนำจาก Mentor AI</span>
      </div>

      {criticalCount === 0 && highCount === 0 ? (
        <p style={{ color: '#6ee7b7', fontSize: 13 }}>
          ✅ ยอดเยี่ยม! แผนการสอนนี้ผ่านเกณฑ์ทุกด้านที่สำคัญ รักษาคุณภาพนี้ต่อไปครับ
        </p>
      ) : (
        <>
          <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 10 }}>
            พบจุดที่ควรแก้ไข <strong style={{ color: '#f87171' }}>{criticalCount} วิกฤต</strong>{' '}
            {highCount > 0 && <><strong style={{ color: '#fb923c' }}>{highCount} สำคัญ</strong>{' '}</>}
            — ระบบสามารถแก้อัตโนมัติได้ <strong style={{ color: '#a78bfa' }}>{autoFixableCount} จุด</strong>
          </p>
          {estimatedGain > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(52,211,153,0.1)', borderRadius: 8,
              padding: '8px 12px', width: 'fit-content',
            }}>
              <ArrowUp size={14} color="#34d399" />
              <span style={{ fontSize: 12, color: '#6ee7b7' }}>
                คาดว่าคะแนนจะเพิ่มขึ้นอีก ~<strong>{Math.round(estimatedGain)}%</strong> หลังแก้ไข
              </span>
            </div>
          )}
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
            💡 แนะนำให้ใช้ "Auto Fix Critical" ก่อน แล้วกด Recheck เพื่อดูผลที่ปรับปรุงแล้ว
          </p>
        </>
      )}
    </div>
  );
}

export default function EvaluationResultDashboard({
  result,
  onAutoFix,
  onRecheck,
  onViewVersionHistory,
  isPatching,
  recheckJobId,
}: Props) {
  const aggregate = result.aggregate;
  const sections = result.sections ?? [];
  const issues = Array.isArray(result.issues)
    ? result.issues
    : Array.isArray(result.issues?.ordered)
      ? result.issues.ordered
      : [];
  const [activeIssueFilter, setActiveIssueFilter] = useState<string>('all');
  const [showSections, setShowSections] = useState(false);

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  const lowIssues = issues.filter(i => i.severity === 'low');

  const filteredIssues = activeIssueFilter === 'all'
    ? issues
    : issues.filter(i => i.severity === activeIssueFilter);

  const levelColor = LEVEL_COLORS[aggregate?.level ?? ''] ?? '#94a3b8';
  const levelLabel = LEVEL_LABELS[aggregate?.level ?? ''] ?? aggregate?.level ?? '—';
  const readinessLabel = READINESS_LABELS[aggregate?.readinessStatus ?? ''] ?? aggregate?.readinessStatus ?? '—';

  if ((result as any).partial || !aggregate) {
    const isNotReady = (result as any).status === 'lesson_plan_not_ready';
    return (
      <div style={{ marginTop: 20 }}>
        <div style={{
          background: 'rgba(15,23,42,0.9)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 18,
          padding: '24px 28px',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <AlertTriangle size={36} color="#f87171" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 18, color: '#f1f5f9', fontWeight: 700, marginBottom: 8 }}>
            {isNotReady ? 'แผนยังไม่พร้อมสำหรับการประเมิน' : 'ตรวจด้วย AI ไม่สำเร็จ แต่ระบบตรวจโครงสร้างเบื้องต้นได้แล้ว'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            กรุณาแก้ไขปัญหาด้านล่างให้ครบถ้วนก่อนส่งประเมินซ้ำ
          </p>
        </div>
        
        {issues.length > 0 && (
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
              ปัญหาโครงสร้างเบื้องต้น ({issues.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {issues.map((issue, idx) => (
                <div key={idx} style={{
                  background: 'rgba(248,113,113,0.1)',
                  borderLeft: '4px solid #f87171',
                  padding: '12px 16px',
                  borderRadius: '0 8px 8px 0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <XCircle size={16} color="#f87171" />
                    <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{issue.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>{issue.description}</p>
                  {issue.suggestion && (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 6, fontSize: 12, color: '#94a3b8' }}>
                      <strong style={{ color: '#60a5fa' }}>คำแนะนำ:</strong> {issue.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      {/* ── Overall Score ── */}
      <div style={{
        background: 'rgba(15,23,42,0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '24px 28px',
        marginBottom: 16,
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Trophy size={28} color={levelColor} />
          <span style={{ fontSize: 48, fontWeight: 900, color: levelColor, lineHeight: 1 }}>
            {Math.round(aggregate?.percentage ?? 0)}%
          </span>
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{levelLabel}</p>
        <p style={{ fontSize: 13, color: '#64748b' }}>
          {aggregate?.totalScore ?? '—'} / {aggregate?.totalMax ?? '—'} คะแนน
        </p>
        <div style={{
          display: 'inline-block', marginTop: 10,
          padding: '4px 14px', borderRadius: 20,
          background: aggregate?.readinessStatus === 'ready' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.12)',
          border: `1px solid ${aggregate?.readinessStatus === 'ready' ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.3)'}`,
          color: aggregate?.readinessStatus === 'ready' ? '#6ee7b7' : '#fde68a',
          fontSize: 12, fontWeight: 600,
        }}>
          {readinessLabel}
        </div>
      </div>

      {/* ── Score per category ── */}
      {aggregate?.categoryScores && Object.keys(aggregate.categoryScores).length > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          marginBottom: 16,
        }}>
          {Object.entries(aggregate.categoryScores).map(([key, cat]) => (
            <div key={key} style={{
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              padding: '10px 14px',
              flex: '1 1 140px',
            }}>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600 }}>{key}</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: cat.percentage >= 80 ? '#34d399' : cat.percentage >= 60 ? '#fbbf24' : '#f87171' }}>
                {cat.score}/{cat.maxScore}
              </p>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4 }}>
                <div style={{ height: '100%', width: `${cat.percentage}%`, background: cat.percentage >= 80 ? '#34d399' : cat.percentage >= 60 ? '#fbbf24' : '#f87171', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Mentor Summary ── */}
      <MentorSummary aggregate={aggregate} issues={issues} />

      {/* ── Action Buttons ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {onAutoFix && (
          <>
            <button
              onClick={() => onAutoFix('auto_fix_critical')}
              disabled={isPatching || criticalIssues.length === 0}
              style={actionBtnStyle('#f87171', isPatching || criticalIssues.length === 0)}
            >
              {isPatching ? '⏳ กำลังแก้...' : `🔧 Auto Fix Critical (${criticalIssues.length})`}
            </button>
            <button
              onClick={() => onAutoFix('auto_fix_critical_high')}
              disabled={isPatching || (criticalIssues.length + highIssues.length) === 0}
              style={actionBtnStyle('#fb923c', isPatching || (criticalIssues.length + highIssues.length) === 0)}
            >
              {`🔨 Fix Critical + High (${criticalIssues.length + highIssues.length})`}
            </button>
          </>
        )}
        {onRecheck && (
          <button onClick={onRecheck} disabled={isPatching} style={actionBtnStyle('#818cf8', !!isPatching)}>
            🔄 Recheck
          </button>
        )}
        {onViewVersionHistory && (
          <button onClick={onViewVersionHistory} style={actionBtnStyle('#64748b', false)}>
            📋 ประวัติ Version
          </button>
        )}
      </div>

      {/* ── Issues List ── */}
      {issues.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} color="#fbbf24" />
            <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>ปัญหาที่พบ ({issues.length} จุด)</span>
          </div>
          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(sev => {
              const count = sev === 'all' ? issues.length
                : sev === 'critical' ? criticalIssues.length
                : sev === 'high' ? highIssues.length
                : sev === 'medium' ? mediumIssues.length
                : lowIssues.length;
              if (sev !== 'all' && count === 0) return null;
              return (
                <button
                  key={sev}
                  onClick={() => setActiveIssueFilter(sev)}
                  style={{
                    padding: '3px 10px', borderRadius: 20, border: 'none',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: activeIssueFilter === sev
                      ? (sev === 'all' ? '#4f46e5' : SEVERITY_COLORS[sev])
                      : 'rgba(255,255,255,0.07)',
                    color: activeIssueFilter === sev ? '#fff' : '#64748b',
                  }}
                >
                  {sev === 'all' ? 'ทั้งหมด' : sev} ({count})
                </button>
              );
            })}
          </div>
          {filteredIssues.map((issue, i) => (
            <div key={i} style={{
              background: `${SEVERITY_COLORS[issue.severity]}0d`,
              border: `1px solid ${SEVERITY_COLORS[issue.severity]}33`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: SEVERITY_COLORS[issue.severity] }}>{SEVERITY_ICONS[issue.severity]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{issue.title}</span>
                {issue.auto_fixable && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, background: 'rgba(52,211,153,0.15)',
                    color: '#6ee7b7', padding: '1px 8px', borderRadius: 20, border: '1px solid rgba(52,211,153,0.3)',
                  }}>แก้อัตโนมัติได้</span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{issue.description}</p>
              <p style={{ fontSize: 12, color: '#60a5fa' }}>💡 {issue.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Section Details ── */}
      {sections.length > 0 && (
        <div>
          <button
            onClick={() => setShowSections(!showSections)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#818cf8', fontSize: 14, fontWeight: 600, marginBottom: 10,
            }}
          >
            <Search size={14} />
            {showSections ? 'ซ่อน' : 'ดู'} รายละเอียดรายด้าน
            {showSections ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showSections && sections.map(section => (
            <SectionCard key={section.section} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(color: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${color}55`,
    background: `${color}15`,
    color: disabled ? '#475569' : color,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
  };
}
