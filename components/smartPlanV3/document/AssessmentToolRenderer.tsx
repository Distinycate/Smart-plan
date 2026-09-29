import React from 'react';
import type { AppendixItem } from '@/lib/smartPlanV3/document';

interface Props {
  item: AppendixItem;
}

export const AssessmentToolRenderer: React.FC<Props> = ({ item }) => {
  const { itemType, content, title } = item;
  if (!content) {
    return (
      <div className="p-4 my-2 border border-dashed border-gray-300 rounded text-gray-500 text-sm">
        ไม่มีรายละเอียดเครื่องมือวัดและประเมินผล
      </div>
    );
  }

  // 1. Rubric Matrix (3, 4, or 5 levels)
  if (itemType === 'RUBRIC' || itemType === 'PERFORMANCE_RUBRIC' || (content.levels && content.criteria)) {
    const levels = content.levels || [];
    const criteria = content.criteria || [];
    const levelCount = levels.length;
    const is5Levels = levelCount >= 5;
    const is4Levels = levelCount === 4;

    // Adaptive column widths and typography based on level count
    const criteriaColWidth = is5Levels ? 'w-[18%]' : is4Levels ? 'w-[22%]' : 'w-[25%]';
    const textSize = is5Levels ? 'text-[11px] leading-snug' : 'text-xs leading-relaxed';
    const cellPadding = is5Levels ? 'p-1.5' : 'p-2';

    return (
      <div className="tool-rubric space-y-3 text-left avoid-break-inside">
        <div className="font-bold text-base text-slate-900 border-b pb-1">{title}</div>
        <div className="overflow-x-auto print:overflow-visible">
          <table className={`w-full table-fixed border-collapse border border-slate-300 ${textSize}`}>
            <thead className="bg-slate-100">
              <tr>
                <th className={`border border-slate-300 ${cellPadding} text-left font-bold ${criteriaColWidth} align-top`}>
                  <div>ประเด็นการประเมิน</div>
                </th>
                {levels.map((lvl: any, lIdx: number) => (
                  <th key={lIdx} className={`border border-slate-300 ${cellPadding} text-center font-bold align-top`}>
                    <div className="break-words font-semibold">{lvl.label || `ระดับ ${lvl.score}`}</div>
                    <div className="text-[10px] text-slate-500 font-normal">({lvl.score} คะแนน)</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((crit: any, cIdx: number) => (
                <tr key={cIdx} className="align-top">
                  <td className={`border border-slate-300 ${cellPadding} font-medium bg-slate-50/50 break-words`}>
                    <div className="font-semibold text-slate-900">{crit.name}</div>
                    {crit.weight && crit.weight !== 1 && (
                      <div className="text-[10px] text-slate-500">น้ำหนัก: {crit.weight}</div>
                    )}
                  </td>
                  {levels.map((lvl: any, lIdx: number) => {
                    const desc = crit.descriptors?.[String(lvl.score)] || crit.descriptors?.[lvl.score] || '-';
                    return (
                      <td key={lIdx} className={`border border-slate-300 ${cellPadding} text-slate-700 break-words`}>
                        {desc}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. Checklist
  if (itemType === 'CHECKLIST' || Array.isArray(content.items)) {
    const items = content.items || [];
    return (
      <div className="tool-checklist space-y-3 text-left">
        <div className="font-bold text-base text-slate-900 border-b pb-1">{title}</div>
        <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="border border-slate-300 p-2 text-center w-12 font-bold">ลำดับ</th>
              <th className="border border-slate-300 p-2 text-left font-bold">รายการประเมิน / พฤติกรรมที่สังเกต</th>
              <th className="border border-slate-300 p-2 text-center w-20 font-bold">ปฏิบัติ / มี</th>
              <th className="border border-slate-300 p-2 text-center w-20 font-bold">ไม่ปฏิบัติ / ไม่มี</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => (
              <tr key={idx}>
                <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                <td className="border border-slate-300 p-2 text-slate-800">{it.text || it.name || it}</td>
                <td className="border border-slate-300 p-2 text-center text-slate-300">[  ]</td>
                <td className="border border-slate-300 p-2 text-center text-slate-300">[  ]</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // 3. Scoring Guide / Rating Scale
  if (itemType === 'SCORING_GUIDE' || itemType === 'RATING_SCALE') {
    const scales = content.scales || content.guidance || [];
    return (
      <div className="tool-scoring-guide space-y-3 text-left">
        <div className="font-bold text-base text-slate-900 border-b pb-1">{title}</div>
        {content.instruction && (
          <div className="text-sm text-slate-600 italic">{content.instruction}</div>
        )}
        <div className="p-3 bg-white border border-slate-200 rounded space-y-2 text-sm text-slate-800">
          {Array.isArray(scales) ? (
            scales.map((s: any, idx: number) => (
              <div key={idx} className="flex gap-3 py-1 border-b last:border-none">
                <span className="font-bold text-slate-700 min-w-[80px]">{s.score || s.level || `${idx + 1} คะแนน`}:</span>
                <span>{s.description || s.criteria || s}</span>
              </div>
            ))
          ) : (
            <div className="whitespace-pre-wrap">{JSON.stringify(scales, null, 2)}</div>
          )}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-sm text-left">
      <div className="font-bold text-slate-800 mb-2">{title}</div>
      <div className="text-slate-700 whitespace-pre-wrap">
        {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
      </div>
    </div>
  );
};
