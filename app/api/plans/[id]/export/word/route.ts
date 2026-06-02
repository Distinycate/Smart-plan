import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to escape HTML tags for presentation inside Word
const cleanVal = (val: any) => {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
};

// Clean HTML list formatting (e.g. - chips to 1) 2) 3)) for Word (with 20pt left margin)
const renderListWord = (val: any) => {
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
  
  return `<div style="margin: 4px 0;">` + cleanedLines.map((line, idx) => {
    return `<div style="margin-left: 35pt; text-indent: -15pt; margin-bottom: 4px; text-align: left;">${idx + 1}) ${line}</div>`;
  }).join('') + `</div>`;
};

// Clean paragraph elements with small indents for Word
const cleanParagraphsWord = (val: any) => {
  if (val === undefined || val === null) return '';
  return String(val)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      return `<p style="margin: 2px 0 4px 0; text-indent: 15pt; text-align: left;">${line}</p>`;
    })
    .join('');
};

// Format multiple indicators with consistent indentation (35pt)
const renderIndicatorsWord = (val: any) => {
  if (!val) return '';
  return String(val)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      return `<div style="margin-left: 35pt; text-indent: 0; margin-bottom: 2px; text-align: left;">${line}</div>`;
    })
    .join('');
};

// Parse learning process steps and apply bold & indents for Word
const renderLearningProcessWord = (val: any) => {
  if (val === undefined || val === null) return '';
  const lines = String(val)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return lines.map((line, idx) => {
    const isStep = (l: string): boolean => {
      const normalized = l.toLowerCase();
      return (
        normalized.includes('warm-up') || normalized.includes('warm up') ||
        normalized.includes('presentation') ||
        normalized.includes('practice') ||
        normalized.includes('production') ||
        normalized.includes('wrap-up') || normalized.includes('warp-up') ||
        normalized.includes('wrap up') || normalized.includes('warp up')
      );
    };

    if (isStep(line)) {
      return `<div class="sub-heading" style="margin-top: ${idx > 0 ? '12pt' : '4pt'}; font-weight: bold; margin-left: 20pt; font-size: 16pt;">${line}</div>`;
    } else {
      return `<div class="sub-content" style="margin-left: 35pt; text-indent: 15pt; margin-top: 2pt; margin-bottom: 4pt; text-align: left; font-size: 16pt;">${line}</div>`;
    }
  }).join('');
};

