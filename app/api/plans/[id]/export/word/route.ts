import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to escape HTML tags for presentation inside Word
const cleanVal = (val: any) => {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
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
    body {
      font-family: "TH Sarabun New", "Sarabun", "Arial", sans-serif;
      font-size: 16pt;
      line-height: 1.65;
      color: #000;
    }
    .doc-title {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .top-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #555;
      margin-bottom: 15px;
    }
    .top-grid td {
      width: 50%;
      padding: 6px 10px;
      vertical-align: top;
      border-bottom: 1px solid #bbb;
      font-size: 15pt;
    }
    .top-grid td:first-child { border-right: 1px solid #bbb; }
    .label { font-weight: bold; }
    .section { margin-top: 10px; }
    .section-title { font-weight: bold; font-size: 16pt; margin-bottom: 4px; }
    .section-content { margin-left: 20px; font-size: 15pt; }
    .assessment-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 15px;
      font-size: 14pt;
    }
    .assessment-table th,
    .assessment-table td {
      border: 1px solid #333;
      padding: 6px 8px;
      vertical-align: top;
    }
    .assessment-table th {
      font-weight: bold;
      text-align: center;
      background: #e8e8e8;
    }
    .domain-cell { text-align: center; font-weight: bold; }
    .sig-table { width: 100%; border-collapse: collapse; margin-top: 30px; }
    .sig-table td { width: 50%; text-align: center; padding: 10px; font-size: 15pt; }
    .sig-line { border-top: 1px solid #333; margin: 30px auto 4px; width: 75%; }
    hr.divider { border: none; border-top: 1px solid #aaa; margin: 15px 0; }
    p { margin: 4px 0 8px; }
  </style>
</head>
<body>

  <div class="doc-title">แผนการจัดการเรียนรู้</div>

  <table class="top-grid">
    <tr>
      <td><span class="label">ชื่อ-นามสกุลครูผู้สอน:</span>&nbsp;${cleanVal(plan.teacherName)}</td>
      <td><span class="label">โรงเรียน:</span>&nbsp;${cleanVal(plan.schoolName)}</td>
    </tr>
    <tr>
      <td><span class="label">สังกัด:</span>&nbsp;${cleanVal(plan.organization)}</td>
      <td><span class="label">กลุ่มสาระการเรียนรู้:</span>&nbsp;${cleanVal(plan.headerLearningArea)}</td>
    </tr>
    <tr>
      <td><span class="label">ระดับชั้น:</span>&nbsp;${cleanVal(plan.headerGradeLevel)}</td>
      <td><span class="label">ปีการศึกษา:</span>&nbsp;${cleanVal(plan.academicYear)}</td>
    </tr>
    <tr>
      <td><span class="label">รายวิชา:</span>&nbsp;${cleanVal(plan.subjectName)}</td>
      <td><span class="label">รหัสวิชา:</span>&nbsp;${cleanVal(plan.subjectCode)}</td>
    </tr>
    <tr>
      <td><span class="label">ภาคเรียนที่:</span>&nbsp;${cleanVal(plan.semester)}</td>
      <td><span class="label">เวลาเรียน:</span>&nbsp;${cleanVal(plan.totalHours)}&nbsp;ชั่วโมง</td>
    </tr>
    <tr>
      <td><span class="label">หน่วยการเรียนรู้:</span>&nbsp;${cleanVal(plan.unitName)}</td>
      <td><span class="label">เรื่องที่สอน:</span>&nbsp;${cleanVal(plan.lessonTopic)}</td>
    </tr>
  </table>

  <div class="section">
    <div class="section-title">1. มาตรฐานการเรียนรู้ / ตัวชี้วัด</div>
    <div class="section-content">
      <p><span class="label">มาตรฐานการเรียนรู้:</span><br>${cleanVal(plan.learningStandard)}</p>
      <p><span class="label">ตัวชี้วัดระหว่างทาง:</span><br>${cleanVal(plan.indicatorDuring)}</p>
      <p><span class="label">ตัวชี้วัดปลายทาง:</span><br>${cleanVal(plan.indicatorFinal)}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. สาระสำคัญ (Concept)</div>
    <div class="section-content">${cleanVal(plan.essentialConcept)}</div>
  </div>

  <div class="section">
    <div class="section-title">3. จุดประสงค์การเรียนรู้</div>
    <div class="section-content">
      <p><span class="label">ด้านความรู้ (K):</span><br>${cleanVal(plan.objectiveK)}</p>
      <p><span class="label">ด้านทักษะกระบวนการ (P):</span><br>${cleanVal(plan.objectiveP)}</p>
      <p><span class="label">ด้านคุณลักษณะ (A):</span><br>${cleanVal(plan.objectiveA)}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">4. สาระการเรียนรู้</div>
    <div class="section-content">${cleanVal(plan.learningContent)}</div>
  </div>

  <div class="section">
    <div class="section-title">5. สมรรถนะสำคัญของผู้เรียน</div>
    <div class="section-content">${cleanVal(plan.competencies)}</div>
  </div>

  <div class="section">
    <div class="section-title">6. คุณลักษณะอันพึงประสงค์</div>
    <div class="section-content">${cleanVal(plan.desiredAttributes)}</div>
  </div>

  <div class="section">
    <div class="section-title">7. ทักษะที่จำเป็นในศตวรรษที่ 21</div>
    <div class="section-content">${cleanVal(plan.skills21)}</div>
  </div>

  <div class="section">
    <div class="section-title">8. กระบวนการจัดการเรียนรู้</div>
    <div class="section-content">${cleanVal(plan.learningProcess)}</div>
  </div>

  <div class="section">
    <div class="section-title">9. การวัดและประเมินผลการเรียนรู้</div>
    <table class="assessment-table">
      <thead>
        <tr>
          <th style="width:10%">ด้าน</th>
          <th style="width:25%">สิ่งที่ต้องการวัดและประเมินผล</th>
          <th style="width:20%">วิธีการวัดผล</th>
          <th style="width:25%">เครื่องมือวัดผล</th>
          <th style="width:20%">เกณฑ์การประเมิน</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="domain-cell">ความรู้<br>(K)</td>
          <td>${cleanVal(plan.objectiveK)}</td>
          <td>${cleanVal(plan.methodK)}</td>
          <td>${cleanVal(plan.toolK)}</td>
          <td>${cleanVal(plan.criteriaK)}</td>
        </tr>
        <tr>
          <td class="domain-cell">ทักษะ<br>(P)</td>
          <td>${cleanVal(plan.objectiveP)}</td>
          <td>${cleanVal(plan.methodP)}</td>
          <td>${cleanVal(plan.toolP)}</td>
          <td>${cleanVal(plan.criteriaP)}</td>
        </tr>
        <tr>
          <td class="domain-cell">คุณลักษณะ<br>(A)</td>
          <td>${cleanVal(plan.objectiveA)}</td>
          <td>${cleanVal(plan.methodA)}</td>
          <td>${cleanVal(plan.toolA)}</td>
          <td>${cleanVal(plan.criteriaA)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">10. สื่อการเรียนรู้</div>
    <div class="section-content">${cleanVal(plan.learningMedia)}</div>
  </div>

  <div class="section">
    <div class="section-title">11. แหล่งเรียนรู้</div>
    <div class="section-content">${cleanVal(plan.learningSources)}</div>
  </div>

  <div class="section">
    <div class="section-title">12. ชิ้นงาน / ภาระงาน</div>
    <div class="section-content">${cleanVal(plan.tasks)}</div>
  </div>

  <hr class="divider">

  <div class="section">
    <div class="section-title">13. บันทึกหลังการจัดการเรียนรู้</div>
    <div class="section-content">
      <p><span class="label">ผลการสอนด้านความรู้ (K):</span><br>${cleanVal(plan.resultK)}</p>
      <p><span class="label">ผลการสอนด้านทักษะ (P):</span><br>${cleanVal(plan.resultP)}</p>
      <p><span class="label">ผลการสอนด้านคุณลักษณะ (A):</span><br>${cleanVal(plan.resultA)}</p>
      <p><span class="label">ปัญหาและอุปสรรคที่พบ:</span><br>${cleanVal(plan.problems)}</p>
      <p><span class="label">แนวทางแก้ไขและพัฒนา:</span><br>${cleanVal(plan.solutions)}</p>
    </div>
  </div>

  <table class="sig-table">
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
      <td colspan="2" style="text-align:center;">
        <div class="sig-line" style="width:40%; margin-top: 35px;"></div>
        <p>(...................................)</p>
        <p>รองผู้อำนวยการฝ่ายวิชาการ / ผู้อำนวยการโรงเรียน</p>
        <p>วันที่ ........../........../..........</p>
      </td>
    </tr>
  </table>

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
        'Content-Disposition': `attachment; filename="${encodeURIComponent(cleanFileName)}.doc"`
      }
    });

  } catch (error: any) {
    console.error('Word export error:', error);
    return new Response('Error exporting document: ' + error.message, { status: 500 });
  }
}
