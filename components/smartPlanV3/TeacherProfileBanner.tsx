'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  GraduationCap, 
  Settings, 
  Check, 
  X, 
  Calendar, 
  Clock, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  TeacherProfile, 
  getStoredTeacherProfile, 
  saveStoredTeacherProfile 
} from '@/lib/smartPlanV3/teacherProfile';

interface TeacherProfileBannerProps {
  onProfileChange?: (profile: TeacherProfile) => void;
  compact?: boolean;
}

export default function TeacherProfileBanner({ onProfileChange, compact }: TeacherProfileBannerProps) {
  const [profile, setProfile] = useState<TeacherProfile>(getStoredTeacherProfile());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TeacherProfile>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const p = getStoredTeacherProfile();
      setProfile(p);
      setForm(p);
      onProfileChange?.(p);
    };

    handleUpdate();
    window.addEventListener('smart_plan_teacher_profile_updated', handleUpdate);
    return () => window.removeEventListener('smart_plan_teacher_profile_updated', handleUpdate);
  }, [onProfileChange]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveStoredTeacherProfile(form);
    setProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsModalOpen(false);
    }, 800);
  };

  return (
    <>
      {/* ─── Profile Ribbon / Bar (Apple-Grade Clean Widget) ─── */}
      <div className={`w-full rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 text-slate-800 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] overflow-hidden ${compact ? 'p-3.5' : 'p-4 sm:p-5'} mb-6 transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 border border-blue-100/80 flex items-center justify-center text-[#0071E3] shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> ข้อมูลครู & โรงเรียนคงที่ (ใช้ทุกแผน)
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ปีการศึกษา {profile.academicYear} • ภาคเรียนที่ {profile.semester}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate flex items-center gap-2">
                <span>{profile.schoolName}</span>
                <span className="text-xs font-normal text-slate-500 hidden sm:inline">• {profile.affiliation}</span>
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 text-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span className="font-semibold">{profile.teacherName}</span>
                  <span className="text-slate-500 font-normal">({profile.teacherPosition})</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  เวลาคาบมาตรฐาน {profile.defaultDurationMinutes} นาที
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setForm(profile);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/60 transition-all shadow-xs active:scale-95"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>แก้ไขข้อมูลคงที่</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modal Edit Fixed Info ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-2xl border border-blue-400/30 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">ตั้งค่าข้อมูลคงที่ (กรอกครั้งเดียว ใช้ทุกแผน)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ระบบจะนำข้อมูลนี้ไปประทับลงในทุกแผนการสอนและแบบฟอร์ม ว.PA โดยอัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ชื่อ-นามสกุล ครูผู้สอน *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.teacherName}
                    onChange={e => setForm({ ...form, teacherName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                    placeholder="เช่น นายทศพร ศรีพลพา"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    วิทยฐานะ / ตำแหน่ง *
                  </label>
                  <select
                    value={form.teacherPosition}
                    onChange={e => setForm({ ...form, teacherPosition: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                  >
                    <option value="ครูผู้ช่วย">ครูผู้ช่วย</option>
                    <option value="ครู">ครู</option>
                    <option value="ครูชำนาญการ">ครูชำนาญการ (ชก.)</option>
                    <option value="ครูชำนาญการพิเศษ">ครูชำนาญการพิเศษ (ชกพ.)</option>
                    <option value="ครูเชี่ยวชาญ">ครูเชี่ยวชาญ (ชช.)</option>
                    <option value="ครูเชี่ยวชาญพิเศษ">ครูเชี่ยวชาญพิเศษ (ชชพ.)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ชื่อโรงเรียน / สถานศึกษา *
                </label>
                <input
                  type="text"
                  required
                  value={form.schoolName}
                  onChange={e => setForm({ ...form, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                  placeholder="เช่น โรงเรียนเตรียมอุดมศึกษา ภาคตะวันออกเฉียงเหนือ"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  สังกัด / สำนักงานเขตพื้นที่ฯ *
                </label>
                <input
                  type="text"
                  required
                  value={form.affiliation}
                  onChange={e => setForm({ ...form, affiliation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition"
                  placeholder="เช่น สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาสกลนคร"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    value={form.academicYear}
                    onChange={e => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                    placeholder="2567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ภาคเรียนที่
                  </label>
                  <select
                    value={form.semester}
                    onChange={e => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="1">ภาคเรียนที่ 1</option>
                    <option value="2">ภาคเรียนที่ 2</option>
                    <option value="ฤดูร้อน">ภาคฤดูร้อน</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    เวลาคาบ (นาที)
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="180"
                    step="5"
                    value={form.defaultDurationMinutes}
                    onChange={e => setForm({ ...form, defaultDurationMinutes: Number(e.target.value) || 60 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {saveSuccess ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4" /> บันทึกข้อมูลสำเร็จ!
                    </span>
                  ) : (
                    'บันทึกแล้วไม่ต้องพิมพ์ใหม่อีก'
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-full shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    บันทึกข้อมูล
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
