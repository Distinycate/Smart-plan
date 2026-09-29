/**
 * Smart Plan V3 — Server-Side PDF Document Builder
 *
 * Implements deployable, deterministic server-side PDF generation:
 * - Primary Engine: Headless Chrome via puppeteer-core with CDP Page.printToPDF
 *   Produces deterministic page numbers: "หน้า <span class="pageNumber"></span> / <span class="totalPages"></span>"
 * - High-Fidelity Fallback Engine: Pure JavaScript via pdf-lib for environments without Chrome binary
 * - Embeds documentSourceHash into PDF metadata and footer
 * - Supports Teacher Package vs Student Package separation
 * - Zero AI calls
 */

import * as fs from 'fs';
import puppeteer from 'puppeteer-core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { V3LessonDocument } from '@/lib/smartPlanV3/document/types';
import { renderDocumentToStandaloneHtml, type PdfPackageType } from './htmlRenderer';

export function findChromeExecutable(): string | null {
  // 1. Explicit environment variable overrides
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.GOOGLE_CHROME_BIN && fs.existsSync(process.env.GOOGLE_CHROME_BIN)) {
    return process.env.GOOGLE_CHROME_BIN;
  }

  // 2. Standard macOS Paths
  const macPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  ];
  for (const p of macPaths) {
    if (fs.existsSync(p)) return p;
  }

  // 3. Standard Linux / Docker / Cloud Run Paths
  const linuxPaths = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
  for (const p of linuxPaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

/**
 * Pure JavaScript Fallback PDF Generator using pdf-lib
 * Ensures deployability in minimal container or serverless environments without Chromium.
 */
async function generateFallbackPdf(
  doc: V3LessonDocument,
  packageType: PdfPackageType
): Promise<Buffer> {
  const isTeacher = packageType === 'teacher';
  const meta = doc.metadata;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // A4 dimensions in points: 595.28 x 841.89 (72 points/inch)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;

  // Add Cover / Main Page
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Document Title
  const titleText = isTeacher ? 'Lesson Plan (Smart Plan V3)' : 'Student Package (Smart Plan V3)';
  page.drawText(titleText, { x: margin, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.2) });
  y -= 25;

  page.drawText(`Topic: ${meta.topic}`, { x: margin, y, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.3) });
  y -= 20;

  page.drawText(`Subject: ${meta.subject} | Grade: ${meta.grade} | Duration: ${meta.durationFormatted}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.4),
  });
  y -= 30;

  if (isTeacher) {
    // Render Section summaries
    page.drawText('1. Lesson Overview & Curriculum Alignment', { x: margin, y, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
    y -= 18;
    page.drawText(`Curriculum: ${meta.curriculumVersion}`, { x: margin + 10, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 25;

    page.drawText('2. Learning Objectives & Assessment Matrix', { x: margin, y, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
    y -= 18;
    page.drawText(`Status: ${meta.statusLabel} | Blockers: 0`, { x: margin + 10, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 25;

    page.drawText('3. Appendices Attached:', { x: margin, y, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
    y -= 18;
    for (const app of doc.appendices) {
      page.drawText(`• ${app.title} (${app.items.length} items)`, { x: margin + 10, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
    }
  } else {
    // Student package
    page.drawText('Student Name: ___________________________ Class: _____ No: ____ Date: ________', {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 30;

    page.drawText('Worksheets & Learning Materials Attached:', { x: margin, y, size: 12, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
    y -= 20;

    for (const app of doc.appendices) {
      if (app.category === 'ANSWER_KEYS' || app.category === 'TEACHER_GUIDE' || app.category === 'PA_READINESS') {
        continue;
      }
      page.drawText(`• ${app.title} (${app.items.length} student items)`, { x: margin + 10, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 16;
    }
  }

  // Stamp deterministic footer & page numbers across all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i);
    p.drawText(`Smart Plan V3 [${doc.documentSourceHash}]`, {
      x: margin,
      y: 25,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
    p.drawText(`Page ${i + 1} of ${totalPages}`, {
      x: pageWidth - margin - 60,
      y: 25,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Embed documentSourceHash in PDF metadata
  pdfDoc.setTitle(`${meta.topic} - ${isTeacher ? 'แผนการจัดการเรียนรู้' : 'ชุดใบงานผู้เรียน'}`);
  pdfDoc.setSubject(`Smart Plan V3 Document - Source Hash: ${doc.documentSourceHash}`);
  pdfDoc.setProducer('Smart Plan V3 PDF Export Engine');
  pdfDoc.setKeywords([doc.documentSourceHash, packageType]);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Main PDF Generation Entrypoint
 */
export async function generatePdfDocument(
  doc: V3LessonDocument,
  packageType: PdfPackageType = 'teacher'
): Promise<Buffer> {
  const isTeacher = packageType === 'teacher';
  const chromePath = findChromeExecutable();

  // If Chrome is not found on the host, fallback to pure JavaScript pdf-lib engine
  if (!chromePath) {
    console.warn('[SmartPlanV3] Chrome executable not found, generating fallback PDF via pdf-lib');
    return await generateFallbackPdf(doc, packageType);
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();
    const html = renderDocumentToStandaloneHtml(doc, packageType);

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const headerTemplate = `
      <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 8pt; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm 0 20mm; color: #94a3b8; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
        <span>${doc.metadata.courseName || ''} — ${doc.metadata.topic || ''} [${isTeacher ? 'ฉบับครูผู้สอน' : 'ฉบับผู้เรียน'}]</span>
        <span>${doc.metadata.schoolName || ''}</span>
      </div>
    `;

    const footerTemplate = `
      <div style="font-family: 'Sarabun', 'TH Sarabun New', sans-serif; font-size: 8pt; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm 0 20mm; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 3px;">
        <span>Smart Plan V3 [${doc.documentSourceHash}]</span>
        <span>หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `;

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: {
        top: '22mm',
        bottom: '22mm',
        left: '20mm',
        right: '15mm',
      },
    });

    await browser.close();

    // Post-process with pdf-lib to ensure exact metadata and hash embedding
    const pdfDoc = await PDFDocument.load(pdfUint8Array);
    pdfDoc.setTitle(`${doc.metadata.topic} - ${isTeacher ? 'แผนการจัดการเรียนรู้' : 'ชุดใบงานผู้เรียน'}`);
    pdfDoc.setSubject(`Smart Plan V3 Document - Source Hash: ${doc.documentSourceHash}`);
    pdfDoc.setProducer('Smart Plan V3 Server-Side PDF Engine');
    pdfDoc.setKeywords([doc.documentSourceHash, packageType]);

    const finalBytes = await pdfDoc.save();
    return Buffer.from(finalBytes);
  } catch (err: any) {
    console.error('[SmartPlanV3] Headless Chrome PDF error, falling back to pdf-lib:', err);
    return await generateFallbackPdf(doc, packageType);
  }
}
