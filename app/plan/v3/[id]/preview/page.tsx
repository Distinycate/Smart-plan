'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  FileText,
  Sliders,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Lock,
  RefreshCw,
  Code,
  CheckCircle2,
} from 'lucide-react';
import type { V3LessonDocument, DocumentOptions } from '@/lib/smartPlanV3/document';
import { DEFAULT_DOCUMENT_OPTIONS } from '@/lib/smartPlanV3/document';
import { LessonDocumentHtmlRenderer } from '@/components/smartPlanV3/document';
import { formatThaiDate } from '@/lib/smartPlanV3/labels';

export default function V3PlanPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [document, setDocument] = useState<V3LessonDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [zoom, setZoom] = useState(90);
  const [showOptions, setShowOptions] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState<'word' | 'pdf' | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState<string | null>(null);

  // Document options state (local to preview — does NOT mutate lesson data)
  const [options, setOptions] = useState<DocumentOptions>({
    ...DEFAULT_DOCUMENT_OPTIONS,
  });

  const fetchDocument = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    setBlockers([]);

    try {
      const q = new URLSearchParams({
        includeCover: options.includeCover ? '1' : '0',
        includeStudentAssets: options.includeStudentAssets ? '1' : '0',
        includeAnswerKeys: options.includeAnswerKeys ? '1' : '0',
        includeAssessmentTools: options.includeAssessmentTools ? '1' : '0',
        includeTeacherGuide: options.includeTeacherGuide ? '1' : '0',
        includePaReadinessAppendix: options.includePaReadinessAppendix ? '1' : '0',
        includePostTeachingPlaceholder: options.includePostTeachingPlaceholder ? '1' : '0',
      });

      const res = await fetch(`/api/plan/v3/${planId}/document?${q.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error || 'ยังไม่พร้อมสร้างเอกสาร');
          setBlockers(data.blockers || []);
        } else {
          setError(data.error || 'เกิดข้อผิดพลาดในการสร้างเอกสาร');
        }
        setDocument(null);
      } else {
        setDocument(data.document);
      }
    } catch (err: any) {
      setError(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [planId, options]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handlePrint = () => {
    window.print();
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 60));

  const handleDownloadWord = (pkg: 'teacher' | 'student') => {
    const q = new URLSearchParams({
      package: pkg,
      includeTeacherGuide: options.includeTeacherGuide ? '1' : '0',
      includePaReadinessAppendix: options.includePaReadinessAppendix ? '1' : '0',
    });
    window.open(`/api/plan/v3/${planId}/export/word?${q.toString()}`, '_blank');
    setExportMenuOpen(null);
  };

  const handleDownloadPdf = (pkg: 'teacher' | 'student') => {
    const q = new URLSearchParams({
      package: pkg,
      includeTeacherGuide: options.includeTeacherGuide ? '1' : '0',
      includePaReadinessAppendix: options.includePaReadinessAppendix ? '1' : '0',
    });
    window.open(`/api/plan/v3/${planId}/export/pdf?${q.toString()}`, '_blank');
    setExportMenuOpen(null);
  };

  const handleFinalize = async () => {
    if (!window.confirm('ยืนยันการล็อคแผนการสอนฉบับสมบูรณ์ (FINAL)? ระบบจะสร้าง Snapshot ถาวรในฐานข้อมูลและปรับสถานะแผนเป็น FINAL')) {
      return;
    }
    setIsFinalizing(true);
    setFinalizeSuccess(null);
    try {
      const res = await fetch(`/api/plan/v3/${planId}/finalize`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'ไม่สามารถล็อคแผนได้');
      } else {
        setFinalizeSuccess(`บันทึกและสร้าง Snapshot ฉบับสมบูรณ์ (FINAL v.${data.version}) สำเร็จ`);
        fetchDocument();
      }
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  // ─── Loading State ───
  if (loading && !document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-600 font-medium text-sm">กำลังประมวลผลและจัดหน้าเอกสาร A4...</p>
      </div>
    );
  }

  // ─── Lock Screen (Readiness Gate Fail) ───
  if (error && (!document || blockers.length > 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">ยังไม่พร้อมสร้างเอกสาร</h2>
            <p className="text-sm text-slate-600 mt-1">
              กรุณาตรวจประเด็นที่ต้องแก้ในขั้นที่ 6 ให้เรียบร้อยก่อนเพื่อความถูกต้องของเอกสารราชการ
            </p>
          </div>

          {blockers.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-1.5 text-xs text-amber-900">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>ประเด็นที่ต้องแก้ไขก่อนส่งออก:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {blockers.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push(`/plan/v3/${planId}`)}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              กลับไปขั้นที่ 6 (ตรวจคุณภาพ)
            </button>
            <button
              onClick={() => fetchDocument()}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ลองใหม่</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900">
      {/* ─── Top Preview Toolbar (Hidden in Print) ─── */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Back Link & Title */}
          <div className="flex items-center gap-3">
            <Link
              href={`/plan/v3/${planId}`}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปแก้แผน</span>
            </Link>
            <div className="hidden sm:block h-4 w-px bg-slate-300" />
            <div className="hidden sm:block">
              <span className="text-xs text-slate-500">ตัวอย่างเอกสาร A4:</span>
              <div className="text-sm font-bold text-slate-900 truncate max-w-xs md:max-w-md">
                {document?.metadata?.topic || 'แผนการจัดการเรียนรู้'}
              </div>
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-600 hover:text-slate-900 rounded"
                title="ย่อขนาด"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-1.5 min-w-[42px] text-center">
                {zoom}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-600 hover:text-slate-900 rounded"
                title="ขยายขนาด"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Document Options Toggle Button */}
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                showOptions
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ตัวเลือกเอกสาร</span>
            </button>

            {/* Browser Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ทดสอบ</span>
            </button>

            {/* Word Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(prev => (prev === 'word' ? null : 'word'))}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                title="ส่งออกเอกสาร Microsoft Word (.docx)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>
              {exportMenuOpen === 'word' && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    เลือกรูปแบบชุดเอกสาร Word
                  </div>
                  <button
                    onClick={() => handleDownloadWord('teacher')}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-800 flex flex-col"
                  >
                    <span className="font-semibold text-blue-900">แผนสำหรับครู (Teacher Package)</span>
                    <span className="text-[11px] text-slate-500">แผนหลัก 10 หมวด + สื่อ + เฉลย + รูบริก</span>
                  </button>
                  <button
                    onClick={() => handleDownloadWord('student')}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-800 flex flex-col border-t border-slate-100"
                  >
                    <span className="font-semibold text-emerald-900">ใบงานสำหรับผู้เรียน (Student Package)</span>
                    <span className="text-[11px] text-slate-500">เฉพาะใบงานและสื่อ (ปราศจากเฉลยและคู่มือครู)</span>
                  </button>
                </div>
              )}
            </div>

            {/* PDF Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(prev => (prev === 'pdf' ? null : 'pdf'))}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                title="ส่งออกเอกสาร PDF Server-side พร้อมเลขหน้า Deterministic"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF Server</span>
              </button>
              {exportMenuOpen === 'pdf' && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    เลือกรูปแบบชุดเอกสาร PDF
                  </div>
                  <button
                    onClick={() => handleDownloadPdf('teacher')}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 text-slate-800 flex flex-col"
                  >
                    <span className="font-semibold text-rose-900">แผนสำหรับครู (Teacher Package)</span>
                    <span className="text-[11px] text-slate-500">พิมพ์แผนครบถ้วน + เลขหน้าแน่ชัด</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPdf('student')}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 text-slate-800 flex flex-col border-t border-slate-100"
                  >
                    <span className="font-semibold text-emerald-900">ใบงานสำหรับผู้เรียน (Student Package)</span>
                    <span className="text-[11px] text-slate-500">เฉพาะชุดใบงานสำหรับพิมพ์แจกนักเรียน</span>
                  </button>
                </div>
              )}
            </div>

            {/* Finalize Button */}
            {document?.metadata.status === 'REVIEWED' && (
              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                title="สร้าง Immutable Snapshot ถาวรและปรับสถานะเป็น FINAL"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isFinalizing ? 'กำลังล็อค...' : 'ล็อคแผนฉบับสมบูรณ์ (FINAL)'}</span>
              </button>
            )}

            {document?.metadata.status === 'FINAL' && (
              <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ฉบับสมบูรณ์ (FINAL)</span>
              </div>
            )}
          </div>
        </div>

        {/* Options Drawer Panel */}
        {showOptions && (
          <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includeStudentAssets}
                onChange={e => setOptions(o => ({ ...o, includeStudentAssets: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>รวมใบงาน / สื่อ</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includeAssessmentTools}
                onChange={e => setOptions(o => ({ ...o, includeAssessmentTools: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>รวมเครื่องมือประเมิน</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includeAnswerKeys}
                onChange={e => setOptions(o => ({ ...o, includeAnswerKeys: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>รวมเฉลย (ครู)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includeTeacherGuide}
                onChange={e => setOptions(o => ({ ...o, includeTeacherGuide: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>รวม Teacher Guide</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includePaReadinessAppendix}
                onChange={e => setOptions(o => ({ ...o, includePaReadinessAppendix: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>รวมผลตรวจ PA</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.includePostTeachingPlaceholder}
                onChange={e => setOptions(o => ({ ...o, includePostTeachingPlaceholder: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>รวมบันทึกหลังสอน</span>
            </label>
          </div>
        )}
      </header>

      {/* Finalize Success Notification */}
      {finalizeSuccess && (
        <div className="no-print max-w-7xl mx-auto px-4 py-2 mt-2">
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-medium shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{finalizeSuccess}</span>
            </div>
            <button onClick={() => setFinalizeSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-bold px-2 py-0.5">✕</button>
          </div>
        </div>
      )}

      {/* Snapshot metadata banner */}
      <div className="no-print max-w-7xl mx-auto px-4 py-2 flex justify-between items-center text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            สร้างจากแผนที่อัปเดตล่าสุดเมื่อ:{' '}
            {formatThaiDate(document?.sourceLessonUpdatedAt || null)}
          </span>
          {document?.documentSourceHash && (
            <span className="font-mono text-slate-400">({document.documentSourceHash})</span>
          )}
        </div>
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
        >
          <Code className="w-3 h-3" />
          <span>{showDebug ? 'ซ่อน Model JSON' : 'ตรวจสอบ Model'}</span>
        </button>
      </div>

      {/* Developer Debug JSON Modal */}
      {showDebug && document && (
        <div className="no-print max-w-7xl mx-auto px-4 mb-4">
          <div className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-xs font-mono max-h-96">
            <div className="font-bold text-amber-400 mb-2">// Canonical V3LessonDocument Model (Developer Debug)</div>
            <pre>{JSON.stringify(document, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* ─── Master Document Renderer ─── */}
      {document && <LessonDocumentHtmlRenderer document={document} zoom={zoom} />}
    </div>
  );
}
