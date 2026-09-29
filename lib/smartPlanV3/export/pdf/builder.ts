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

export class PdfEngineUnavailableError extends Error {
  code = 'PDF_ENGINE_UNAVAILABLE';
  constructor(message?: string) {
    super(
      message ||
        'Chromium headless browser is required to render canonical A4 PDF with full Thai typography, tables, and pagination. Please ensure Chromium is installed or configure CHROMIUM_PATH.'
    );
    this.name = 'PdfEngineUnavailableError';
  }
}

/**
 * Main PDF Generation Entrypoint
 *
 * Produces canonical A4 PDF using Headless Chrome with CDP Page.printToPDF.
 * Zero silent degradation: If Chromium is missing or fails, throws PdfEngineUnavailableError.
 */
export async function generatePdfDocument(
  doc: V3LessonDocument,
  packageType: PdfPackageType = 'teacher'
): Promise<Buffer> {
  const isTeacher = packageType === 'teacher';
  const chromePath = findChromeExecutable();

  // Explicit failure policy: NEVER return a degraded/incomplete PDF silently
  if (!chromePath) {
    throw new PdfEngineUnavailableError(
      'Chromium binary not found on host. Cannot generate canonical PDF. Configure CHROMIUM_PATH or install Chromium.'
    );
  }

  let browser: any = null;
  try {
    browser = await puppeteer.launch({
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

    // Wait for web fonts (Sarabun / Thai typography) to finish rendering
    await page.evaluate(async () => {
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
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
    browser = null;

    // Post-process with pdf-lib to ensure exact metadata and hash embedding
    const pdfDoc = await PDFDocument.load(pdfUint8Array);
    pdfDoc.setTitle(`${doc.metadata.topic} - ${isTeacher ? 'แผนการจัดการเรียนรู้' : 'ชุดใบงานผู้เรียน'}`);
    pdfDoc.setSubject(`Smart Plan V3 Document - Source Hash: ${doc.documentSourceHash}`);
    pdfDoc.setProducer('Smart Plan V3 Server-Side PDF Engine');
    pdfDoc.setKeywords([doc.documentSourceHash, packageType]);

    const finalBytes = await pdfDoc.save();
    return Buffer.from(finalBytes);
  } catch (err: any) {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
    if (err instanceof PdfEngineUnavailableError) {
      throw err;
    }
    console.error('[SmartPlanV3] Headless Chrome PDF render error:', err);
    throw new PdfEngineUnavailableError(
      `Headless Chrome PDF rendering failed: ${err.message || 'Unknown error'}`
    );
  }
}
