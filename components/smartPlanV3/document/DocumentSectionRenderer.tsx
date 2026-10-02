import React from 'react';
import type {
  DocumentSection,
  HeadingSection,
  ParagraphSection,
  BulletListSection,
  KeyValueSection,
  TableSection,
  ActivityTimelineSection,
  AssessmentSection,
  AssetSection,
  PostTeachingPlaceholderSection,
} from '@/lib/smartPlanV3/document';

interface Props {
  section: DocumentSection;
}

export const DocumentSectionRenderer: React.FC<Props> = ({ section }) => {
  if (section.type === 'pageBreak') {
    return <div className="page-break-before" />;
  }

  const containerClasses = [
    'doc-section',
    section.pageBreakBefore ? 'page-break-before' : '',
    section.pageBreakAfter ? 'page-break-after' : '',
    section.avoidBreakInside ? 'avoid-break-inside' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // 1. Heading
  if (section.type === 'heading') {
    const s = section as HeadingSection;
    if (s.level === 1) {
      return (
        <div className={`mt-6 mb-3 text-center ${containerClasses}`}>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{s.title}</h1>
          {s.subtitle && <p className="text-base text-slate-600 mt-1">{s.subtitle}</p>}
        </div>
      );
    }
    return (
      <div className={`mt-5 mb-2 ${containerClasses}`}>
        <h2 className="text-lg font-bold text-slate-900">{s.title}</h2>
        {s.subtitle && <p className="text-sm text-slate-600 mt-0.5">{s.subtitle}</p>}
      </div>
    );
  }

  // 2. Paragraph
  if (section.type === 'paragraph') {
    const s = section as ParagraphSection;
    return (
      <div className={`my-3 text-left ${containerClasses}`}>
        {s.title && <div className="font-bold text-base text-slate-900 mb-1">{s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}</div>}
        <p className={`text-slate-800 text-base leading-relaxed ${s.isIndent ? 'indent-8' : ''}`}>
          {s.content}
        </p>
      </div>
    );
  }

  // 3. Bullet List
  if (section.type === 'bulletList') {
    const s = section as BulletListSection;
    return (
      <div className={`my-3 text-left ${containerClasses}`}>
        {s.title && (
          <div className="font-bold text-base text-slate-900 mb-1">
            {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}
          </div>
        )}
        {s.introText && <p className="text-sm text-slate-700 mb-1.5">{s.introText}</p>}
        <div className="space-y-1.5 pl-2 sm:pl-4">
          {s.items.map((it, idx) => (
            <div key={idx} className="flex items-start gap-2 text-base text-slate-800 leading-relaxed">
              <span className="font-medium text-slate-700 select-none min-w-[24px] text-right">{it.bullet || '•'}</span>
              <div className="flex-1">
                <span>{it.text}</span>
                {Array.isArray(it.subItems) && it.subItems.length > 0 && (
                  <div className="pl-4 mt-0.5 space-y-0.5 text-sm text-slate-600">
                    {it.subItems.map((sub, sIdx) => (
                      <div key={sIdx}>{sub}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. Key Value Pairs
  if (section.type === 'keyValue') {
    const s = section as KeyValueSection;
    return (
      <div className={`my-3 text-left ${containerClasses}`}>
        {s.title && (
          <div className="font-bold text-base text-slate-900 mb-2 border-b pb-1">
            {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-base">
          {s.pairs.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="font-semibold text-slate-900 whitespace-nowrap">{p.key}:</span>
              <span className="text-slate-800">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. Activity Timeline
  if (section.type === 'activityTimeline') {
    const s = section as ActivityTimelineSection;
    return (
      <div className={`my-4 text-left ${containerClasses}`}>
        <div className="flex justify-between items-baseline mb-2 border-b pb-1">
          <div className="font-bold text-base text-slate-900">
            {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}
          </div>
          <div className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
            เวลารวม {s.totalMinutes} นาที
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-28 font-bold">ขั้น / เวลา</th>
                <th className="border border-slate-300 p-2 text-left font-bold w-1/3">บทบาทครู (Teacher)</th>
                <th className="border border-slate-300 p-2 text-left font-bold">กิจกรรมผู้เรียน (Student)</th>
                <th className="border border-slate-300 p-2 text-left font-bold w-40">การประเมินระหว่างเรียน</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((row, rIdx) => (
                <tr key={rIdx} className="align-top hover:bg-slate-50/40">
                  <td className="border border-slate-300 p-2 text-center bg-slate-50/30">
                    <div className="font-bold text-slate-900">{row.phaseLabel.split('(')[0].trim()}</div>
                    <div className="text-xs text-indigo-700 font-semibold mt-0.5">({row.minutes} นาที)</div>
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-800 leading-relaxed">
                    {row.teacherActions}
                    {row.feedbackMoment && (
                      <div className="mt-1 text-xs text-emerald-800 bg-emerald-50 p-1 rounded">
                        <span className="font-semibold">การป้อนกลับ:</span> {row.feedbackMoment}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-800 leading-relaxed">
                    {row.studentActions}
                  </td>
                  <td className="border border-slate-300 p-2 text-xs text-slate-700 leading-relaxed">
                    {row.assessmentMoment || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 6. Assessment Table
  if (section.type === 'assessment') {
    const s = section as AssessmentSection;
    return (
      <div className={`my-4 text-left ${containerClasses}`}>
        <div className="font-bold text-base text-slate-900 mb-2 border-b pb-1">
          {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2 text-center w-24 font-bold">จุดประสงค์</th>
                <th className="border border-slate-300 p-2 text-left font-bold">หลักฐาน / ภาระงาน</th>
                <th className="border border-slate-300 p-2 text-left font-bold">วิธีประเมิน</th>
                <th className="border border-slate-300 p-2 text-left font-bold">เครื่องมือประเมิน</th>
                <th className="border border-slate-300 p-2 text-left font-bold">เกณฑ์การผ่าน</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((row, rIdx) => (
                <tr key={rIdx} className="align-top hover:bg-slate-50/40">
                  <td className="border border-slate-300 p-2 text-center font-bold text-indigo-900 bg-slate-50/30">
                    {row.objectiveRefs}
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-800 leading-relaxed">
                    {row.evidenceDescription}
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-800">
                    {row.method}
                  </td>
                  <td className="border border-slate-300 p-2 text-slate-800">
                    <div className="font-medium">{row.toolName}</div>
                    <div className="text-xs text-slate-500">({row.toolType})</div>
                    {row.appendixRef && (
                      <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                        [{row.appendixRef}]
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-300 p-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {row.criteria}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 7. Media & Asset Summary
  if (section.type === 'asset') {
    const s = section as AssetSection;
    return (
      <div className={`my-3 text-left ${containerClasses}`}>
        <div className="font-bold text-base text-slate-900 mb-2 border-b pb-1">
          {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}
        </div>
        <div className="space-y-1.5 pl-2 sm:pl-4 text-base text-slate-800">
          {s.rows.map((asset, idx) => (
            <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-none">
              <div>
                <span className="font-medium text-slate-900">{idx + 1}. {asset.title}</span>
                <span className="text-sm text-slate-500 ml-2">({asset.assetTypeLabel})</span>
              </div>
              <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded whitespace-nowrap">
                {asset.appendixRef}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. Table Section (e.g. Rubrics, Data Matrices)
  if (section.type === 'table') {
    const s = section as TableSection;
    return (
      <div className={`my-4 text-left ${containerClasses}`}>
        {s.title && (
          <div className="font-bold text-base text-slate-900 mb-2 border-b pb-1">
            {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-300 text-sm">
            {s.headers && s.headers.length > 0 && (
              <thead className="bg-slate-100">
                <tr>
                  {s.headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="border border-slate-300 p-2 text-left font-bold text-slate-900"
                      style={s.columnWidths && s.columnWidths[hIdx] ? { width: s.columnWidths[hIdx] } : undefined}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {s.rows.map((row, rIdx) => (
                <tr key={rIdx} className="align-top hover:bg-slate-50/40">
                  {row.map((c, cIdx) => (
                    <td
                      key={cIdx}
                      className={`border border-slate-300 p-2 text-slate-800 leading-relaxed ${cIdx === 0 ? 'font-semibold bg-slate-50/30' : ''}`}
                    >
                      <div className="whitespace-pre-line">{c}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 9. Post-Teaching Reflection Placeholder (Official ว.PA 4-Dimension Format)
  if (section.type === 'postTeachingPlaceholder') {
    const s = section as PostTeachingPlaceholderSection;
    return (
      <div className={`my-6 text-left page-break-before ${containerClasses}`}>
        <div className="font-bold text-base text-slate-900 mb-3 border-b pb-1">
          {s.sectionNumber ? `${s.sectionNumber}. ` : ''}{s.title} (บันทึกหลังการจัดกิจกรรมการเรียนรู้)
        </div>
        <div className="space-y-4 text-sm text-slate-800">
          <div>
            <div className="font-bold text-slate-900 mb-1">1. ผลการจัดการเรียนรู้</div>
            <div className="min-h-[50px] border-b border-dotted border-slate-400 p-1 text-slate-500 text-xs leading-relaxed">
              • ด้านความรู้ (K): ผู้เรียนผ่านเกณฑ์การประเมินจำนวน ............ คน คิดเป็นร้อยละ ............ ไม่ผ่านเกณฑ์จำนวน ............ คน<br />
              • ด้านทักษะ/กระบวนการ (P): ผู้เรียนผ่านเกณฑ์การประเมินจำนวน ............ คน คิดเป็นร้อยละ ............ ไม่ผ่านเกณฑ์จำนวน ............ คน<br />
              • ด้านคุณลักษณะอันพึงประสงค์ (A): ผู้เรียนผ่านเกณฑ์ระดับดีขึ้นไปจำนวน ............ คน คิดเป็นร้อยละ ............
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-900 mb-1">2. ปัญหาและอุปสรรค</div>
            <div className="min-h-[44px] border-b border-dotted border-slate-400 p-1 text-slate-400 text-xs">
              ................................................................................................................................................................................................................
            </div>
          </div>
          <div>
            <div className="font-bold text-slate-900 mb-1">3. ข้อเสนอแนะ / แนวทางการแก้ไขและการพัฒนาต่อยอด</div>
            <div className="min-h-[44px] border-b border-dotted border-slate-400 p-1 text-slate-400 text-xs">
              ................................................................................................................................................................................................................
            </div>
          </div>

          {/* Teacher Signature */}
          <div className="pt-4 flex justify-end">
            <div className="text-center min-w-[240px] space-y-1">
              <div className="text-slate-400">ลงชื่อ ........................................................... ครูผู้สอน</div>
              <div className="text-xs text-slate-600">( ........................................................... )</div>
              <div className="text-xs text-slate-500">ตำแหน่ง ...........................................................</div>
              <div className="text-xs text-slate-500">วันที่ ........ เดือน .................... พ.ศ. ............</div>
            </div>
          </div>

          {/* School Administrator / Head of Department Endorsement */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="font-bold text-slate-900 mb-1">4. ความเห็นของผู้บริหารสถานศึกษา / ผู้ที่ได้รับมอบหมาย</div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-1.5">
              <div className="flex gap-4">
                <span>[  ] แผนการจัดการเรียนรู้มีความสอดคล้องกับมาตรฐานและตัวชี้วัด สามารถนำไปจัดกิจกรรมได้</span>
              </div>
              <div className="flex gap-4">
                <span>[  ] ข้อเสนอแนะเพิ่มเติม: ................................................................................................................................</span>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <div className="text-center min-w-[240px] space-y-1">
                <div className="text-slate-400">ลงชื่อ ........................................................... ผู้ตรวจ / ผู้บริหาร</div>
                <div className="text-xs text-slate-600">( ........................................................... )</div>
                <div className="text-xs text-slate-500">ตำแหน่ง ...........................................................</div>
                <div className="text-xs text-slate-500">วันที่ ........ เดือน .................... พ.ศ. ............</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
