const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Add lucide-react icons
if (!content.includes('Folder,')) {
  content = content.replace(
    /import \{([\s\S]*?)from 'lucide-react';/,
    (match, p1) => {
      return `import {${p1}Folder, FolderOpen, ChevronRight, ChevronDown, ` + `} from 'lucide-react';`;
    }
  );
}

// 2. Add useMemo to react import
if (!content.includes('useMemo')) {
  content = content.replace(
    /import React, { useEffect, useState } from 'react';/,
    `import React, { useEffect, useState, useMemo } from 'react';`
  );
}

// 3. Add state and logic for grouped plans
const stateLogic = `
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const groupedPlans = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, any[]>>> = {};
    filteredPlans.forEach(plan => {
      const year = plan.academicYear ? \`ปีการศึกษา \${plan.academicYear}\` : 'ไม่ระบุปีการศึกษา';
      const grade = plan.gradeLevel || 'ไม่ระบุระดับชั้น';
      const subject = plan.subjectName || 'ไม่ระบุรายวิชา';

      if (!groups[year]) groups[year] = {};
      if (!groups[year][grade]) groups[year][grade] = {};
      if (!groups[year][grade][subject]) groups[year][grade][subject] = [];
      groups[year][grade][subject].push(plan);
    });
    return groups;
  }, [filteredPlans]);
`;

if (!content.includes('expandedFolders')) {
  content = content.replace(
    /const loadData = async \(isRefresh = false, tab = activeTab\) => \{/,
    `${stateLogic}\n  const loadData = async (isRefresh = false, tab = activeTab) => {`
  );
}

// 4. Replace the rendering block
// Find <div className="plan-cards-grid"> to end of it.
const gridStart = content.indexOf('<div className="plan-cards-grid">');
// We need to replace the entire 
//         ) : (
//           <div className="plan-cards-grid">
//              ...
//           </div>
//         )}

const renderContent = `        ) : (
          <div className="folders-container">
            {Object.keys(groupedPlans).sort((a,b) => b.localeCompare(a)).map(year => (
              <div key={year} className="folder-level-1">
                <div 
                  className="folder-header bg-slate-50 border border-slate-200 hover:bg-slate-100 p-4 rounded-xl flex items-center gap-3 cursor-pointer mb-3 transition-colors shadow-sm"
                  onClick={() => toggleFolder(year)}
                >
                  {expandedFolders.has(year) ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
                  {expandedFolders.has(year) ? <FolderOpen size={24} className="text-indigo-500 fill-indigo-100" /> : <Folder size={24} className="text-indigo-500 fill-indigo-100" />}
                  <h3 className="font-bold text-lg text-slate-800 m-0">{year}</h3>
                  <span className="ml-auto bg-white px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-200 shadow-sm">
                    {Object.values(groupedPlans[year]).reduce((acc, gradeObj) => acc + Object.values(gradeObj).reduce((acc2, subjArr) => acc2 + subjArr.length, 0), 0)} แผน
                  </span>
                </div>

                {expandedFolders.has(year) && (
                  <div className="pl-6 md:pl-10 space-y-4 mb-6 border-l-2 border-slate-100 ml-4">
                    {Object.keys(groupedPlans[year]).sort().map(grade => (
                      <div key={grade} className="folder-level-2 mt-4">
                        <div 
                          className="folder-header flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"
                          onClick={() => toggleFolder(\`\${year}-\${grade}\`)}
                        >
                          {expandedFolders.has(\`\${year}-\${grade}\`) ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                          {expandedFolders.has(\`\${year}-\${grade}\`) ? <FolderOpen size={20} className="text-cyan-500 fill-cyan-50" /> : <Folder size={20} className="text-cyan-500 fill-cyan-50" />}
                          <h4 className="font-bold text-slate-700 m-0">{grade}</h4>
                          <span className="ml-auto text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {Object.values(groupedPlans[year][grade]).reduce((acc, subjArr) => acc + subjArr.length, 0)} แผน
                          </span>
                        </div>

                        {expandedFolders.has(\`\${year}-\${grade}\`) && (
                          <div className="pl-6 space-y-3 mt-2 border-l border-slate-100 ml-3">
                            {Object.keys(groupedPlans[year][grade]).sort().map(subject => (
                              <div key={subject} className="folder-level-3">
                                <div 
                                  className="folder-header flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                  onClick={() => toggleFolder(\`\${year}-\${grade}-\${subject}\`)}
                                >
                                  {expandedFolders.has(\`\${year}-\${grade}-\${subject}\`) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                                  {expandedFolders.has(\`\${year}-\${grade}-\${subject}\`) ? <FolderOpen size={18} className="text-emerald-500 fill-emerald-50" /> : <Folder size={18} className="text-emerald-500 fill-emerald-50" />}
                                  <h5 className="font-semibold text-slate-600 m-0">{subject}</h5>
                                  <span className="ml-auto text-xs font-medium text-slate-400">
                                    {groupedPlans[year][grade][subject].length} แผน
                                  </span>
                                </div>

                                {expandedFolders.has(\`\${year}-\${grade}-\${subject}\`) && (
                                  <div className="plan-cards-grid mt-4 mb-8">
                                    {groupedPlans[year][grade][subject].map((plan, idx) => (
                                      <div key={plan.planId} className="plan-card" style={{ animationDelay: \`\${Math.min(idx * 50, 400)}ms\` }}>
                                        {/* Top bar */}
                                        <div className="plan-card-top">
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                            <span className="plan-code">{plan.subjectCode}</span>
                                            <span className={\`ps-badge \${plan.planStatus}\`}>
                                              {getStatusBadge(plan.planStatus)}
                                            </span>
                                          </div>
                                          <span className="plan-grade-badge">{plan.gradeLevel}</span>
                                        </div>

                                        {/* Body */}
                                        <div className="plan-card-body">
                                          <div className="plan-subject-name">{plan.subjectName}</div>
                                          <div className="plan-topic">{plan.lessonTopic}</div>
                                          <div className="plan-unit">
                                            <BookOpen size={11} style={{ flexShrink: 0 }} />
                                            <span>{plan.unitName || '—'}</span>
                                          </div>
                                        </div>

                                        {/* Meta row */}
                                        <div className="plan-meta">
                                          <span><Calendar size={11} /> ภาค {plan.semester}/{plan.academicYear}</span>
                                          <span><Clock size={11} /> {plan.totalHours} ชม.</span>
                                          <span><PenLine size={11} /> {formatDate(plan.updatedAt || plan.createdAt)}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="plan-actions">
                                          <button className="pact-btn pact-preview" onClick={() => window.open(\`/plan/\${plan.planId}/preview\`, '_blank')}>
                                            <Eye size={13} /> ดูตัวอย่าง
                                          </button>
                                          {activeTab !== 'archived' ? (
                                            <>
                                              <button className="pact-btn pact-edit" onClick={() => router.push(\`/plan/\${plan.planId}\`)}>
                                                <FileEdit size={13} /> แก้ไข
                                              </button>
                                              <button className="pact-btn pact-word" onClick={() => handleExportWord(plan.planId)}>
                                                <FileDown size={13} /> Word
                                              </button>
                                              <button className="pact-btn pact-pdf" onClick={() => handleExportPdf(plan.planId)}>
                                                <Printer size={13} /> PDF
                                              </button>
                                              <button className="pact-btn pact-archive" onClick={() => handleArchivePlan(plan.planId, plan.lessonTopic)} title="เก็บถาวรแผนการสอน">
                                                <Archive size={13} />
                                              </button>
                                            </>
                                          ) : (
                                            <button className="pact-btn pact-word" style={{ background: '#dcfce7', color: '#15803d' }} onClick={() => handleRestorePlan(plan.planId, plan.lessonTopic)}>
                                              <RefreshCw size={13} /> กู้คืนแผนนี้
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>`;

const searchStrStart = `        ) : (
          <div className="plan-cards-grid">`;
const gridEnd = content.indexOf('</div>\n        )}', gridStart + searchStrStart.length);

if (gridStart !== -1 && gridEnd !== -1) {
  content = content.substring(0, gridStart - 13) + renderContent + content.substring(gridEnd + 16);
} else {
  console.log("Could not find the grid section to replace");
}

fs.writeFileSync('app/page.tsx', content);
console.log("Updated page.tsx successfully!");
