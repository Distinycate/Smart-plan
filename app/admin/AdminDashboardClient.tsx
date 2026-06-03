'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import toast from 'react-hot-toast'
import { Trash2, Shield, User as UserIcon } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1']

export default function AdminDashboardClient({ 
  usersCount, 
  plansCount, 
  allUsers 
}: { 
  usersCount: number, 
  plansCount: number, 
  allUsers: any[] 
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDeleteUser = async (id: string, email: string) => {
    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ ${email} ออกจากระบบถาวร? แผนการสอนทั้งหมดของผู้ใช้รายนี้จะถูกลบด้วย`)
    if (!confirmed) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        toast.success(`ลบผู้ใช้ ${email} เรียบร้อยแล้ว`)
        router.refresh()
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + json.error)
      }
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  // --- Calculate Stats ---
  // Gender
  const genderMap: any = {}
  // Age Group
  const ageMap: any = { 'น้อยกว่า 25': 0, '25-35': 0, '36-45': 0, '46-55': 0, 'มากกว่า 55': 0 }
  // Subject Group
  const subjectMap: any = {}
  // Grade Level
  const gradeMap: any = {}

  allUsers.forEach(u => {
    // Gender
    const gender = u.gender || 'ไม่ระบุ'
    genderMap[gender] = (genderMap[gender] || 0) + 1

    // Age
    const age = parseInt(u.age)
    if (!isNaN(age)) {
      if (age < 25) ageMap['น้อยกว่า 25']++
      else if (age <= 35) ageMap['25-35']++
      else if (age <= 45) ageMap['36-45']++
      else if (age <= 55) ageMap['46-55']++
      else ageMap['มากกว่า 55']++
    }

    // Subject
    const subject = u.subject_group || 'ไม่ระบุ'
    subjectMap[subject] = (subjectMap[subject] || 0) + 1

    // Grades
    if (u.grade_levels) {
      try {
        const grades = Array.isArray(u.grade_levels) ? u.grade_levels : JSON.parse(u.grade_levels)
        grades.forEach((g: string) => {
          gradeMap[g] = (gradeMap[g] || 0) + 1
        })
      } catch (e) { }
    }
  })

  const genderData = Object.keys(genderMap).map(k => ({ name: k, value: genderMap[k] }))
  const ageData = Object.keys(ageMap).filter(k => ageMap[k] > 0).map(k => ({ name: k, value: ageMap[k] }))
  const subjectData = Object.keys(subjectMap).map(k => ({ name: k, value: subjectMap[k] }))
  const gradeData = Object.keys(gradeMap).map(k => ({ name: k, value: gradeMap[k] }))

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center">
          <h2 className="text-lg font-medium text-slate-500 mb-2">จำนวนผู้ใช้ทั้งหมด</h2>
          <p className="text-5xl font-bold text-blue-600">{usersCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center items-center">
          <h2 className="text-lg font-medium text-slate-500 mb-2">จำนวนแผนทั้งหมดในระบบ</h2>
          <p className="text-5xl font-bold text-indigo-600">{plansCount || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart: Gender */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-md font-semibold text-slate-700 mb-4 text-center">สัดส่วนผู้ใช้งานตามเพศ</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Chart: Subject */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-md font-semibold text-slate-700 mb-4 text-center">กลุ่มสาระการเรียนรู้ที่สอน</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={subjectData} cx="50%" cy="50%" outerRadius={80} fill="#82ca9d" dataKey="value">
                {subjectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index+3) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart: Age Group & Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-md font-semibold text-slate-700 mb-4 text-center">ช่วงอายุของผู้ใช้งาน</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {ageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-md font-semibold text-slate-700 mb-4 text-center">ระดับชั้นที่สอน (ผู้ใช้ 1 คนสอนได้หลายระดับ)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d">
                {gradeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index+5) % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">รายชื่อผู้ใช้งานทั้งหมด</h3>
          <span className="text-xs text-slate-500 font-medium bg-slate-200 px-2 py-1 rounded-md">Total: {allUsers.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-6 py-4">ผู้ใช้</th>
                <th scope="col" className="px-6 py-4">ข้อมูลส่วนตัว</th>
                <th scope="col" className="px-6 py-4">บทบาท</th>
                <th scope="col" className="px-6 py-4">วันที่สมัคร</th>
                <th scope="col" className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {allUsers?.map((u) => (
                <tr key={u.id} className="bg-white border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{u.full_name || 'ไม่ระบุชื่อ'}</div>
                    <div className="text-slate-500 text-xs mt-1">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <div><span className="font-medium">อายุ:</span> {u.age || '-'} | <span className="font-medium">เพศ:</span> {u.gender || '-'}</div>
                    <div className="mt-1"><span className="font-medium text-indigo-600">{u.subject_group || '-'}</span></div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {u.role === 'admin' ? <Shield size={12}/> : <UserIcon size={12}/>}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString('th-TH')}</td>
                  <td className="px-6 py-4 text-right">
                    {u.role !== 'admin' && (
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={deleting === u.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="ลบผู้ใช้ถาวร"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!allUsers || allUsers.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    ไม่มีข้อมูลผู้ใช้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
