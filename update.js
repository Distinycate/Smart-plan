const fs = require('fs');
let content = fs.readFileSync('app/evaluator/page.tsx', 'utf-8');

// 1. Add evaluatingV4PlanId state
content = content.replace(
  'const [evaluatingPA8PlanId, setEvaluatingPA8PlanId] = useState<string | null>(null);',
  'const [evaluatingPA8PlanId, setEvaluatingPA8PlanId] = useState<string | null>(null);\n  const [evaluatingV4PlanId, setEvaluatingV4PlanId] = useState<string | null>(null);'
);

// 2. Add startEvaluateV4 function
const startEvaluateV4Func = `
  const startEvaluateV4 = async (resultIndex: number) => {
    const result = evaluationResults[resultIndex];
    if (!result || !result.originalPlanData) return;
    setEvaluatingV4PlanId(result.planId);
    try {
      const res = await fetch('/api/ai-evaluate-v4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planData: result.originalPlanData,
          externalText: result.planId === 'uploaded' ? fileText : null
        })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const newResults = [...evaluationResults];
      newResults[resultIndex].v4Evaluation = json.evaluation;
      // Mark as un-needing PA8 since V4 covers everything
      newResults[resultIndex].pa8Indicators = [{ met: true, indicator: 'V4 Review Complete', details: 'ประเมิน 4 มิติเรียบร้อยแล้ว' }];
      setEvaluationResults(newResults);
      toast.success('ประเมิน V4 ขั้นสูงเสร็จสมบูรณ์');
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาดในการประเมิน V4');
    } finally {
      setEvaluatingV4PlanId(null);
    }
  };
`;
content = content.replace(
  'const startEvaluatePA8 = async (resultIndex: number) => {',
  startEvaluateV4Func + '\n\n  const startEvaluatePA8 = async (resultIndex: number) => {'
);

// 3. Reset V4 State
content = content.replace(
  'setEvaluatingPA8PlanId(null);',
  'setEvaluatingPA8PlanId(null);\n    setEvaluatingV4PlanId(null);'
);

// 4. Update map to pass V4 props
content = content.replace(
  'isEvaluatingPA8={evaluatingPA8PlanId === result.planId}',
  'isEvaluatingPA8={evaluatingPA8PlanId === result.planId}\n                onEvaluateV4={() => startEvaluateV4(index)}\n                isEvaluatingV4={evaluatingV4PlanId === result.planId}'
);

// 5. Update EvaluationResultCard Component definition
content = content.replace(
  'onEvaluatePA8: () => void, isEvaluatingPA8: boolean }',
  'onEvaluatePA8: () => void, isEvaluatingPA8: boolean, onEvaluateV4: () => void, isEvaluatingV4: boolean }'
);

content = content.replace(
  'onEvaluatePA8,\n  isEvaluatingPA8',
  'onEvaluatePA8,\n  isEvaluatingPA8,\n  onEvaluateV4,\n  isEvaluatingV4'
);
content = content.replace(
  'onEvaluatePA8, isEvaluatingPA8 }:',
  'onEvaluatePA8, isEvaluatingPA8, onEvaluateV4, isEvaluatingV4 }:'
);

// 6. Inject the V4 output render just before the Plan Diff Viewer
const v4RenderHTML = `
        {/* AI Reviewer V4 Output */}
        {result.v4Evaluation && (
          <div className="mt-12 border-t border-slate-100 pt-10">
            <h4 className="flex items-center gap-2 text-2xl font-black text-indigo-900 mb-6">
              <Sparkles className="h-7 w-7 text-indigo-500" />
              รายงานการประเมิน 4 มิติ (AI Reviewer V4)
            </h4>
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-8 shadow-sm border border-indigo-100 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-indigo-100/50 pb-6">
                <div>
                  <h5 className="text-xl font-black text-indigo-950">คะแนนประเมินวิทยฐานะ (10 ด้าน)</h5>
                  <p className="text-sm font-medium text-indigo-700/80 mt-1">อ้างอิงหลักการ Constructive Alignment และ Active Learning</p>
                </div>
                <div className="flex items-end gap-2 bg-white px-6 py-3 rounded-2xl shadow-sm border border-indigo-50">
                  <span className="text-4xl font-black text-indigo-600">{result.v4Evaluation.totalScore}</span>
                  <span className="text-lg font-bold text-slate-400 mb-1">/ 100</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(result.v4Evaluation.categoryScores).map(([key, score]) => (
                  <div key={key} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-50 flex flex-col items-center text-center">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{key}</span>
                    <span className="text-xl font-black text-indigo-700">{score as React.ReactNode}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <h5 className="text-sm font-black text-emerald-800 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle className="w-5 h-5"/> จุดแข็งของแผนนี้</h5>
                <ul className="space-y-3">
                  {result.v4Evaluation.strengths.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium text-emerald-900 flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> {item}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                <h5 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> จุดที่ต้องแก้ไข / จุดอ่อน</h5>
                <ul className="space-y-3">
                  {result.v4Evaluation.weaknesses.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium text-rose-900 flex items-start gap-2"><span className="text-rose-500 mt-0.5">•</span> {item}</li>
                  ))}
                  {result.v4Evaluation.mustFix.map((item: string, i: number) => (
                    <li key={'mf'+i} className="text-sm font-black text-red-700 flex items-start gap-2"><span className="text-red-600 mt-0.5">⚠️</span> {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h5 className="text-lg font-black text-slate-800 mb-3">ข้อเสนอแนะเชิงวิชาการจากกรรมการ</h5>
              <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{result.v4Evaluation.academicSuggestions}</p>
            </div>
          </div>
        )}
`;
content = content.replace(
  '{/* Plan Diff Viewer (Before & After) */}',
  v4RenderHTML + '\n\n        {/* Plan Diff Viewer (Before & After) */}'
);

// 7. Inject V4 Button
const v4ButtonHTML = `
              {(!result.v4Evaluation) && (
                <button
                  onClick={onEvaluateV4}
                  disabled={isEvaluatingV4 || isFixing}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 hover:bg-indigo-700 disabled:bg-slate-300 disabled:scale-100"
                >
                  {isEvaluatingV4 ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> กำลังประเมิน V4 เชิงลึก (4 มิติ)...</>
                  ) : (
                    <><Rocket className="h-5 w-5" /> 🚀 ประเมินขั้นสูง V4 (กรรมการ 4 มิติ)</>
                  )}
                </button>
              )}
`;
content = content.replace(
  '<button\n                  onClick={onEvaluatePA8}',
  v4ButtonHTML + '\n              <button\n                  onClick={onEvaluatePA8}'
);

if (!content.includes('Rocket')) {
  content = content.replace(
    'import { FileText, Download, Share2',
    'import { FileText, Download, Share2, Rocket'
  );
  content = content.replace(
    '} from \\'lucide-react\\';',
    ', Rocket } from \\'lucide-react\\';'
  );
}

fs.writeFileSync('app/evaluator/page.tsx', content);
