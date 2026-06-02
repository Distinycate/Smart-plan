'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PlanPreview() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    
    fetch(`/api/plans/${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setPlan(res.data);
        } else {
          setError(res.error || 'Failed to fetch plan');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Error: ' + err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '14px', fontFamily: 'Sarabun, sans-serif' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <strong>กำลังโหลดเอกสาร...</strong>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Sarabun, sans-serif' }}>
        <h2 style={{ color: '#dc2626' }}>เกิดข้อผิดพลาดในการโหลดเอกสาร</h2>
        <p>{error || 'ไม่พบแผนการสอนในระบบ'}</p>
        <button onClick={() => router.push('/')} style={{ marginTop: '16px', padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const cleanVal = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="preview-container">
      {/* Floating control bar for screen viewing */}
      <div className="no-print control-bar">
        <button className="control-btn back-btn" onClick={() => router.push(`/plan/${id}`)}>
          ← ย้อนกลับ
        </button>
        <div className="control-title">
          ตัวอย่างเอกสาร: {plan.lessonTopic} ({plan.subjectCode})
        </div>
        <button className="control-btn print-btn" onClick={() => window.print()}>
          🖨️ พิมพ์แผนการสอน (Save PDF)
        </button>
      </div>

      {/* Main A4 Document Sheet */}
      <div className="a4-sheet">
        <div className="doc-title">แผนการจัดการเรียนรู้</div>
        
        <table className="top-grid">
          <tbody>
            <tr>
              <td><span className="label">ชื่อ-นามสกุลครูผู้สอน:</span>&nbsp;{plan.teacherName}</td>
              <td><span className="label">โรงเรียน:</span>&nbsp;{plan.schoolName}</td>
            </tr>
            <tr>
              <td><span class="label" style={{ fontWeight: 'bold' }}>สังกัด:</span>&nbsp;{plan.organization}</td>
              <td><span class="label" style={{ fontWeight: 'bold' }}>กลุ่มสาระการเรียนรู้:</span>&nbsp;{plan.headerLearningArea}</td>
            </tr>
            <tr>
              <td><span class="label" style={{ fontWeight: 'bold' }}>ระดับชั้น:</span>&nbsp;{plan.headerGradeLevel}</td>
              <td><span class="label" style={{ fontWeight: 'bold' }}>ปีการศึกษา:</span>&nbsp;{plan.academicYear}</td>
            </tr>
            <tr>
              <td><span class="label" style={{ fontWeight: 'bold' }}>รายวิชา:</span>&nbsp;{plan.subjectName}</td>
              <td><span class="label" style={{ fontWeight: 'bold' }}>รหัสวิชา:</span>&nbsp;{plan.subjectCode}</td>
            </tr>
            <tr>
              <td><span class="label" style={{ fontWeight: 'bold' }}>ภาคเรียนที่:</span>&nbsp;{plan.semester}</td>
              <td><span class="label" style={{ fontWeight: 'bold' }}>เวลาเรียน:</span>&nbsp;{plan.totalHours}&nbsp;ชั่วโมง</td>
            </tr>
            <tr>
              <td><span class="label" style={{ fontWeight: 'bold' }}>หน่วยการเรียนรู้:</span>&nbsp;{plan.unitName}</td>
              <td><span class="label" style={{ fontWeight: 'bold' }}>เรื่องที่สอน:</span>&nbsp;{plan.lessonTopic}</td>
            </tr>
          </tbody>
        </table>

        <div className="section">
          <div className="section-title">1. มาตรฐานการเรียนรู้ / ตัวชี้วัด</div>
          <div className="section-content">
            <p><span className="label">มาตรฐานการเรียนรู้:</span><br />{cleanVal(plan.learningStandard)}</p>
            <p><span className="label">ตัวชี้วัดระหว่างทาง:</span><br />{cleanVal(plan.indicatorDuring)}</p>
            <p><span className="label">ตัวชี้วัดปลายทาง:</span><br />{cleanVal(plan.indicatorFinal)}</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title">2. สาระสำคัญ (Concept)</div>
          <div className="section-content">{cleanVal(plan.essentialConcept)}</div>
        </div>

        <div className="section">
          <div className="section-title">3. จุดประสงค์การเรียนรู้</div>
          <div className="section-content">
            <p><span className="label">ด้านความรู้ (K):</span><br />{cleanVal(plan.objectiveK)}</p>
            <p><span className="label">ด้านทักษะกระบวนการ (P):</span><br />{cleanVal(plan.objectiveP)}</p>
            <p><span className="label">ด้านคุณลักษณะ (A):</span><br />{cleanVal(plan.objectiveA)}</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title">4. สาระการเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningContent)}</div>
        </div>

        <div className="section">
          <div className="section-title">5. สมรรถนะสำคัญของผู้เรียน</div>
          <div className="section-content">{cleanVal(plan.competencies)}</div>
        </div>

        <div className="section">
          <div className="section-title">6. คุณลักษณะอันพึงประสงค์</div>
          <div className="section-content">{cleanVal(plan.desiredAttributes)}</div>
        </div>

        <div className="section">
          <div className="section-title">7. ทักษะที่จำเป็นในศตวรรษที่ 21</div>
          <div className="section-content">{cleanVal(plan.skills21)}</div>
        </div>

        <div className="section">
          <div className="section-title">8. กระบวนการจัดการเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningProcess)}</div>
        </div>

        <div className="section">
          <div className="section-title">9. การวัดและประเมินผลการเรียนรู้</div>
          <table className="assessment-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>ด้าน</th>
                <th style={{ width: '25%' }}>สิ่งที่ต้องการวัดและประเมินผล</th>
                <th style={{ width: '20%' }}>วิธีการวัดผล</th>
                <th style={{ width: '25%' }}>เครื่องมือวัดผล</th>
                <th style={{ width: '20%' }}>เกณฑ์การประเมิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="domain-cell">ความรู้<br />(K)</td>
                <td>{cleanVal(plan.objectiveK)}</td>
                <td>{cleanVal(plan.methodK)}</td>
                <td>{cleanVal(plan.toolK)}</td>
                <td>{cleanVal(plan.criteriaK)}</td>
              </tr>
              <tr>
                <td className="domain-cell">ทักษะ<br />(P)</td>
                <td>{cleanVal(plan.objectiveP)}</td>
                <td>{cleanVal(plan.methodP)}</td>
                <td>{cleanVal(plan.toolP)}</td>
                <td>{cleanVal(plan.criteriaP)}</td>
              </tr>
              <tr>
                <td className="domain-cell">คุณลักษณะ<br />(A)</td>
                <td>{cleanVal(plan.objectiveA)}</td>
                <td>{cleanVal(plan.methodA)}</td>
                <td>{cleanVal(plan.toolA)}</td>
                <td>{cleanVal(plan.criteriaA)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section">
          <div className="section-title">10. สื่อการเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningMedia)}</div>
        </div>

        <div className="section">
          <div className="section-title">11. แหล่งเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningSources)}</div>
        </div>

        <div className="section">
          <div className="section-title">12. ชิ้นงาน / ภาระงาน</div>
          <div className="section-content">{cleanVal(plan.tasks)}</div>
        </div>

        <hr className="divider" />

        <div className="section">
          <div className="section-title">13. บันทึกหลังการจัดการเรียนรู้</div>
          <div className="section-content">
            <p><span className="label">ผลการสอนด้านความรู้ (K):</span><br />{cleanVal(plan.resultK)}</p>
            <p><span className="label">ผลการสอนด้านทักษะ (P):</span><br />{cleanVal(plan.resultP)}</p>
            <p><span className="label">ผลการสอนด้านคุณลักษณะ (A):</span><br />{cleanVal(plan.resultA)}</p>
            <p><span className="label">ปัญหาและอุปสรรคที่พบ:</span><br />{cleanVal(plan.problems)}</p>
            <p><span className="label">แนวทางแก้ไขและพัฒนา:</span><br />{cleanVal(plan.solutions)}</p>
          </div>
        </div>

        <table className="sig-table">
          <tbody>
            <tr>
              <td>
                <div className="sig-line"></div>
                <p>({plan.teacherName})</p>
                <p>ครูผู้สอน</p>
                <p>วันที่ ........../........../..........</p>
              </td>
              <td>
                <div className="sig-line"></div>
                <p>(...................................)</p>
                <p>หัวหน้ากลุ่มสาระการเรียนรู้</p>
                <p>วันที่ ........../........../..........</p>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', paddingTop: '16px' }}>
                <div className="sig-line" style={{ width: '40%', margin: '24px auto 4px' }}></div>
                <p>(...................................)</p>
                <p>รองผู้อำนวยการฝ่ายวิชาการ / ผู้อำนวยการโรงเรียน</p>
                <p>วันที่ ........../........../..........</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        body {
          background: #525659;
          margin: 0;
          padding: 0;
        }
        .preview-container {
          font-family: "TH Sarabun New", "Sarabun", sans-serif;
          min-height: 100vh;
          padding-top: 55px; /* Offset for floating bar */
        }
        .control-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 55px;
          background: #2b2b2b;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          z-index: 1000;
        }
        .control-title {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .control-btn {
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-size: 13.5px;
          transition: background 0.15s;
        }
        .back-btn {
          background: #4b5563;
          color: #fff;
        }
        .back-btn:hover { background: #374151; }
        .print-btn {
          background: #16a34a;
          color: #fff;
        }
        .print-btn:hover { background: #15803d; }
        
        .a4-sheet {
          background: #ffffff;
          width: 210mm;
          min-height: 297mm;
          margin: 25px auto;
          padding: 20mm 20mm 18mm 25mm;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
          box-sizing: border-box;
          color: #000;
        }
        .doc-title {
          text-align: center;
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 12px;
        }
        .top-grid {
          width: 100%;
          border-collapse: collapse;
          border: 1px dashed #444;
          margin-bottom: 15px;
        }
        .top-grid td {
          width: 50%;
          padding: 5px 10px;
          vertical-align: top;
          border-bottom: 1px dashed #ccc;
          font-size: 15px;
        }
        .top-grid tr:last-child td { border-bottom: none; }
        .top-grid td:first-child { border-right: 1px dashed #ccc; }
        .label { font-weight: bold; }
        .section { margin-top: 10px; page-break-inside: avoid; }
        .section-title { font-weight: bold; font-size: 16px; margin-bottom: 3px; border-bottom: 1px solid #000; padding-bottom: 1px; }
        .section-content { margin-left: 18px; font-size: 15px; }
        .assessment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .assessment-table th,
        .assessment-table td {
          border: 1px solid #333;
          padding: 5px 8px;
          vertical-align: top;
        }
        .assessment-table th {
          font-weight: bold;
          text-align: center;
          background: #e8e8e8;
        }
        .domain-cell { text-align: center; font-weight: bold; }
        .sig-table { width: 100%; border-collapse: collapse; margin-top: 30px; page-break-inside: avoid; }
        .sig-table td { width: 50%; text-align: center; padding: 6px 12px; font-size: 15px; }
        .sig-line { border-top: 1px solid #333; margin: 28px auto 4px; width: 72%; }
        hr.divider { border: none; border-top: 1px solid #aaa; margin: 15px 0; }
        p { margin: 3px 0 6px; }

        @media print {
          body {
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          .preview-container {
            padding-top: 0;
          }
          .a4-sheet {
            width: 100%;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .top-grid {
            border-style: solid;
          }
          .top-grid td {
            border-bottom-style: solid;
            border-right-style: solid;
          }
        }
      `}</style>
    </div>
  );
}
