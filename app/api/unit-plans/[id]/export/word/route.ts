import { getSupabaseAdmin } from '@/lib/supabase';
import { loadUnitPlanExportData } from '@/lib/unitPlanExportData';
import { newEntityId } from '@/lib/unitPlanApi';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const paragraphs = (value: unknown) => String(value || '')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => `<p>${escapeHtml(line)}</p>`)
  .join('') || '<p>-</p>';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await loadUnitPlanExportData(params.id);
  if ('error' in result) return new Response('Unit plan not found or unauthorized', { status: result.status });

  const plan = result.data;
  const lessons = plan.UnitLessons || [];
  const indicators = plan.indicators || [];
  const assessments = plan.UnitAssessments || [];
  const rubrics = plan.rubrics || [];
  const watermark = plan.unitPlanStatus === 'ready' ? '' : '<div class="watermark">ฉบับร่าง</div>';

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
@page Section1 { size: 595.3pt 841.9pt; margin: 56.7pt 56.7pt 56.7pt 70.9pt; }
div.Section1 { page: Section1; }
body { font-family: "TH Sarabun New", "Sarabun", Arial, sans-serif; font-size: 16pt; line-height: 1.15; color: #000; }
h1, h2 { text-align: center; margin: 0 0 8pt; }
h1 { font-size: 20pt; } h2 { font-size: 18pt; }
h3 { font-size: 17pt; margin: 12pt 0 4pt; }
p { margin: 2pt 0; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0 10pt; }
th, td { border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; font-size: 16pt; }
th { text-align: center; font-weight: bold; }
.watermark { text-align: center; color: #c00; font-size: 18pt; font-weight: bold; border: 2px solid #c00; margin-bottom: 10pt; }
.page-break-avoid { page-break-inside: avoid; }
</style>
</head>
<body><div class="Section1">
${watermark}
<h1>แผนการจัดการเรียนรู้ระดับหน่วย</h1>
<h2>${escapeHtml(plan.unitName)}</h2>

<table>
<tr><th>ครูผู้สอน</th><td>${escapeHtml(plan.teacherName || '-')}</td><th>โรงเรียน</th><td>${escapeHtml(plan.schoolName || '-')}</td></tr>
<tr><th>รายวิชา</th><td>${escapeHtml(plan.subjectName || '-')}</td><th>ระดับชั้น</th><td>${escapeHtml(plan.gradeLevel || '-')}</td></tr>
<tr><th>ภาคเรียน/ปี</th><td>${escapeHtml(plan.semester)}/${escapeHtml(plan.academicYear)}</td><th>เวลา</th><td>${escapeHtml(plan.totalUnitHours)} ชั่วโมง</td></tr>
</table>

<h3>1. มาตรฐานและตัวชี้วัด</h3>
${indicators.length ? `<ul>${indicators.map((item: any) => `<li><strong>${escapeHtml(item.indicatorCode)}</strong> ${escapeHtml(item.indicatorText)}</li>`).join('')}</ul>` : '<p>-</p>'}

<h3>2. ผลลัพธ์การเรียนรู้ของหน่วย</h3>
${paragraphs(plan.unitLearningOutcomes)}

<h3>3. โครงสร้างแผนรายคาบ</h3>
<table>
<thead><tr><th>ลำดับ</th><th>ชื่อแผน / เรื่อง</th><th>จุดเน้น</th><th>เวลา</th></tr></thead>
<tbody>${lessons.map((lesson: any, index: number) => `<tr><td style="text-align:center">${index + 1}</td><td><strong>${escapeHtml(lesson.lessonTitle)}</strong>${lesson.lessonTopic ? `<br>${escapeHtml(lesson.lessonTopic)}` : ''}</td><td>${escapeHtml(lesson.learningFocus || '-')}</td><td style="text-align:center">${escapeHtml(lesson.estimatedHours)} ชม.</td></tr>`).join('')}</tbody>
</table>

<h3>4. การวัดและประเมินผลระดับหน่วย</h3>
${paragraphs(plan.unitAssessmentOverview)}
${assessments.length ? `<table><thead><tr><th>รายการ</th><th>วิธีการ</th><th>เครื่องมือ</th><th>เกณฑ์</th></tr></thead><tbody>${assessments.map((item: any) => `<tr><td>${escapeHtml(item.assessmentName)}</td><td>${escapeHtml(item.method || '-')}</td><td>${escapeHtml(item.tool || '-')}</td><td>${escapeHtml(item.criteria || '-')}</td></tr>`).join('')}</tbody></table>` : ''}

<h3>5. สื่อ แหล่งเรียนรู้ และภาระงาน</h3>
<p><strong>สื่อ:</strong> ${escapeHtml(plan.learningMedia || '-')}</p>
<p><strong>แหล่งเรียนรู้:</strong> ${escapeHtml(plan.learningSources || '-')}</p>
<p><strong>ชิ้นงาน/ภาระงาน:</strong> ${escapeHtml(plan.tasks || '-')}</p>

${rubrics.length ? `<h3>6. Rubrics</h3>${rubrics.map((rubric: any) => `<div class="page-break-avoid"><p><strong>${escapeHtml(rubric.rubricName)}</strong></p><p>${escapeHtml(JSON.stringify(rubric.criteriaJson))}</p></div>`).join('')}` : ''}

<h3>7. Reflection</h3>
${paragraphs(plan.reflection)}
</div></body></html>`;

  const adminDb = getSupabaseAdmin();
  const { error: logError } = await adminDb.from('System_Logs').insert({
    logId: newEntityId('LOG'),
    timestamp: new Date().toISOString(),
    action: 'EXPORT_UNIT_PLAN_WORD',
    status: 'success',
    planId: params.id,
    message: `ส่งออก Word แผนระดับหน่วย: ${plan.unitName}`,
    userEmail: result.user.email,
  });
  if (logError) console.error('EXPORT_UNIT_PLAN_WORD log failed:', logError);

  const safeName = String(plan.unitName || 'unit-plan').replace(/[\\/:*?"<>|]/g, '-');
  return new Response(html, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.doc`)}`,
      'Cache-Control': 'no-store',
    },
  });
}

