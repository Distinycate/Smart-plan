import React from 'react';
import type { AppendixItem } from '@/lib/smartPlanV3/document';

interface Props {
  item: AppendixItem;
}

export const TeachingAssetRenderer: React.FC<Props> = ({ item }) => {
  const { itemType, content, title } = item;
  if (!content) {
    return (
      <div className="p-4 my-2 border border-dashed border-gray-300 rounded text-gray-500 text-sm">
        ไม่มีรายละเอียดเนื้อหาสื่อการเรียนรู้
      </div>
    );
  }

  // 1. Worksheet & Problem Set
  if (itemType === 'WORKSHEET' || itemType === 'PROBLEM_SET') {
    const sections = content.sections || [];
    return (
      <div className="asset-worksheet space-y-4 text-left">
        {content.instruction && (
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <span className="font-bold text-slate-800">คำชี้แจง: </span>
            <span>{content.instruction}</span>
          </div>
        )}
        {sections.map((sec: any, sIdx: number) => (
          <div key={sIdx} className="space-y-3">
            {sec.title && <div className="font-bold text-base text-slate-800 border-b pb-1">{sec.title}</div>}
            {sec.instruction && <div className="text-sm text-slate-600 italic">{sec.instruction}</div>}
            <div className="space-y-3">
              {(sec.items || []).map((q: any, qIdx: number) => (
                <div key={qIdx} className="p-3 bg-white border border-slate-200 rounded space-y-2">
                  <div className="font-semibold text-slate-900">
                    {q.itemNumber || qIdx + 1}. {q.prompt}
                  </div>
                  {/* Choices for Multiple Choice */}
                  {Array.isArray(q.choices) && q.choices.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4 text-sm text-slate-700">
                      {q.choices.map((c: string, cIdx: number) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <span className="inline-block w-5 h-5 rounded-full border border-slate-400 text-center text-xs leading-5">
                            {['ก', 'ข', 'ค', 'ง'][cIdx] || cIdx + 1}
                          </span>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Matching Pairs */}
                  {Array.isArray(q.matchingPairs) && q.matchingPairs.length > 0 && (
                    <div className="border border-slate-200 rounded p-2 text-sm space-y-1">
                      {q.matchingPairs.map((pair: any, pIdx: number) => (
                        <div key={pIdx} className="flex justify-between items-center py-1 border-b last:border-none">
                          <span className="font-medium text-slate-800">{pair.left}</span>
                          <span className="text-slate-400">........................</span>
                          <span className="text-slate-700">{pair.right}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Answer Space / Solution Lines */}
                  {q.answerSpace && (
                    <div className="mt-2 p-2 border border-dashed border-slate-300 rounded bg-slate-50/50 text-xs text-slate-500 min-h-[48px]">
                      {q.answerSpace}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. Speaking Card
  if (itemType === 'SPEAKING_CARD') {
    const cards = content.cards || [];
    return (
      <div className="asset-speaking-card space-y-4 text-left">
        {content.instruction && (
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <span className="font-bold text-slate-800">คำชี้แจงกิจกรรม: </span>
            <span>{content.instruction}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c: any, cIdx: number) => (
            <div key={cIdx} className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50/20 space-y-2">
              <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                <span className="font-bold text-indigo-900">{c.assignedTo || `บัตรที่ ${cIdx + 1}`}</span>
                {c.roleTitle && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">{c.roleTitle}</span>}
              </div>
              <div className="text-sm text-slate-800">
                <span className="font-semibold">สถานการณ์: </span>
                <span>{c.situation}</span>
              </div>
              {Array.isArray(c.cuesOrClues) && c.cuesOrClues.length > 0 && (
                <div className="text-xs text-slate-700 space-y-1">
                  <span className="font-semibold text-slate-900">ข้อมูล / บทสนทนาที่ได้รับ:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {c.cuesOrClues.map((cue: string, cueIdx: number) => (
                      <li key={cueIdx}>{cue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(c.targetVocabulary) && c.targetVocabulary.length > 0 && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold">คำศัพท์เป้าหมาย: </span>
                  <span>{c.targetVocabulary.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Experiment Sheet & Data Table
  if (itemType === 'EXPERIMENT_SHEET' || itemType === 'DATA_TABLE') {
    const materials = content.materials || [];
    const steps = content.steps || [];
    const dataTable = content.dataTable || null;

    return (
      <div className="asset-experiment space-y-4 text-left">
        {content.instruction && (
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <span className="font-bold text-slate-800">วัตถุประสงค์ / คำชี้แจง: </span>
            <span>{content.instruction}</span>
          </div>
        )}
        {materials.length > 0 && (
          <div className="text-sm">
            <span className="font-bold text-slate-900">อุปกรณ์และสารเคมีที่ใช้:</span>
            <div className="grid grid-cols-2 gap-1 mt-1 pl-4 text-slate-700">
              {materials.map((m: string, mIdx: number) => (
                <div key={mIdx}>• {m}</div>
              ))}
            </div>
          </div>
        )}
        {steps.length > 0 && (
          <div className="text-sm space-y-1">
            <span className="font-bold text-slate-900">ขั้นตอนการทดลอง:</span>
            <ol className="list-decimal pl-5 space-y-1 text-slate-800">
              {steps.map((st: string, stIdx: number) => (
                <li key={stIdx}>{st}</li>
              ))}
            </ol>
          </div>
        )}
        {dataTable && (
          <div className="space-y-1">
            <div className="font-bold text-sm text-slate-900">{dataTable.title || 'ตารางบันทึกผลการทดลอง'}</div>
            <table className="w-full border-collapse border border-slate-300 text-xs sm:text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {(dataTable.columns || []).map((col: string, colIdx: number) => (
                    <th key={colIdx} className="border border-slate-300 p-2 text-center font-bold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dataTable.initialRows && dataTable.initialRows.length > 0
                  ? dataTable.initialRows
                  : [Array((dataTable.columns || []).length).fill('')]
                ).map((row: string[], rIdx: number) => (
                  <tr key={rIdx}>
                    {row.map((cell: string, cIdx: number) => (
                      <td key={cIdx} className="border border-slate-300 p-2 text-center min-h-[32px]">
                        {cell || <span className="text-slate-300">...</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {content.evidenceSummaryPrompt && (
          <div className="p-3 border border-slate-200 rounded text-sm space-y-1">
            <span className="font-bold text-slate-800">สรุปผลการทดลอง:</span>
            <div className="min-h-[48px] border-b border-dashed border-slate-300" />
          </div>
        )}
      </div>
    );
  }

  // 4. Task Card
  if (itemType === 'TASK_CARD') {
    const stations = content.stations || [];
    return (
      <div className="asset-task-card space-y-4 text-left">
        {content.instruction && (
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <span className="font-bold text-slate-800">คำชี้แจง: </span>
            <span>{content.instruction}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stations.map((st: any, sIdx: number) => (
            <div key={sIdx} className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50/20 space-y-2">
              <div className="font-bold text-emerald-900 border-b border-emerald-200 pb-1">
                สถานีที่ {st.stationNumber || sIdx + 1}: {st.title}
              </div>
              <div className="text-sm text-slate-800">{st.instructions}</div>
              {st.keyCriteria && (
                <div className="text-xs text-emerald-800 bg-emerald-100 p-1.5 rounded">
                  เกณฑ์ความสำเร็จ: {st.keyCriteria}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 5. Exit Ticket
  if (itemType === 'EXIT_TICKET') {
    const prompts = content.prompts || [];
    return (
      <div className="asset-exit-ticket p-4 border-2 border-dashed border-amber-300 rounded-lg bg-amber-50/30 space-y-3 text-left max-w-lg mx-auto">
        <div className="font-bold text-amber-900 text-center border-b border-amber-200 pb-2">
          {title || 'บัตรสรุปการเรียนรู้ก่อนออกจากชั้นเรียน (Exit Ticket)'}
        </div>
        {prompts.map((p: any, pIdx: number) => (
          <div key={pIdx} className="space-y-1 text-sm">
            <div className="font-medium text-slate-900">{pIdx + 1}. {p.prompt || p}</div>
            <div className="border-b border-dotted border-slate-400 min-h-[24px]" />
          </div>
        ))}
      </div>
    );
  }

  // 6. Answer Key
  if (itemType === 'ANSWER_KEY' || item.isAnswerKey) {
    const items = content.answers || content.solutions || [];
    return (
      <div className="asset-answer-key space-y-3 text-left">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-sm text-rose-900 font-medium">
          เอกสารเฉลยและแนวคำตอบสำหรับครูผู้สอน
        </div>
        {Array.isArray(items) && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((ans: any, aIdx: number) => (
              <div key={aIdx} className="p-3 bg-white border border-slate-200 rounded text-sm space-y-1">
                <div className="font-bold text-slate-900">
                  ข้อ {ans.itemNumber || aIdx + 1}: {ans.correctAnswer || ans.answer || ''}
                </div>
                {ans.explanation && (
                  <div className="text-xs text-slate-600">คำอธิบาย/วิธีคิด: {ans.explanation}</div>
                )}
                {ans.rubricCriteria && (
                  <div className="text-xs text-slate-500">เกณฑ์การให้คะแนน: {ans.rubricCriteria}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-700 whitespace-pre-wrap p-3 bg-white border rounded">
            {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
          </div>
        )}
      </div>
    );
  }

  // 7. Teacher Guide
  if (itemType === 'TEACHER_GUIDE') {
    const timeline = content.timeline || [];
    const prep = content.preparationChecklist || [];
    return (
      <div className="asset-teacher-guide space-y-4 text-left">
        {prep.length > 0 && (
          <div className="p-3 bg-slate-50 border rounded text-sm space-y-1">
            <div className="font-bold text-slate-900">สิ่งที่ครูต้องเตรียมก่อนสอน:</div>
            <ul className="list-disc pl-5 text-slate-700">
              {prep.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {timeline.length > 0 && (
          <div className="space-y-2">
            <div className="font-bold text-sm text-slate-900">ลำดับขั้นตอนการจัดการชั้นเรียน:</div>
            {timeline.map((step: any, idx: number) => (
              <div key={idx} className="p-2 border rounded text-sm flex gap-3">
                <span className="font-bold text-slate-600 whitespace-nowrap">{step.minute || `${idx * 10} น.`}</span>
                <span className="text-slate-800">{step.action || step.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback: Generic Structured Rendering
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-sm text-left">
      <div className="font-bold text-slate-800 mb-2">{title}</div>
      <div className="text-slate-700 whitespace-pre-wrap">
        {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
      </div>
    </div>
  );
};
