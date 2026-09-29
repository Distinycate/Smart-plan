/**
 * Smart Plan V3 — Canonical Document Formatters
 *
 * Deterministic text formatting, list formatting, and Thai numbering.
 * Strictly 0 AI calls.
 */

import { THAI_APPENDIX_LETTERS } from './labels';

/**
 * Returns Thai alphabetical letter for 0-indexed appendix number.
 * 0 -> "ก", 1 -> "ข", 2 -> "ค", ...
 */
export function getThaiAppendixLetter(index: number): string {
  if (index >= 0 && index < THAI_APPENDIX_LETTERS.length) {
    return THAI_APPENDIX_LETTERS[index];
  }
  return String.fromCharCode(65 + index); // Fallback to A, B, C if exceeded
}

/**
 * Format duration for document text.
 * e.g. 60 -> "60 นาที (1 ชั่วโมง)"
 */
export function formatDocumentDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 นาที';
  if (minutes < 60) return `${minutes} นาที`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${minutes} นาที (${h} ชั่วโมง)`;
  return `${minutes} นาที (${h} ชั่วโมง ${m} นาที)`;
}

/**
 * Format ISO date string to full Thai official date format.
 * e.g. "2026-09-29" -> "29 กันยายน พ.ศ. 2569"
 */
export function formatDocumentThaiDate(isoDateString?: string | null): string {
  if (!isoDateString) return '';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoDateString || '';
  }
}

/**
 * Clean text from accidental brackets or artifacts.
 */
export function sanitizeDocumentText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/\s*[\(\[]?(แก้ไข|ปรับปรุง|แนะนำ)?โดย\s*(AI|เอไอ)[\)\]]?\s*/gi, ' ')
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Format objective references list into Thai readable string.
 * e.g. [1, 2] -> "ข้อ 1, 2"
 */
export function formatObjectiveRefNumbers(positions: number[]): string {
  if (!positions || positions.length === 0) return 'ทุกข้อ';
  const sorted = Array.from(new Set(positions)).sort((a, b) => a - b);
  return `ข้อ ${sorted.join(', ')}`;
}
