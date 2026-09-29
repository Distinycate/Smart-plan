/**
 * POST /api/plan/v3/[id]/post-teaching/evidence/upload
 *
 * Secure Server-side Evidence Upload Handler:
 * - Validates authentication and plan ownership
 * - Validates file size (max 15MB)
 * - Validates magic bytes / MIME type (JPEG, PNG, WebP, GIF, PDF)
 * - Stores in private Supabase bucket 'v3_student_evidence' under path: {userId}/{planId}/{uuid}.{ext}
 * - Generates temporary signed URL (no permanent public URLs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isValidUuid } from '@/lib/smartPlanV3/schemas';
import crypto from 'crypto';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function detectMagicMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  // PDF: %PDF-
  if (buffer.slice(0, 4).toString('ascii') === '%PDF') {
    return 'application/pdf';
  }
  // PNG: \x89PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: \xFF\xD8\xFF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // GIF: GIF87a or GIF89a
  if (buffer.slice(0, 4).toString('ascii') === 'GIF8') {
    return 'image/gif';
  }
  // WEBP: RIFF....WEBP
  if (buffer.length >= 12 && buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    if (!isValidUuid(planId)) {
      return NextResponse.json({ success: false, error: 'รหัสแผนการสอนไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    // Verify ownership of the plan
    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson) {
      return NextResponse.json({ success: false, error: 'ไม่พบแผนการสอน' }, { status: 404 });
    }
    if (lesson.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์อัปโหลดหลักฐานสำหรับแผนการสอนนี้' }, { status: 403 });
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลฟอร์ม' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' }, { status: 400 });
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `ขนาดไฟล์เกินกำหนด (สูงสุด 15MB, ขนาดไฟล์ปัจจุบัน: ${(file.size / (1024 * 1024)).toFixed(2)}MB)` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    const detectedMime = detectMagicMime(buffer);
    if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
      return NextResponse.json(
        { success: false, error: 'ประเภทไฟล์ไม่รองรับ รองรับเฉพาะรูปภาพ (JPEG, PNG, WebP, GIF) และไฟล์ PDF เท่านั้น' },
        { status: 400 }
      );
    }

    const ext = detectedMime === 'application/pdf' ? 'pdf'
      : detectedMime === 'image/png' ? 'png'
      : detectedMime === 'image/webp' ? 'webp'
      : detectedMime === 'image/gif' ? 'gif'
      : 'jpg';

    const fileUuid = crypto.randomUUID();
    const storagePath = `${user.id}/${planId}/${fileUuid}.${ext}`;

    // Upload to private Supabase Storage bucket
    const { error: uploadError } = await supabase.storage
      .from('v3_student_evidence')
      .upload(storagePath, buffer, {
        contentType: detectedMime,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Evidence Upload Error]:', uploadError);
      return NextResponse.json(
        { success: false, error: `ไม่สามารถอัปโหลดไฟล์ได้: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedData, error: signError } = await supabase.storage
      .from('v3_student_evidence')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      success: true,
      storage_path: storagePath,
      signed_url: signedData?.signedUrl || null,
      file_size: file.size,
      mime_type: detectedMime,
      filename: file.name,
      message: 'อัปโหลดหลักฐานเรียบร้อยแล้ว',
    });

  } catch (err: any) {
    console.error('[Evidence Upload Exception]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/plan/v3/[id]/post-teaching/evidence/upload?path=...
 * Generates fresh signed URL for authorized owner to view file.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const planId = params.id;
    const { searchParams } = new URL(req.url);
    const storagePath = searchParams.get('path');

    if (!isValidUuid(planId) || !storagePath) {
      return NextResponse.json({ success: false, error: 'พารามิเตอร์ไม่ถูกต้อง' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    // Verify ownership of the plan
    const { data: lesson, error: lErr } = await supabase
      .from('v3_lesson_plans')
      .select('id, user_id')
      .eq('id', planId)
      .maybeSingle();

    if (lErr || !lesson || lesson.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึงหลักฐานนี้' }, { status: 403 });
    }

    // Path must start with {user.id}/{planId}/
    if (!storagePath.startsWith(`${user.id}/${planId}/`)) {
      return NextResponse.json({ success: false, error: 'ไม่อนุญาตให้เข้าถึงไฟล์นอกแผนการสอนของคุณ' }, { status: 403 });
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from('v3_student_evidence')
      .createSignedUrl(storagePath, 3600);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json({ success: false, error: 'ไม่สามารถสร้างลิงก์สำหรับเปิดดูไฟล์ได้' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signed_url: signedData.signedUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
