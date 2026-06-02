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

  const isStepHeader = (line: string): boolean => {
    const normalized = line.toLowerCase();
    return (
      normalized.includes('warm-up') || normalized.includes('warm up') ||
      normalized.includes('presentation') ||
      normalized.includes('practice') ||
      normalized.includes('production') ||
      normalized.includes('wrap-up') || normalized.includes('warp-up') ||
      normalized.includes('wrap up') || normalized.includes('warp up')
    );
  };

  const renderLearningProcess = (val: any) => {
    if (val === undefined || val === null) return '';
    const lines = String(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      if (isStepHeader(line)) {
        return (
          <div key={idx} className="sub-heading" style={{ marginTop: idx > 0 ? '12px' : '4px' }}>
            {line}
          </div>
        );
      } else {
        return (
          <div key={idx} className="sub-content" style={{ marginTop: '2px', textIndent: '0.5cm' }}>
            {line}
          </div>
        );
      }
    });
  };

  const cleanSubContentVal = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, idx) => (
        <p key={idx} className="sub-content" style={{ textIndent: '0.5cm', marginTop: '2px', marginBottom: '4px' }}>
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
    
    let rawStr = String(val).trim();
    let items: string[] = [];
    
    // Check if it's a JSON array or object
    if (rawStr.startsWith('[') || rawStr.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawStr);
        if (Array.isArray(parsed)) {
          items = parsed.map(x => String(x).trim());
        } else if (typeof parsed === 'object') {
          items = Object.values(parsed).map(x => String(x).trim());
        }
      } catch (e) {
        // fallback
      }
    }
    
    if (items.length === 0) {
      items = rawStr
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    }
    
    const cleanedLines = items
      .map(line => {
        // remove leading bullet points like -, *, •, or numbers like 1., 1)
        let cleaned = line.replace(/^([-*•]|\d+[\s.)])\s*/, '');
        // remove residual JSON brackets, quotes, braces
        cleaned = cleaned.replace(/[{}|[\]"]/g, '').trim();
        return cleaned;
      })
      .filter(Boolean);
    
    if (cleanedLines.length === 0) return '';
    
    return (
      <div className="list-wrapper">
        {cleanedLines.map((line, idx) => (
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
        
        <table className="top-grid">
          <tbody>
            <tr>
              <td><span className="label">ชื่อ-นามสกุลครูผู้สอน:</span> {plan.teacherName}</td>
              <td><span className="label">โรงเรียน:</span> {plan.schoolName}</td>
            </tr>
            <tr>
              <td><span className="label">สังกัด:</span> {plan.organization}</td>
              <td><span className="label">กลุ่มสาระการเรียนรู้:</span> {plan.headerLearningArea}</td>
            </tr>
            <tr>
              <td><span className="label">ระดับชั้น:</span> {plan.headerGradeLevel}</td>
              <td><span className="label">ปีการศึกษา:</span> {plan.academicYear}</td>
            </tr>
            <tr>
              <td><span className="label">รายวิชา:</span> {plan.subjectName}</td>
              <td><span className="label">รหัสวิชา:</span> {plan.subjectCode}</td>
            </tr>
            <tr>
              <td><span className="label">ภาคเรียนที่:</span> {plan.semester}</td>
              <td><span className="label">เวลาเรียน:</span> {plan.totalHours} ชั่วโมง</td>
            </tr>
            <tr>
              <td><span className="label">หน่วยการเรียนรู้:</span> {plan.unitName}</td>
              <td><span className="label">เรื่องที่สอน:</span> {plan.lessonTopic}</td>
            </tr>
          </tbody>
        </table>

        <div className="section">
          <div className="section-title">1. มาตรฐานการเรียนรู้ / ตัวชี้วัด</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <p><span className="label">มาตรฐานการเรียนรู้:</span><br />{renderIndicators(plan.learningStandard)}</p>
            <p style={{ marginTop: '6px' }}><span className="label">ตัวชี้วัดระหว่างทาง:</span><br />{renderIndicators(plan.indicatorDuring)}</p>
            <p style={{ marginTop: '6px' }}><span className="label">ตัวชี้วัดปลายทาง:</span><br />{renderIndicators(plan.indicatorFinal)}</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title">2. สาระสำคัญ (Concept)</div>
          <div className="section-content">{cleanVal(plan.essentialConcept)}</div>
        </div>

        <div className="section">
          <div className="section-title">3. จุดประสงค์การเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <p><span className="label">ด้านความรู้ (K):</span><br />{cleanTableCellVal(plan.objectiveK)}</p>
            <p style={{ marginTop: '6px' }}><span className="label">ด้านทักษะกระบวนการ (P):</span><br />{cleanTableCellVal(plan.objectiveP)}</p>
            <p style={{ marginTop: '6px' }}><span className="label">ด้านคุณลักษณะ (A):</span><br />{cleanTableCellVal(plan.objectiveA)}</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title">4. สาระการเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningContent)}</div>
        </div>

        <div className="section">
          <div className="section-title">5. สมรรถนะสำคัญของผู้เรียน</div>
          <div className="section-content-list">{renderList(plan.competencies)}</div>
        </div>

        <div className="section">
          <div className="section-title">6. คุณลักษณะอันพึงประสงค์</div>
          <div className="section-content-list">{renderList(plan.desiredAttributes)}</div>
        </div>

        <div className="section">
          <div className="section-title">7. ทักษะที่จำเป็นในศตวรรษที่ 21</div>
          <div className="section-content-list">{renderList(plan.skills21)}</div>
        </div>

        <div className="section">
          <div className="section-title">8. กระบวนการจัดการเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>{renderLearningProcess(plan.learningProcess)}</div>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">9. การวัดและประเมินผลการเรียนรู้</div>
          <table className="assessment-table">
            <thead>
              <tr>
                <th style={{ width: '10%', textAlign: 'center' }}>ด้าน</th>
                <th style={{ width: '25%' }}>สิ่งที่ต้องการวัดและประเมินผล</th>
                <th style={{ width: '20%' }}>วิธีการวัดผล</th>
                <th style={{ width: '25%' }}>เครื่องมือวัดผล</th>
                <th style={{ width: '20%' }}>เกณฑ์การประเมิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>ความรู้<br />(K)</td>
                <td>{cleanTableCellVal(plan.measureK)}</td>
                <td>{cleanTableCellVal(plan.methodK)}</td>
                <td>{cleanTableCellVal(plan.toolK)}</td>
                <td>{cleanTableCellVal(plan.criteriaK)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>ทักษะ<br />(P)</td>
                <td>{cleanTableCellVal(plan.measureP)}</td>
                <td>{cleanTableCellVal(plan.methodP)}</td>
                <td>{cleanTableCellVal(plan.toolP)}</td>
                <td>{cleanTableCellVal(plan.criteriaP)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'center', fontWeight: 'bold' }}>คุณลักษณะ<br />(A)</td>
                <td>{cleanTableCellVal(plan.measureA)}</td>
                <td>{cleanTableCellVal(plan.methodA)}</td>
                <td>{cleanTableCellVal(plan.toolA)}</td>
                <td>{cleanTableCellVal(plan.criteriaA)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">9.1 เกณฑ์การประเมินผลการเรียนรู้ (Rubrics)</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            {plan.rubricK && (
              <>
                <div className="sub-heading">เกณฑ์ประเมินด้านความรู้ (K):</div>
                {cleanSubContentVal(plan.rubricK)}
              </>
            )}
            {plan.rubricP && (
              <>
                <div className="sub-heading" style={{ marginTop: '8px' }}>เกณฑ์ประเมินด้านทักษะกระบวนการ (P):</div>
                {cleanSubContentVal(plan.rubricP)}
              </>
            )}
            {plan.rubricA && (
              <>
                <div className="sub-heading" style={{ marginTop: '8px' }}>เกณฑ์ประเมินด้านคุณลักษณะ (A):</div>
                {cleanSubContentVal(plan.rubricA)}
              </>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">10. สื่อการเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningMedia) || '..................................................'}</div>
        </div>

        <div className="section">
          <div className="section-title">11. แหล่งเรียนรู้</div>
          <div className="section-content">{cleanVal(plan.learningSources) || '..................................................'}</div>
        </div>

        <div className="section">
          <div className="section-title">12. ชิ้นงาน / ภาระงาน</div>
          <div className="section-content">{cleanVal(plan.tasks) || '..................................................'}</div>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">13. บันทึกหลังการจัดกระบวนการเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div className="sub-heading">1) ผลการจัดการเรียนรู้</div>
            <div className="sub-content" style={{ marginTop: '2px' }}>
              <div style={{ textIndent: '0.5cm', marginBottom: '2px' }}>
                <strong>- ด้านความรู้ (K):</strong> {cleanTableCellVal(plan.resultK)}
              </div>
              <div style={{ textIndent: '0.5cm', marginBottom: '2px' }}>
                <strong>- ด้านทักษะกระบวนการ (P):</strong> {cleanTableCellVal(plan.resultP)}
              </div>
              <div style={{ textIndent: '0.5cm', marginBottom: '4px' }}>
                <strong>- ด้านคุณลักษณะ (A):</strong> {cleanTableCellVal(plan.resultA)}
              </div>
            </div>
            
            <div className="sub-heading" style={{ marginTop: '6px' }}>2) ปัญหา/อุปสรรค</div>
            {cleanSubContentVal(plan.problems)}
            
            <div className="sub-heading" style={{ marginTop: '6px' }}>3) ข้อเสนอแนะ/แนวทางแก้ไข</div>
            {cleanSubContentVal(plan.solutions)}
          </div>
        </div>

        {/* Lesson Plan Signatures Block */}
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
         .top-grid {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #555;
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .top-grid td {
          width: 50%;
          padding: 4px 10px !important;
          vertical-align: top;
          border-bottom: 1px solid #bbb;
          font-size: 15px;
        }
        .top-grid tr:last-child td { border-bottom: none; }
        .top-grid td:first-child { border-right: 1px solid #bbb; }

        .sig-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-table td {
          width: 50%;
          text-align: center;
          padding: 6px 12px;
          font-size: 15pt;
          vertical-align: top;
          line-height: 1.6;
        }
        .sig-line {
          border-top: 1px solid #333;
          margin: 28px auto 4px;
          width: 72%;
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
