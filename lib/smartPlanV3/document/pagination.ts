/**
 * Smart Plan V3 — Document Pagination & Layout Policy
 *
 * Defines A4 physical constraints, print styles, and pagination hints.
 * Pure definitions — zero dependencies.
 */

export const A4_DIMENSIONS = {
  widthMm: 210,
  heightMm: 297,
  // Recommended Thai official document margins
  marginTopMm: 20,
  marginBottomMm: 20,
  marginLeftMm: 20,
  marginRightMm: 15,
} as const;

export const BREAK_CLASSES = {
  PAGE_BREAK_BEFORE: 'page-break-before',
  PAGE_BREAK_AFTER: 'page-break-after',
  AVOID_BREAK_INSIDE: 'avoid-break-inside',
  ALLOW_BREAK: 'allow-break',
} as const;

export interface PaginationHint {
  estimatedPageCount?: number;
  breakBefore?: boolean;
  breakAfter?: boolean;
  avoidBreakInside?: boolean;
}

/**
 * Standard CSS rules for A4 print and screen preview.
 */
export const DOCUMENT_A4_CSS = `
  @page {
    size: A4 portrait;
    margin: ${A4_DIMENSIONS.marginTopMm}mm ${A4_DIMENSIONS.marginRightMm}mm ${A4_DIMENSIONS.marginBottomMm}mm ${A4_DIMENSIONS.marginLeftMm}mm;
  }

  .a4-sheet {
    box-sizing: border-box;
    width: 210mm;
    min-height: 297mm;
    padding: ${A4_DIMENSIONS.marginTopMm}mm ${A4_DIMENSIONS.marginRightMm}mm ${A4_DIMENSIONS.marginBottomMm}mm ${A4_DIMENSIONS.marginLeftMm}mm;
    margin: 0 auto 24px auto;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    color: #111827;
    font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
    font-size: 15pt;
    line-height: 1.45;
  }

  .page-break-before {
    page-break-before: always;
    break-before: page;
  }

  .page-break-after {
    page-break-after: always;
    break-after: page;
  }

  .avoid-break-inside {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .allow-break {
    page-break-inside: auto;
    break-inside: auto;
  }

  /* Table break handling */
  table {
    border-collapse: collapse;
    width: 100%;
  }

  table thead {
    display: table-header-group;
  }

  table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Headings orphan protection */
  h1, h2, h3, h4, .section-heading {
    page-break-after: avoid;
    break-after: avoid;
  }

  @media print {
    body, html {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .no-print, .preview-toolbar, .options-sidebar {
      display: none !important;
    }

    .a4-sheet {
      width: 100% !important;
      min-height: auto !important;
      padding: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: none !important;
    }
  }
`;
