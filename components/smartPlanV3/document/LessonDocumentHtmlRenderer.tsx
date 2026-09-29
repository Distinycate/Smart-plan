import React from 'react';
import type { V3LessonDocument, DocumentAppendix } from '@/lib/smartPlanV3/document';
import { DocumentSectionRenderer } from './DocumentSectionRenderer';
import { TeachingAssetRenderer } from './TeachingAssetRenderer';
import { AssessmentToolRenderer } from './AssessmentToolRenderer';
import { DOCUMENT_A4_CSS } from '@/lib/smartPlanV3/document';

interface Props {
  document: V3LessonDocument;
  zoom?: number; // percentage, e.g. 100 or 90
}

export const LessonDocumentHtmlRenderer: React.FC<Props> = ({ document, zoom = 100 }) => {
  const { metadata, sections, appendices, options } = document;

  return (
    <div className="lesson-document-root text-slate-900 bg-slate-100/60 py-6 min-h-screen">
      <style>{DOCUMENT_A4_CSS}</style>

      <div
        className="document-zoom-wrapper transition-transform origin-top flex flex-col items-center"
        style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined }}
      >
        {/* ─── 1. Main Document Sheet (Body Sections) ─── */}
        <div className="a4-sheet border border-slate-200/60 shadow-lg relative">
          {/* Document Header */}
          <div className="text-center pb-4 mb-4 border-b-2 border-slate-900 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              แผนการจัดการเรียนรู้
            </h1>
            <div className="text-base font-semibold text-slate-800">
              เรื่อง: {metadata.topic}
            </div>
            <div className="text-sm text-slate-600 flex justify-center gap-4 flex-wrap">
              <span>กลุ่มสาระการเรียนรู้: {metadata.subject}</span>
              <span>ระดับชั้น: {metadata.grade}</span>
              <span>เวลา: {metadata.durationFormatted}</span>
            </div>
          </div>

          {/* Render Main Sections 1 to 10 */}
          <div className="space-y-4">
            {sections.map(section => (
              <DocumentSectionRenderer key={section.id} section={section} />
            ))}
          </div>

          {/* Main Plan Sign-off Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>{metadata.schoolName}</span>
            <span>แผนการจัดการเรียนรู้: {metadata.topic}</span>
          </div>
        </div>

        {/* ─── 2. Appendices Sheets (Each Appendix Category) ─── */}
        {appendices.map((app: DocumentAppendix) => (
          <div
            key={app.id}
            className="a4-sheet border border-slate-200/60 shadow-lg relative page-break-before mt-6"
          >
            {/* Appendix Category Header */}
            <div className="text-center pb-3 mb-5 border-b-2 border-slate-900 space-y-1">
              <div className="text-xs uppercase tracking-wider font-bold text-indigo-700">
                เอกสารแนบท้ายแผนการจัดการเรียนรู้
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                {app.title}
              </h2>
              {app.description && (
                <p className="text-xs text-slate-600">{app.description}</p>
              )}
            </div>

            {/* Appendix Items */}
            <div className="space-y-6">
              {app.items.map((item, itIdx) => (
                <div key={item.id || itIdx} className="appendix-item space-y-3">
                  <div className="flex justify-between items-baseline border-b border-slate-200 pb-1">
                    <h3 className="font-bold text-base text-slate-900">
                      {itIdx + 1}. {item.title}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">
                      [{item.itemTypeLabel}]
                    </span>
                  </div>

                  {/* Render based on Category */}
                  {app.category === 'ASSESSMENT_TOOLS' ? (
                    <AssessmentToolRenderer item={item} />
                  ) : (
                    <TeachingAssetRenderer item={item} />
                  )}
                </div>
              ))}
            </div>

            {/* Appendix Footer */}
            <div className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>{metadata.schoolName}</span>
              <span>{app.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
