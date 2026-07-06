'use client';

const lines = (value: unknown) =>
  String(value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

export default function UnitPlanPreviewClient({ unitPlan }: { unitPlan: any }) {
  const draft = unitPlan.unitPlanStatus !== 'ready';

  return (
    <div className="unit-preview-shell">
      <div className="no-print unit-preview-toolbar">
        <button type="button" onClick={() => window.print()}>พิมพ์ / บันทึก PDF</button>
        <button type="button" onClick={() => window.close()}>ปิดหน้าต่าง</button>
      </div>

      <article className="unit-document">
        {draft && <div className="draft-watermark">ฉบับร่าง</div>}
        <header>
          <h1>แผนการจัดการเรียนรู้ระดับหน่วย</h1>
          <h2>{unitPlan.unitName}</h2>
        </header>

        <table className="info-table">
          <tbody>
            <tr><th>ครูผู้สอน</th><td>{unitPlan.teacherName || '-'}</td><th>โรงเรียน</th><td>{unitPlan.schoolName || '-'}</td></tr>
            <tr><th>รายวิชา</th><td>{unitPlan.subjectName || '-'}</td><th>ระดับชั้น</th><td>{unitPlan.gradeLevel || '-'}</td></tr>
            <tr><th>ภาคเรียน/ปี</th><td>{unitPlan.semester}/{unitPlan.academicYear}</td><th>เวลา</th><td>{Number(unitPlan.totalUnitHours || 0)} ชั่วโมง</td></tr>
          </tbody>
        </table>

        <Section title="1. มาตรฐานและตัวชี้วัด">
          {unitPlan.indicators?.length
            ? <ul>{unitPlan.indicators.map((indicator: any) => <li key={indicator.indicatorId}><strong>{indicator.indicatorCode}</strong> {indicator.indicatorText}</li>)}</ul>
            : <p>-</p>}
        </Section>

        <Section title="2. ผลลัพธ์การเรียนรู้ของหน่วย">
          {lines(unitPlan.unitLearningOutcomes).map((line, index) => <p key={index}>{line}</p>)}
        </Section>

        <Section title="3. โครงสร้างแผนรายคาบ">
          <table className="content-table">
            <thead><tr><th>ลำดับ</th><th>ชื่อแผน / เรื่อง</th><th>จุดเน้น</th><th>เวลา</th></tr></thead>
            <tbody>
              {unitPlan.UnitLessons?.map((lesson: any, index: number) => (
                <tr key={lesson.unitLessonId}>
                  <td>{index + 1}</td>
                  <td><strong>{lesson.lessonTitle}</strong>{lesson.lessonTopic ? <><br />{lesson.lessonTopic}</> : null}</td>
                  <td>{lesson.learningFocus || '-'}</td>
                  <td>{Number(lesson.estimatedHours)} ชม.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="4. การวัดและประเมินผลระดับหน่วย">
          {lines(unitPlan.unitAssessmentOverview).map((line, index) => <p key={index}>{line}</p>)}
          {unitPlan.UnitAssessments?.length > 0 && (
            <table className="content-table">
              <thead><tr><th>รายการ</th><th>วิธีการ</th><th>เครื่องมือ</th><th>เกณฑ์</th></tr></thead>
              <tbody>{unitPlan.UnitAssessments.map((item: any) => <tr key={item.unitAssessmentId}><td>{item.assessmentName}</td><td>{item.method || '-'}</td><td>{item.tool || '-'}</td><td>{item.criteria || '-'}</td></tr>)}</tbody>
            </table>
          )}
        </Section>

        <Section title="5. สื่อ แหล่งเรียนรู้ และภาระงาน">
          <p><strong>สื่อ:</strong> {unitPlan.learningMedia || '-'}</p>
          <p><strong>แหล่งเรียนรู้:</strong> {unitPlan.learningSources || '-'}</p>
          <p><strong>ชิ้นงาน/ภาระงาน:</strong> {unitPlan.tasks || '-'}</p>
        </Section>

        {unitPlan.rubrics?.length > 0 && (
          <Section title="6. Rubrics">
            {unitPlan.rubrics.map((rubric: any) => <div key={rubric.rubricId}><strong>{rubric.rubricName}</strong><pre>{JSON.stringify(rubric.criteriaJson, null, 2)}</pre></div>)}
          </Section>
        )}

        <Section title="7. Reflection">
          <p>{unitPlan.reflection || '-'}</p>
        </Section>
      </article>

      <style jsx global>{`
        .unit-preview-shell { min-height: 100vh; background: #e2e8f0; padding: 24px; color: #111; }
        .unit-preview-toolbar { max-width: 210mm; margin: 0 auto 16px; display: flex; gap: 8px; }
        .unit-preview-toolbar button { border: 0; border-radius: 8px; padding: 10px 16px; background: #db2777; color: white; font-weight: 700; cursor: pointer; }
        .unit-document { position: relative; overflow: hidden; width: 210mm; min-height: 297mm; margin: auto; background: white; padding: 20mm 18mm 20mm 25mm; font-family: "TH Sarabun New", Sarabun, sans-serif; font-size: 16pt; line-height: 1.25; box-shadow: 0 10px 30px rgba(15,23,42,.15); }
        .unit-document header { text-align: center; margin-bottom: 18px; }
        .unit-document h1 { font-size: 20pt; font-weight: 700; }
        .unit-document h2 { font-size: 18pt; font-weight: 700; }
        .unit-document section { margin-top: 14px; }
        .unit-document section h3 { font-size: 17pt; font-weight: 700; margin-bottom: 6px; }
        .info-table, .content-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        .info-table th, .info-table td, .content-table th, .content-table td { border: 1px solid #111; padding: 5px 7px; vertical-align: top; }
        .info-table th, .content-table th { font-weight: 700; text-align: center; }
        .draft-watermark { position: absolute; transform: rotate(-35deg); top: 38%; left: 20%; color: rgba(225,29,72,.09); font-size: 90pt; font-weight: 900; }
        .unit-document pre { white-space: pre-wrap; font-family: inherit; font-size: 14pt; }
        @media print {
          @page { size: A4; margin: 20mm 18mm 20mm 25mm; }
          body, html { min-height: auto !important; height: auto !important; overflow: visible !important; }
          .no-print { display: none !important; }
          .unit-preview-shell { padding: 0 !important; background: white !important; min-height: auto !important; height: auto !important; overflow: visible !important; }
          .unit-document { 
            box-shadow: none !important; 
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            overflow: visible !important;
            zoom: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3>{title}</h3><div>{children}</div></section>;
}

