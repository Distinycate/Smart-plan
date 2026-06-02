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
  const [zoom, setZoom] = useState(100);

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

  // Format standard body text paragraph indentation
  const cleanVal = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => (
        <p key={idx} className="indent-p">
          {line}
        </p>
      ));
  };

  // Format table cells without indent
  const cleanTableCellVal = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  // Render multiple indicators line by line, ensuring same left indentation (1.25cm)
  const renderIndicators = (val: any) => {
    if (!val) return '';
    return String(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => (
        <div key={idx} className="indicator-line">
          {line}
        </div>
      ));
  };

  // Clean list formatting (e.g. - chips to 1) 2) 3)) with 0.75cm indent
  const renderList = (val: any) => {
    if (!val) return '';
    const lines = String(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        // remove leading bullet points like -, *, •, or numbers like 1., 1)
        return line.replace(/^([-*•]|\d+[\s.)])\s*/, '');
      });
    
    if (lines.length === 0) return '';
    
    return (
      <div className="list-wrapper">
        {lines.map((line, idx) => (
          <div key={idx} className="list-item">
            {idx + 1}) {line}
          </div>
        ))}
      </div>
    );
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: '#ccc' }}>ย่อ/ขยาย (Zoom):</span>
          <select 
            value={zoom} 
            onChange={e => setZoom(parseInt(e.target.value))} 
            style={{ 
              background: '#4b5563', 
              color: '#fff', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              fontWeight: 'bold',
              cursor: 'pointer' 
            }}
          >
            <option value={75}>75%</option>
            <option value={90}>90%</option>
            <option value={100}>100% (ขนาดจริง)</option>
            <option value={110}>110%</option>
            <option value={120}>120%</option>
            <option value={150}>150%</option>
          </select>
        </div>
        <button className="control-btn print-btn" onClick={() => window.print()}>
          🖨️ พิมพ์แผนการสอน (Save PDF)
        </button>
      </div>

      {/* Main A4 Document Sheet */}
      <div className="a4-sheet" style={{ zoom: `${zoom}%` }}>
        <div className="doc-title">แผนการจัดการเรียนรู้</div>
        
        <table className="info-table">
          <tbody>
            <tr>
              <td style={{ width: '12%', fontWeight: 'bold' }}>ชื่อ-นามสกุล</td>
              <td style={{ width: '28%' }}>{plan.teacherName}</td>
              <td style={{ width: '10%', fontWeight: 'bold' }}>โรงเรียน</td>
              <td style={{ width: '18%' }}>{plan.schoolName}</td>
              <td style={{ width: '8%', fontWeight: 'bold' }}>สังกัด</td>
              <td style={{ width: '24%' }}>{plan.organization}</td>
            </tr>
          </tbody>
        </table>
        <table className="info-table">
          <tbody>
            <tr>
              <td style={{ width: '15%', fontWeight: 'bold' }}>กลุ่มสาระ</td>
              <td style={{ width: '53%' }}>{plan.headerLearningArea}</td>
              <td style={{ width: '8%', fontWeight: 'bold' }}>ระดับชั้น</td>
              <td style={{ width: '24%' }}>{plan.headerGradeLevel}</td>
            </tr>
          </tbody>
        </table>
        <table className="info-table">
          <tbody>
            <tr>
              <td style={{ width: '15%', fontWeight: 'bold' }}>หน่วยที่</td>
              <td style={{ width: '53%' }}>{plan.unitName}</td>
              <td style={{ width: '8%', fontWeight: 'bold' }}>เวลา</td>
              <td style={{ width: '24%' }}>{plan.totalHours} ชั่วโมง</td>
            </tr>
          </tbody>
        </table>
        <table className="info-table" style={{ marginBottom: '15px' }}>
          <tbody>
            <tr>
              <td style={{ width: '10%', fontWeight: 'bold' }}>วันที่สอน</td>
              <td style={{ width: '30%' }}></td>
              <td style={{ width: '8%', fontWeight: 'bold' }}>เรื่อง</td>
              <td style={{ width: '52%' }}>{plan.lessonTopic}</td>
            </tr>
          </tbody>
        </table>

        <div className="section">
          <div className="section-title">1. สาระสำคัญ</div>
          <div className="section-content">{cleanVal(plan.essentialConcept)}</div>
        </div>

        <div className="section">
          <div className="section-title">2. มาตรฐานการเรียนรู้และตัวชี้วัด</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div className="sub-heading">ตัวชี้วัดระหว่างทาง</div>
            <div className="sub-content">{renderIndicators(plan.indicatorDuring)}</div>
            <div className="sub-heading" style={{ marginTop: '6px' }}>ตัวชี้วัดปลายทาง</div>
            <div className="sub-content">{renderIndicators(plan.indicatorFinal)}</div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">3. สมรรถนะสำคัญของผู้เรียน</div>
          <div className="section-content-list">{renderList(plan.competencies)}</div>
        </div>

        <div className="section">
          <div className="section-title">4. คุณลักษณะอันพึงประสงค์</div>
          <div className="section-content-list">{renderList(plan.desiredAttributes)}</div>
        </div>

        <div className="section">
          <div className="section-title">5. จุดประสงค์การเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div className="sub-heading">ด้านความรู้ (K):</div>
            <div className="sub-content">{cleanTableCellVal(plan.objectiveK)}</div>
            
            <div className="sub-heading" style={{ marginTop: '6px' }}>ด้านทักษะกระบวนการ (P):</div>
            <div className="sub-content">{cleanTableCellVal(plan.objectiveP)}</div>
            
            <div className="sub-heading" style={{ marginTop: '6px' }}>ด้านคุณลักษณะ (A):</div>
            <div className="sub-content">{cleanTableCellVal(plan.objectiveA)}</div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">6. เนื้อหาสาระ</div>
          <div className="section-content">{cleanVal(plan.learningContent)}</div>
        </div>

        <div className="section">
          <div className="section-title">7. สื่อและแหล่งการเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div className="sub-heading">1) สื่อการเรียนรู้:</div>
            <div className="sub-content">{cleanTableCellVal(plan.learningMedia) || '..................................................'}</div>
            <div className="sub-heading" style={{ marginTop: '6px' }}>2) แหล่งเรียนรู้:</div>
            <div className="sub-content">{cleanTableCellVal(plan.learningSources) || '..................................................'}</div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">8. วิธีการดำเนินกิจกรรม ตามแนวคิด Active Learning (แนวคิด/รูปแบบการสอน/วิธีการสอน : {plan.subjectName})</div>
          <div className="section-content">{cleanVal(plan.learningProcess)}</div>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">9. การวัดและการประเมินผล</div>
          <table className="assessment-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>รายการวัด</th>
                <th style={{ width: '25%' }}>วิธีวัด</th>
                <th style={{ width: '25%' }}>เครื่องมือ</th>
                <th style={{ width: '25%' }}>เกณฑ์การประเมิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ด้านความรู้ (K)</strong><br />{cleanTableCellVal(plan.objectiveK)}</td>
                <td>{cleanTableCellVal(plan.methodK)}</td>
                <td>{cleanTableCellVal(plan.toolK)}</td>
                <td>{cleanTableCellVal(plan.criteriaK)}</td>
              </tr>
              <tr>
                <td><strong>ด้านทักษะกระบวนการ (P)</strong><br />{cleanTableCellVal(plan.objectiveP)}</td>
                <td>{cleanTableCellVal(plan.methodP)}</td>
                <td>{cleanTableCellVal(plan.toolP)}</td>
                <td>{cleanTableCellVal(plan.criteriaP)}</td>
              </tr>
              <tr>
                <td><strong>ด้านคุณลักษณะ (A)</strong><br />{cleanTableCellVal(plan.objectiveA)}</td>
                <td>{cleanTableCellVal(plan.methodA)}</td>
                <td>{cleanTableCellVal(plan.toolA)}</td>
                <td>{cleanTableCellVal(plan.criteriaA)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">10. บันทึกหลังการสอน</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div className="sub-heading">1) ผลการจัดการเรียนรู้</div>
            <div className="sub-content" style={{ marginTop: '2px' }}>
              - ด้านความรู้ (K): {cleanTableCellVal(plan.resultK)}
              - ด้านทักษะกระบวนการ (P): {cleanTableCellVal(plan.resultP)}
              - ด้านคุณลักษณะ (A): {cleanTableCellVal(plan.resultA)}
            </div>
            
            <div className="sub-heading" style={{ marginTop: '6px' }}>2) ปัญหา/อุปสรรค</div>
            <div className="sub-content" style={{ marginTop: '2px' }}>{cleanTableCellVal(plan.problems)}</div>
            
            <div className="sub-heading" style={{ marginTop: '6px' }}>3) ข้อเสนอแนะ/แนวทางแก้ไข</div>
            <div className="sub-content" style={{ marginTop: '2px' }}>{cleanTableCellVal(plan.solutions)}</div>
          </div>
        </div>

        {/* Page Break for Permission Section */}
        <div style={{ pageBreakBefore: 'always' }}></div>

        {/* Permission Request Section */}
        <div className="sig-section">
          <div className="sig-title">การขออนุญาตใช้แผนการจัดการเรียนรู้</div>
          
          <div className="comment-block">
            <div className="comment-heading">ความเห็น / ข้อเสนอแนะของหัวหน้างานวิชาการ</div>
            <div className="comment-line">............................................................................................................................................................................................</div>
            <div className="comment-line">............................................................................................................................................................................................</div>
            <table className="sig-layout-table">
              <tbody>
                <tr>
                  <td style={{ width: '45%' }}></td>
                  <td className="sig-cell">
                    (ลงชื่อ) ............................................................<br />
                    (....................................................)<br />
                    หัวหน้างานวิชาการ.................................
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="comment-block">
            <div className="comment-heading">ความเห็น / ข้อเสนอแนะของรองผู้อำนวยการบริหารงานวิชาการ (ถ้ามี)</div>
            <div className="comment-line">............................................................................................................................................................................................</div>
            <div className="comment-line">............................................................................................................................................................................................</div>
            <table className="sig-layout-table">
              <tbody>
                <tr>
                  <td style={{ width: '45%' }}></td>
                  <td className="sig-cell">
                    (ลงชื่อ) ............................................................<br />
                    (....................................................)<br />
                    รองผู้อำนวยการ.......................................
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="comment-block">
            <div className="comment-heading">ความเห็น / ข้อเสนอแนะของผู้อำนวยการ</div>
            <div className="comment-line">............................................................................................................................................................................................</div>
            <div className="comment-line">............................................................................................................................................................................................</div>
            <table className="sig-layout-table">
              <tbody>
                <tr>
                  <td style={{ width: '45%' }}></td>
                  <td className="sig-cell">
                    (ลงชื่อ) ............................................................<br />
                    (....................................................)<br />
                    ผู้อำนวยการ............................................
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,700;1,400&display=swap');
        
        body {
          background: #525659;
          margin: 0;
          padding: 0;
        }
        .preview-container {
          font-family: "TH Sarabun New", "Sarabun", "Arial", sans-serif;
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
          padding: 20mm 20mm 20mm 25mm;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
          box-sizing: border-box;
          color: #000;
          line-height: 1.0;
          font-size: 16pt;
        }
        .doc-title {
          text-align: center;
          font-size: 20pt;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 2px;
          line-height: 1.0;
        }
        .info-table td {
          padding: 0px !important;
          margin: 0px !important;
          font-size: 16pt;
          vertical-align: middle;
          border: none;
          height: 22px;
        }
        .label {
          font-weight: bold;
        }
        .section {
          margin-top: 10px;
        }
        .section-title {
          font-weight: bold;
          font-size: 16pt;
          margin-bottom: 4px;
          text-align: left;
          margin-left: 0;
          padding-left: 0;
        }
        .section-content {
          margin-left: 0.75cm;
          font-size: 16pt;
          text-align: left;
          line-height: 1.0;
        }
        .section-content-list {
          margin-left: 0.75cm;
          font-size: 16pt;
          line-height: 1.0;
        }
        .indent-p {
          margin: 2px 0 4px 0;
          text-indent: 0.5cm;
          text-align: left;
        }
        
        .sub-heading {
          font-weight: bold;
          margin-left: 0.75cm;
          margin-top: 4px;
          margin-bottom: 2px;
          font-size: 16pt;
        }
        .sub-content {
          margin-left: 1.25cm;
          font-size: 16pt;
          text-align: left;
        }
        .indicator-line {
          text-indent: 0;
          margin-bottom: 2px;
          text-align: left;
        }

        .list-wrapper {
          padding-left: 0;
          margin: 4px 0;
        }
        .list-item {
          margin-left: 1.25cm;
          text-indent: -0.5cm;
          margin-bottom: 4px;
          text-align: left;
        }

        .assessment-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          margin-bottom: 12px;
          font-size: 14pt;
        }
        .assessment-table th,
        .assessment-table td {
          border: 1px solid #000;
          padding: 4px 8px;
          vertical-align: top;
          font-size: 14pt;
          text-align: left;
          line-height: 1.1;
        }
        .assessment-table th {
          font-weight: bold;
          text-align: center;
          background: #ffffff;
        }
        
        /* Signature Approval Styles */
        .sig-section {
          margin-top: 30px;
          page-break-before: always;
        }
        .sig-title {
          font-weight: bold;
          font-size: 16pt;
          margin-top: 20px;
          text-align: left;
          margin-bottom: 15px;
        }
        .comment-block {
          margin-top: 12px;
          page-break-inside: avoid;
        }
        .comment-heading {
          font-weight: bold;
          font-size: 15pt;
          margin-bottom: 2px;
        }
        .comment-line {
          color: #333;
          font-size: 15pt;
          line-height: 1.2;
          margin-bottom: 2px;
          letter-spacing: 1px;
        }
        .sig-layout-table {
          width: 100%;
          border: none;
          margin-top: 6px;
        }
        .sig-layout-table td {
          border: none;
          padding: 0;
        }
        .sig-cell {
          text-align: center;
          font-size: 15pt;
          line-height: 1.6;
        }

        p {
          margin: 2px 0 4px;
        }

        @media print {
          @page {
            size: A4;
            margin: 20mm 20mm 20mm 25mm;
          }
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
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            zoom: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
