'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PlanPreview() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(90);

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
        <button onClick={() => router.push('/dashboard')} style={{ marginTop: '16px', padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const sanitize = (val: any) => {
    if (val === undefined || val === null) return '';
    return String(val).replace(/\s*[\(\[]?(แก้ไข|ปรับปรุง|แนะนำ)?โดย\s*(AI|เอไอ)[\)\]]?\s*/gi, ' ').trim();
  };

  // Format standard body text paragraph indentation
  const cleanVal = (val: any) => {
    if (val === undefined || val === null) return '';
    return sanitize(val)
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
    const lines = sanitize(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    return lines.map((line, idx) => {
      if (isStepHeader(line)) {
        return (
          <div key={idx} className="sub-heading" style={{ marginTop: idx > 0 ? '12px' : '4px', fontWeight: 'bold', textIndent: '0' }}>
            {line.replace(/^[-*•]\s*/, '')}
          </div>
        );
      } else {
        return (
          <div key={idx} className="sub-content" style={{ marginTop: '2px', textIndent: '1.25cm' }}>
            {line.replace(/^[-*•]\s*/, '')}
          </div>
        );
      }
    });
  };

  const cleanSubContentVal = (val: any) => {
    if (val === undefined || val === null) return '';
    return sanitize(val)
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
    return sanitize(val).split('\n').map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        <br />
      </React.Fragment>
    ));
  };

  // Render multiple indicators line by line, ensuring same left indentation (1.25cm)
  const renderIndicators = (val: any) => {
    if (!val) return '-';
    const lines = sanitize(val)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return '-';
    return lines.map((line, i) => <div key={i} style={{ paddingLeft: '1.25cm' }}>{line}</div>);
  };

  const renderStandards = (val: any) => {
    if (!val) return '-';
    const lines = String(val)
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('มาตรฐาน'));
    if (lines.length === 0) return '-';
    return lines.map((line, i) => <div key={i} style={{ paddingLeft: '1.25cm' }}>{line}</div>);
  };

  // Clean list formatting without prepending bullets
  const renderList = (val: any, prefix?: string) => {
    if (!val) return '';
    
    let rawStr = sanitize(val).trim();
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
        // remove leading bullet points like -, *, • but preserve numbers like 3.1
        let cleaned = line.replace(/^[-*•]\s+/, '');
        // remove residual JSON brackets, quotes, braces
        cleaned = cleaned.replace(/[{}|[\]"]/g, '').trim();
        return cleaned;
      })
      .filter(Boolean);
    
    if (cleanedLines.length === 0) return '';
    
    return (
      <div className="list-wrapper">
        {cleanedLines.map((line, idx) => (
          <div key={idx} className="list-item" style={{ marginBottom: '4px' }}>
            {line}
          </div>
        ))}
      </div>
    );
  };

  const parseRubricText = (text: string) => {
    if (!text) return [];
    
    text = sanitize(text);
    // Split by newlines
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    const levels = [
      { score: 5, label: '5 คะแนน (ดีเยี่ยม)', text: '' },
      { score: 4, label: '4 คะแนน (ดี)', text: '' },
      { score: 3, label: '3 คะแนน (พอใช้/ปานกลาง)', text: '' },
      { score: 2, label: '2 คะแนน (ปรับปรุงบางส่วน)', text: '' },
      { score: 1, label: '1 คะแนน (ปรับปรุงเร่งด่วน)', text: '' },
    ];
    
    let parsedAny = false;
    
    lines.forEach(line => {
      // Regex pattern to extract score digit: e.g. "ระดับ 5 = ..." or "5 = ..." or "ระดับ 5: ..."
      const match = line.match(/(?:ระดับ|คะแนน|\s|^)\s*([1-5])\s*(?:คะแนน|ระดับ)?\s*[:=-]\s*(.*)/i)
                    || line.match(/(?:ระดับ|คะแนน)?\s*([1-5])\s*(?:คะแนน|ระดับ)?\s+(.*)/i);
      if (match) {
        const score = parseInt(match[1]);
        const content = match[2].trim();
        const levelObj = levels.find(l => l.score === score);
        if (levelObj) {
          levelObj.text = content;
          parsedAny = true;
        }
      }
    });
    
    // Semicolon/comma split if no lines matched
    if (!parsedAny) {
      const parts = text.split(/[,;]\s*(?=ระดับ\s*[1-5])/i);
      if (parts.length > 1) {
        parts.forEach(part => {
          const match = part.match(/(?:ระดับ|คะแนน|\s|^)\s*([1-5])\s*(?:คะแนน|ระดับ)?\s*[:=-]\s*(.*)/i)
                        || part.match(/(?:ระดับ|คะแนน)?\s*([1-5])\s*(?:คะแนน|ระดับ)?\s+(.*)/i);
          if (match) {
            const score = parseInt(match[1]);
            const content = match[2].trim();
            const levelObj = levels.find(l => l.score === score);
            if (levelObj) {
              levelObj.text = content;
              parsedAny = true;
            }
          }
        });
      }
    }
    
    // Word scanning if still not parsed
    if (!parsedAny) {
      let remainingText = text;
      for (let s = 5; s >= 1; s--) {
        const currentMarker = `ระดับ ${s}`;
        const nextMarker = s > 1 ? `ระดับ ${s - 1}` : null;
        
        const startIndex = remainingText.indexOf(currentMarker);
        if (startIndex !== -1) {
          let endIndex = remainingText.length;
          if (nextMarker) {
            const nextIndex = remainingText.indexOf(nextMarker);
            if (nextIndex !== -1 && nextIndex > startIndex) {
              endIndex = nextIndex;
            }
          }
          let content = remainingText.substring(startIndex + currentMarker.length, endIndex);
          content = content.replace(/^[:=\-\s]+/, '').trim();
          const levelObj = levels.find(l => l.score === s);
          if (levelObj) {
            levelObj.text = content;
            parsedAny = true;
          }
        }
      }
    }
    
    // Fallback distribution
    if (!parsedAny) {
      if (lines.length > 0) {
        lines.forEach((line, idx) => {
          if (idx < 5) {
            levels[idx].text = line;
          }
        });
      } else {
        levels[2].text = text;
      }
    }
    
    return levels;
  };

  const renderRubricTable = (rubricText: string) => {
    const levels = parseRubricText(rubricText);
    return (
      <table className="assessment-table" style={{ marginTop: '8px', marginBottom: '16px', width: '100%', fontSize: '13pt' }}>
        <thead>
          <tr>
            <th style={{ width: '25%', textAlign: 'center', fontWeight: 'bold' }}>ระดับคะแนน</th>
            <th style={{ width: '75%', textAlign: 'left', fontWeight: 'bold' }}>เกณฑ์การพิจารณา (คำอธิบายคุณภาพ)</th>
          </tr>
        </thead>
        <tbody>
          {levels.map(l => (
            <tr key={l.score}>
              <td style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', width: '25%' }}>{l.label}</td>
              <td style={{ verticalAlign: 'top', padding: '6px 8px', width: '75%' }}>{l.text || '......................................................................'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <ErrorBoundary>
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
            <option value={90}>90% (เหมือน localhost)</option>
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
              <td style={{ width: '15%', fontWeight: 'bold' }}>รายวิชา</td>
              <td style={{ width: '53%' }}>{plan.subjectName} ({plan.subjectCode})</td>
              <td style={{ width: '8%', fontWeight: 'bold' }}>ภาคเรียน</td>
              <td style={{ width: '24%' }}>ภาคเรียนที่ {plan.semester}/{plan.academicYear}</td>
            </tr>
          </tbody>
        </table>
        <table className="info-table">
          <tbody>
            <tr>
              <td style={{ width: '15%', fontWeight: 'bold' }}>ชื่อหน่วย</td>
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
            <p><span className="label">มาตรฐานการเรียนรู้:</span><br />{renderStandards(plan.learningStandard)}</p>
            <p style={{ marginTop: '6px' }}><span className="label">ตัวชี้วัดระหว่างทาง:</span><br />{renderIndicators(plan.indicatorDuring)}</p>
            <p style={{ marginTop: '6px' }}><span className="label">ตัวชี้วัดปลายทาง:</span><br />{renderIndicators(plan.indicatorFinal)}</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title">3. สมรรถนะสำคัญของผู้เรียน</div>
          <div className="section-content-list">{renderList(plan.competencies, '3')}</div>
        </div>

        <div className="section">
          <div className="section-title">4. คุณลักษณะอันพึงประสงค์</div>
          <div className="section-content-list">{renderList(plan.desiredAttributes, '4')}</div>
        </div>

        <div className="section">
          <div className="section-title">5. ทักษะที่จำเป็นในศตวรรษที่ 21</div>
          <div className="section-content-list">{renderList(plan.skills21, '5')}</div>
        </div>

        <div className="section">
          <div className="section-title">6. จุดประสงค์การเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div style={{ marginLeft: '0.75cm', marginTop: '4px' }}>
              <span className="label">ด้านความรู้ (K):</span>
              <div style={{ marginLeft: '0.75cm', marginTop: '2px' }}>
                {sanitize(plan.objectiveK)?.split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
              </div>
            </div>
            <div style={{ marginLeft: '0.75cm', marginTop: '6px' }}>
              <span className="label">ด้านทักษะกระบวนการ (P):</span>
              <div style={{ marginLeft: '0.75cm', marginTop: '2px' }}>
                {sanitize(plan.objectiveP)?.split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
              </div>
            </div>
            <div style={{ marginLeft: '0.75cm', marginTop: '6px' }}>
              <span className="label">ด้านคุณลักษณะ (A):</span>
              <div style={{ marginLeft: '0.75cm', marginTop: '2px' }}>
                {sanitize(plan.objectiveA)?.split('\n').filter(Boolean).map((l: string, i: number) => <div key={i}>{l}</div>)}
              </div>
            </div>
          </div>
        </div>

        {plan.learningContent && (
          <div className="section">
            <div className="section-title">7. เนื้อหาสาระ / สาระการเรียนรู้</div>
            <div className="section-content">{cleanVal(plan.learningContent)}</div>
          </div>
        )}

        <div className="section">
          <div className="section-title">8. สื่อและแหล่งการเรียนรู้</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            <div className="sub-heading">8.1 สื่อการเรียนรู้:</div>
            <div className="sub-content">{cleanVal(plan.learningMedia) || '..................................................'}</div>
            <div className="sub-heading" style={{ marginTop: '6px' }}>8.2 แหล่งเรียนรู้:</div>
            <div className="sub-content">{cleanVal(plan.learningSources) || '..................................................'}</div>
            <div className="sub-heading" style={{ marginTop: '6px' }}>8.3 ชิ้นงาน / ภาระงาน:</div>
            <div className="sub-content">{cleanVal(plan.tasks) || '..................................................'}</div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">9. วิธีการดำเนินกิจกรรม ตามแนวคิด Active Learning</div>
          <div className="section-content" style={{ marginLeft: '0' }}>{renderLearningProcess(plan.learningProcess)}</div>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">10. การวัดและการประเมินผล</div>
          <table className="assessment-table">
            <thead>
              <tr>
                <th style={{ width: '40%', textAlign: 'center' }}>สิ่งที่ต้องการวัดและประเมินผล</th>
                <th style={{ width: '20%', textAlign: 'center' }}>วิธีการวัดผล</th>
                <th style={{ width: '20%', textAlign: 'center' }}>เครื่องมือวัดผล</th>
                <th style={{ width: '20%', textAlign: 'center' }}>เกณฑ์การประเมิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1) ด้านความรู้ (K):</strong><br />{cleanTableCellVal(plan.measureK)}</td>
                <td>{cleanTableCellVal(plan.methodK)}</td>
                <td>{cleanTableCellVal(plan.toolK)}</td>
                <td>{cleanTableCellVal(plan.criteriaK)}</td>
              </tr>
              <tr>
                <td><strong>2) ด้านทักษะกระบวนการ (P):</strong><br />{cleanTableCellVal(plan.measureP)}</td>
                <td>{cleanTableCellVal(plan.methodP)}</td>
                <td>{cleanTableCellVal(plan.toolP)}</td>
                <td>{cleanTableCellVal(plan.criteriaP)}</td>
              </tr>
              <tr>
                <td><strong>3) ด้านคุณลักษณะ (A):</strong><br />{cleanTableCellVal(plan.measureA)}</td>
                <td>{cleanTableCellVal(plan.methodA)}</td>
                <td>{cleanTableCellVal(plan.toolA)}</td>
                <td>{cleanTableCellVal(plan.criteriaA)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">10.1 เกณฑ์การประเมินผลการเรียนรู้ (Rubrics)</div>
          <div className="section-content" style={{ marginLeft: '0' }}>
            {plan.rubricK && (
              <>
                <div className="sub-heading">เกณฑ์ประเมินด้านความรู้ (K):</div>
                {renderRubricTable(plan.rubricK)}
              </>
            )}
            {plan.rubricP && (
              <>
                <div className="sub-heading" style={{ marginTop: '8px' }}>เกณฑ์ประเมินด้านทักษะกระบวนการ (P):</div>
                {renderRubricTable(plan.rubricP)}
              </>
            )}
            {plan.rubricA && (
              <>
                <div className="sub-heading" style={{ marginTop: '8px' }}>เกณฑ์ประเมินด้านคุณลักษณะ (A):</div>
                {renderRubricTable(plan.rubricA)}
              </>
            )}
          </div>
        </div>

        <div className="section" style={{ pageBreakInside: 'avoid' }}>
          <div className="section-title">11. บันทึกหลังการจัดกระบวนการเรียนรู้</div>
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
        <table className="sig-table" style={{ width: '100%', marginTop: '30px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%' }}></td>
              <td style={{ width: '50%', textAlign: 'center' }}>
                <div className="sig-line" style={{ width: '70%', margin: '0 auto 4px' }}></div>
                <p>({plan.teacherName})</p>
                <p>ครูผู้สอน</p>
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
        @font-face {
          font-family: "TH Sarabun New";
          src: url("/fonts/THSarabunNew.ttf") format("truetype");
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "TH Sarabun New";
          src: url("/fonts/THSarabunNew-Bold.ttf") format("truetype");
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: "TH Sarabun New";
          src: url("/fonts/THSarabunNew-Italic.ttf") format("truetype");
          font-weight: 400;
          font-style: italic;
          font-display: swap;
        }
        @font-face {
          font-family: "TH Sarabun New";
          src: url("/fonts/THSarabunNew-BoldItalic.ttf") format("truetype");
          font-weight: 700;
          font-style: italic;
          font-display: swap;
        }
        
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
          font-size: 15pt;
        }
        .doc-title {
          text-align: center;
          font-size: 18pt;
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
          font-size: 15pt;
          vertical-align: middle;
          border: none;
          height: 22px;
        }

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
          font-size: 14pt;
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
          font-size: 15pt;
          margin-bottom: 4px;
          text-align: left;
          margin-left: 0;
          padding-left: 0;
        }
        .section-content {
          margin-left: 0.75cm;
          font-size: 15pt;
          text-align: left;
          line-height: 1.0;
        }
        .section-content-list {
          margin-left: 0.75cm;
          font-size: 15pt;
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
          font-size: 15pt;
        }
        .sub-content {
          margin-left: 1.25cm;
          font-size: 15pt;
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
          font-size: 13pt;
        }
        .assessment-table th,
        .assessment-table td {
          border: 1px solid #000;
          padding: 4px 8px;
          vertical-align: top;
          font-size: 13pt;
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
          font-size: 15pt;
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
          font-size: 14pt;
          margin-bottom: 2px;
        }
        .comment-line {
          color: #333;
          font-size: 14pt;
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
          font-size: 14pt;
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
    </ErrorBoundary>
  );
}
