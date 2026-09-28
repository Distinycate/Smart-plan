'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Layers, 
  Printer, 
  ShieldCheck, 
  Target, 
  FileText, 
  Clock, 
  CheckSquare, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { V3LessonGraph } from '@/lib/smartPlanV3/types';

export default function V3PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [graph, setGraph] = useState<V3LessonGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plan/v3/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setGraph(json.data);
      } else {
        setError(json.error || 'ไม่สามารถโหลดข้อมูลแผนการสอน V3 ได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <Link 
              href="/plan/v3" 
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Plan ID: {id}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                {graph?.lesson?.title || 'รายละเอียดแผนการสอน V3'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchGraph}
              className="p-2 text-slate-500 hover:text-indigo-600 border border-slate-300 rounded-lg bg-white transition shadow-xs"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href={`/plan/${id}`}
              className="text-xs text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-lg px-3 py-1.5 bg-white transition shadow-xs"
            >
              เปิดด้วย Legacy Plan Editor
            </Link>
          </div>
        </div>

        {/* Foundation & Graph Status Summary */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">กำลังโหลดข้อมูล V3 Domain Graph...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-slate-800">ไม่สามารถโหลดข้อมูล V3 Graph</h2>
            <p className="text-xs text-rose-600">{error}</p>
            <p className="text-xs text-slate-500">หากเพิ่งสร้างตารางใหม่ กรุณาตรวจสอบว่าได้รัน Migration 15 ใน Supabase แล้ว</p>
          </div>
        ) : graph ? (
          <div className="space-y-6">
            {/* Meta Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">สถานะแผน</span>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {graph.lesson.status}
                  </span>
                  <span className="text-xs text-slate-500">• {graph.lesson.duration_minutes} นาที</span>
                  <span className="text-xs text-slate-500">• {graph.lesson.course_code} {graph.lesson.course_name}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Updated: {new Date(graph.lesson.updated_at).toLocaleString('th-TH')}
              </div>
            </div>

            {/* Domain Counters (Foundation Summary) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{graph.objectives.length}</div>
                  <div className="text-xs text-slate-500 font-medium">Objectives</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{graph.evidence.length}</div>
                  <div className="text-xs text-slate-500 font-medium">Evidence</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{graph.activities.length}</div>
                  <div className="text-xs text-slate-500 font-medium">Activities</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{graph.assessments.length}</div>
                  <div className="text-xs text-slate-500 font-medium">Assessments</div>
                </div>
              </div>
            </div>

            {/* Junction Link Counts */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 text-xs text-indigo-900 space-y-2">
              <h3 className="font-bold flex items-center space-x-2 text-indigo-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ความสัมพันธ์ใน Domain Graph (Active Junction Links):</span>
              </h3>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <li>• Objective ↔ Evidence: <strong>{graph.objectiveEvidenceLinks.length}</strong> links</li>
                <li>• Activity ↔ Objective: <strong>{graph.activityObjectiveLinks.length}</strong> links</li>
                <li>• Assessment ↔ Evidence: <strong>{graph.assessmentEvidenceLinks.length}</strong> links</li>
              </ul>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
