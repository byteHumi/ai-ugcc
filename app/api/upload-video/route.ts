import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { uploadVideo, getSignedUrlFromPublicUrl } from '@/lib/storage';
import { createMediaFile } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No video uploaded' }, { status: 400 });
    }
    const ext = path.extname(file.name) || '.mp4';
    const allowed = /\.(mp4|mov|webm)$/i;
    if (!allowed.test(ext)) {
      return NextResponse.json(
        { error: 'Only video files (mp4, mov, webm) are allowed' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to GCS
    const { filename, url, contentType } = await uploadVideo(buffer, file.name);

    // Store in database
    await createMediaFile({
      filename,
      originalName: file.name,
      fileType: 'video',
      gcsUrl: url,
      fileSize: buffer.length,
      mimeType: contentType,
      jobId: null,
    });

    // Generate signed URL for immediate frontend preview
    const signedUrl = await getSignedUrlFromPublicUrl(url);

    return NextResponse.json({
      success: true,
      filename,
      url: signedUrl,      // Signed URL for frontend display
      gcsUrl: url,         // Public URL reference
      path: signedUrl,     // For backwards compatibility
      size: buffer.length,
    });
  } catch (err) {
    console.error('Upload video error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