// Format sub-content body text with paragraph indentation for Word
const cleanSubContentWord = (val: any) => {
  if (val === undefined || val === null) return '';
  return String(val)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      return `<p class="sub-content" style="margin: 2px 0 4px 0; text-indent: 15pt; text-align: left; margin-left: 35pt; font-size: 16pt;">${line}</p>`;
    })
    .join('');
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Fetch the plan details
    const { data: plan, error } = await supabase
      .from('LessonPlans')
      .select('*')
      .eq('planId', id)
      .single();

    if (error || !plan) {
      return new Response('Lesson plan not found', { status: 404 });
    }

    // 2. Build HTML Content for Word Doc using standard ministry template
    const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @page Section1 {
      size: 595.3pt 841.9pt; /* A4 Size */
      margin: 56.7pt 56.7pt 56.7pt 70.9pt; /* Margins: Top 20mm, Right 20mm, Bottom 20mm, Left 25mm */
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }
    body {
      font-family: "TH Sarabun New", "Sarabun", "Arial", sans-serif;
      font-size: 16pt;
      line-height: 1.0;
      color: #000;
    }
    .doc-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 18px;
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
    .label { font-weight: bold; }
    .section { margin-top: 10px; }
    .section-title { font-weight: bold; font-size: 16pt; margin-bottom: 4px; text-align: left; }
    .section-content { margin-left: 20pt; font-size: 16pt; text-align: left; }
    .section-content-list { margin-left: 20pt; font-size: 16pt; }
    .sub-heading { font-weight: bold; margin-left: 20pt; margin-top: 4px; margin-bottom: 2px; font-size: 16pt; }
    .sub-content { margin-left: 35pt; font-size: 16pt; text-align: left; }
    .assessment-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 15px;
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
    }
    .comment-heading {
      font-weight: bold;
      font-size: 15pt;
      margin-bottom: 2px;
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
    p { margin: 2px 0 4px; }
  </style>
</head>
<body>

  <div class="Section1">
    <div class="doc-title">แผนการจัดการเรียนรู้</div>

    <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; line-height: 1.0;">
       <tbody>
         <tr style="height: 22px;">
           <td style="width: 12%; font-weight: bold; padding: 0px; font-size: 16pt;">ชื่อ-นามสกุล</td>
           <td style="width: 28%; padding: 0px; font-size: 16pt;">${cleanVal(plan.teacherName)}</td>
           <td style="width: 10%; font-weight: bold; padding: 0px; font-size: 16pt;">โรงเรียน</td>
           <td style="width: 18%; padding: 0px; font-size: 16pt;">${cleanVal(plan.schoolName)}</td>
           <td style="width: 8%; font-weight: bold; padding: 0px; font-size: 16pt;">สังกัด</td>
           <td style="width: 24%; padding: 0px; font-size: 16pt;">${cleanVal(plan.organization)}</td>
         </tr>
       </tbody>
     </table>
     <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; line-height: 1.0;">
       <tbody>
         <tr style="height: 22px;">
           <td style="width: 15%; font-weight: bold; padding: 0px; font-size: 16pt;">กลุ่มสาระ</td>
           <td style="width: 53%; padding: 0px; font-size: 16pt;">${cleanVal(plan.headerLearningArea)}</td>
           <td style="width: 8%; font-weight: bold; padding: 0px; font-size: 16pt;">ระดับชั้น</td>
           <td style="width: 24%; padding: 0px; font-size: 16pt;">${cleanVal(plan.headerGradeLevel)}</td>
         </tr>
       </tbody>
     </table>
     <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; line-height: 1.0;">
       <tbody>
         <tr style="height: 22px;">
           <td style="width: 15%; font-weight: bold; padding: 0px; font-size: 16pt;">รายวิชา</td>
           <td style="width: 53%; padding: 0px; font-size: 16pt;">${cleanVal(plan.subjectName)} (${cleanVal(plan.subjectCode)})</td>
           <td style="width: 8%; font-weight: bold; padding: 0px; font-size: 16pt;">ภาคเรียน</td>
           <td style="width: 24%; padding: 0px; font-size: 16pt;">ภาคเรียนที่ ${cleanVal(plan.semester)}/${cleanVal(plan.academicYear)}</td>
         </tr>
       </tbody>
     </table>
     <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; line-height: 1.0;">
       <tbody>
         <tr style="height: 22px;">
           <td style="width: 15%; font-weight: bold; padding: 0px; font-size: 16pt;">ชื่อหน่วย</td>
           <td style="width: 53%; padding: 0px; font-size: 16pt;">${cleanVal(plan.unitName)}</td>
           <td style="width: 8%; font-weight: bold; padding: 0px; font-size: 16pt;">เวลา</td>
           <td style="width: 24%; padding: 0px; font-size: 16pt;">${cleanVal(plan.totalHours)} ชั่วโมง</td>
         </tr>
       </tbody>
     </table>
     <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 15px; line-height: 1.0;">
       <tbody>
         <tr style="height: 22px;">
           <td style="width: 10%; font-weight: bold; padding: 0px; font-size: 16pt;">วันที่สอน</td>
           <td style="width: 30%; padding: 0px; font-size: 16pt;"></td>
           <td style="width: 8%; font-weight: bold; padding: 0px; font-size: 16pt;">เรื่อง</td>
           <td style="width: 52%; padding: 0px; font-size: 16pt;">${cleanVal(plan.lessonTopic)}</td>
         </tr>
       </tbody>
     </table>

     <div class="section">
       <div class="section-title">1. สาระสำคัญ</div>
       <div class="section-content">${cleanParagraphsWord(plan.essentialConcept)}</div>
     </div>

     <div class="section">
       <div class="section-title">2. มาตรฐานการเรียนรู้และตัวชี้วัด</div>
       <div class="section-content" style="margin-left: 0;">
         <p><span class="label">มาตรฐานการเรียนรู้:</span><br>${renderIndicatorsWord(plan.learningStandard)}</p>
         <p style="margin-top: 6px;"><span class="label">ตัวชี้วัดระหว่างทาง:</span><br>${renderIndicatorsWord(plan.indicatorDuring)}</p>
         <p style="margin-top: 6px;"><span class="label">ตัวชี้วัดปลายทาง:</span><br>${renderIndicatorsWord(plan.indicatorFinal)}</p>
       </div>
     </div>

     <div class="section">
       <div class="section-title">3. สมรรถนะสำคัญของผู้เรียน</div>
       <div class="section-content-list">${renderListWord(plan.competencies)}</div>
     </div>

     <div class="section">
       <div class="section-title">4. คุณลักษณะอันพึงประสงค์</div>
       <div class="section-content-list">${renderListWord(plan.desiredAttributes)}</div>
     </div>

     <div class="section">
       <div class="section-title">5. จุดประสงค์การเรียนรู้</div>
       <div class="section-content" style="margin-left: 0;">
         <p><span class="label">ด้านความรู้ (K):</span><br>${cleanParagraphsWord(plan.objectiveK)}</p>
         <p style="margin-top: 6px;"><span class="label">ด้านทักษะกระบวนการ (P):</span><br>${cleanParagraphsWord(plan.objectiveP)}</p>
         <p style="margin-top: 6px;"><span class="label">ด้านคุณลักษณะ (A):</span><br>${cleanParagraphsWord(plan.objectiveA)}</p>
       </div>
     </div>

     <div class="section">
       <div class="section-title">5.1 ทักษะที่จำเป็นในศตวรรษที่ 21</div>
       <div class="section-content-list">${renderListWord(plan.skills21)}</div>
     </div>

     <div class="section">
       <div class="section-title">6. เนื้อหาสาระ</div>
       <div class="section-content">${cleanParagraphsWord(plan.learningContent)}</div>
     </div>

     <div class="section">
       <div class="section-title">7. สื่อและแหล่งการเรียนรู้</div>
       <div class="section-content" style="margin-left: 0;">
         <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt;">1) สื่อการเรียนรู้:</div>
         <div class="sub-content" style="margin-left: 35pt; text-indent: 15pt; margin-top: 2pt; margin-bottom: 4pt; text-align: left; font-size: 16pt;">${cleanVal(plan.learningMedia) || '..................................................'}</div>
         <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt; margin-top: 6pt;">2) แหล่งเรียนรู้:</div>
         <div class="sub-content" style="margin-left: 35pt; text-indent: 15pt; margin-top: 2pt; margin-bottom: 4pt; text-align: left; font-size: 16pt;">${cleanVal(plan.learningSources) || '..................................................'}</div>
         <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt; margin-top: 6pt;">3) ชิ้นงาน / ภาระงาน:</div>
         <div class="sub-content" style="margin-left: 35pt; text-indent: 15pt; margin-top: 2pt; margin-bottom: 4pt; text-align: left; font-size: 16pt;">${cleanVal(plan.tasks) || '..................................................'}</div>
       </div>
     </div>

     <div class="section">
       <div class="section-title">8. วิธีการดำเนินกิจกรรม ตามแนวคิด Active Learning</div>
       <div class="section-content" style="margin-left: 0;">${renderLearningProcessWord(plan.learningProcess)}</div>
     </div>

     <div class="section">
       <div class="section-title">9. การวัดและการประเมินผล</div>
       <table class="assessment-table" style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; font-size: 14pt;">
         <thead>
           <tr>
             <th style="width:40%; text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px 8px;">สิ่งที่ต้องการวัดและประเมินผล</th>
             <th style="width:20%; text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px 8px;">วิธีการวัดผล</th>
             <th style="width:20%; text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px 8px;">เครื่องมือวัดผล</th>
             <th style="width:20%; text-align: center; font-weight: bold; border: 1px solid #000; padding: 4px 8px;">เกณฑ์การประเมิน</th>
           </tr>
         </thead>
         <tbody>
           <tr>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;"><strong>ด้านความรู้ (K):</strong><br>${cleanVal(plan.measureK)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.methodK)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.toolK)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.criteriaK)}</td>
           </tr>
           <tr>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;"><strong>ด้านทักษะกระบวนการ (P):</strong><br>${cleanVal(plan.measureP)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.methodP)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.toolP)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.criteriaP)}</td>
           </tr>
           <tr>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;"><strong>ด้านคุณลักษณะ (A):</strong><br>${cleanVal(plan.measureA)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.methodA)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.toolA)}</td>
             <td style="border: 1px solid #000; padding: 4px 8px; vertical-align: top;">${cleanVal(plan.criteriaA)}</td>
           </tr>
         </tbody>
       </table>
     </div>

     <div class="section">
       <div class="section-title">9.1 เกณฑ์การประเมินผลการเรียนรู้ (Rubrics)</div>
       <div class="section-content" style="margin-left: 0;">
         ${plan.rubricK ? `
           <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt;">เกณฑ์ประเมินด้านความรู้ (K):</div>
           ${cleanSubContentWord(plan.rubricK)}
         ` : ''}
         ${plan.rubricP ? `
           <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt; margin-top: 8pt;">เกณฑ์ประเมินด้านทักษะกระบวนการ (P):</div>
           ${cleanSubContentWord(plan.rubricP)}
         ` : ''}
         ${plan.rubricA ? `
           <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt; margin-top: 8pt;">เกณฑ์ประเมินด้านคุณลักษณะ (A):</div>
           ${cleanSubContentWord(plan.rubricA)}
         ` : ''}
       </div>
     </div>

     <div class="section">
       <div class="section-title">10. บันทึกหลังการจัดกระบวนการเรียนรู้</div>
       <div class="section-content" style="margin-left: 0;">
         <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt;">1) ผลการจัดการเรียนรู้</div>
         <div class="sub-content" style="margin-left: 35pt; text-indent: 15pt; margin-top: 2pt; margin-bottom: 4pt; text-align: left; font-size: 16pt;">
           <div style="text-indent: 15pt; margin-bottom: 2pt;"><strong>- ด้านความรู้ (K):</strong> ${cleanVal(plan.resultK)}</div>
           <div style="text-indent: 15pt; margin-bottom: 2pt;"><strong>- ด้านทักษะกระบวนการ (P):</strong> ${cleanVal(plan.resultP)}</div>
           <div style="text-indent: 15pt; margin-bottom: 4pt;"><strong>- ด้านคุณลักษณะ (A):</strong> ${cleanVal(plan.resultA)}</div>
         </div>
         
         <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt; margin-top: 6px;">2) ปัญหา/อุปสรรค</div>
         ${cleanSubContentWord(plan.problems)}
         
         <div class="sub-heading" style="font-weight: bold; margin-left: 20pt; font-size: 16pt; margin-top: 6px;">3) ข้อเสนอแนะ/แนวทางแก้ไข</div>
         ${cleanSubContentWord(plan.solutions)}
       </div>
    </div>

    <!-- Lesson Plan Signatures Block -->
    <table class="sig-table">
      <tbody>
        <tr>
          <td>
            <div class="sig-line"></div>
            <p>(${cleanVal(plan.teacherName)})</p>
            <p>ครูผู้สอน</p>
            <p>วันที่ ........../........../..........</p>
          </td>
          <td>
            <div class="sig-line"></div>
            <p>(...................................)</p>
            <p>หัวหน้ากลุ่มสาระการเรียนรู้</p>
            <p>วันที่ ........../........../..........</p>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:center; padding-top:16px;">
            <div class="sig-line" style="width:40%; margin:24px auto 4px;"></div>
            <p>(...................................)</p>
            <p>รองผู้อำนวยการฝ่ายวิชาการ / ผู้อำนวยการโรงเรียน</p>
            <p>วันที่ ........../........../..........</p>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Page Break for Permission Section -->
    <div style="page-break-before: always;"></div>

    <!-- Permission Request Section -->
    <div class="sig-section">
      <div class="sig-title">การขออนุญาตใช้แผนการจัดการเรียนรู้</div>
      
      <div class="comment-block">
        <div class="comment-heading">ความเห็น / ข้อเสนอแนะของหัวหน้างานวิชาการ</div>
        <div style="color: #000; margin-top: 4px; font-size: 15pt;">............................................................................................................................................................................................</div>
        <div style="color: #000; margin-top: 4px; font-size: 15pt;">............................................................................................................................................................................................</div>
        <table class="sig-layout-table">
          <tbody>
            <tr>
              <td style="width: 45%"></td>
              <td class="sig-cell">
                (ลงชื่อ) ............................................................<br>
                (....................................................)<br>
                หัวหน้างานวิชาการ.................................
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="comment-block">
        <div class="comment-heading">ความเห็น / ข้อเสนอแนะของรองผู้อำนวยการบริหารงานวิชาการ (ถ้ามี)</div>
        <div style="color: #000; margin-top: 4px; font-size: 15pt;">............................................................................................................................................................................................</div>
        <div style="color: #000; margin-top: 4px; font-size: 15pt;">............................................................................................................................................................................................</div>
        <table class="sig-layout-table">
          <tbody>
            <tr>
              <td style="width: 45%"></td>
              <td class="sig-cell">
                (ลงชื่อ) ............................................................<br>
                (....................................................)<br>
                รองผู้อำนวยการ.......................................
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="comment-block">
        <div class="comment-heading">ความเห็น / ข้อเสนอแนะของผู้อำนวยการ</div>
        <div style="color: #000; margin-top: 4px; font-size: 15pt;">............................................................................................................................................................................................</div>
        <div style="color: #000; margin-top: 4px; font-size: 15pt;">............................................................................................................................................................................................</div>
        <table class="sig-layout-table">
          <tbody>
            <tr>
              <td style="width: 45%"></td>
              <td class="sig-cell">
                (ลงชื่อ) ............................................................<br>
                (....................................................)<br>
                ผู้อำนวยการ............................................
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

</body>
</html>
    `;

    // 3. Update the plan metadata to log Word export details
    const cleanFileName = `PLAN_${plan.gradeLevel || 'GRADE'}_${plan.lessonTopic || 'LESSON'}`.replace(/\s+/g, '_');
    const timestamp = new Date().toISOString();
    const downloadUrl = `/api/plans/${id}/export/word`;

    await supabase
      .from('LessonPlans')
      .update({
        wordUrl: downloadUrl,
        wordCreatedAt: timestamp
      })
      .eq('planId', id);

    // 4. Return as word file response stream
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(cleanFileName)}.doc"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('Word export error:', error);
    return new Response('Error exporting document: ' + error.message, { status: 500 });
  }
}
