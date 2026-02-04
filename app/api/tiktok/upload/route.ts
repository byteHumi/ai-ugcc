import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { config } from '@/lib/config';
import { lateApiRequest } from '@/lib/lateApi';
import { downloadToBuffer } from '@/lib/storage';
import { createPost } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    videoPath,
    videoUrl, // New: direct GCS URL
    caption,
    accountId,
    scheduledFor,
    timezone,
    publishNow,
    jobId,
  } = body as {
    videoPath?: string;
    videoUrl?: string;
    caption?: string;
    accountId?: string;
    scheduledFor?: string;
    timezone?: string;
    publishNow?: boolean;
    jobId?: string;
  };

  if (!config.LATE_API_KEY) {
    return NextResponse.json({ error: 'LATE_API_KEY not configured' }, { status: 500 });
  }

  // Support both videoUrl (new GCS URL) and videoPath (backwards compatibility)
  const finalVideoUrl = videoUrl || videoPath;
  if (!finalVideoUrl) {
    return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'TikTok account ID is required' }, { status: 400 });
  }

  try {
    // Extract filename from URL
    const filename = path.basename(finalVideoUrl);
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === '.mp4' ? 'video/mp4' : ext === '.mov' ? 'video/quicktime' : ext === '.webm' ? 'video/webm' : 'video/mp4';

    // Get presigned upload URL from Late API
    const presignData = (await lateApiRequest<{ uploadUrl: string; publicUrl: string }>('/media/presign', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    })) as { uploadUrl: string; publicUrl: string };

    // Download video from GCS and upload to Late API
    let fileBuffer: Buffer;
    if (finalVideoUrl.startsWith('https://storage.googleapis.com')) {
      fileBuffer = await downloadToBuffer(finalVideoUrl);
    } else {
      // Fetch from any URL
      const response = await fetch(finalVideoUrl);
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    const uploadResponse = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(fileBuffer),
    });
    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.status}`);
    }

    await new Promise((r) => setTimeout(r, 1500));

    const postBody: Record<string, unknown> = {
      content: caption || '',
      mediaItems: [{ type: 'video', url: presignData.publicUrl }],
      platforms: [
        {
          platform: 'tiktok',
          accountId,
          platformSpecificData: {
            tiktokSettings: {
              privacy_level: 'PUBLIC_TO_EVERYONE',
              allow_comment: true,
              allow_duet: true,
              allow_stitch: true,
              content_preview_confirmed: true,
              express_consent_given: true,
            },
          },
        },
      ],
    };
    if (publishNow) {
      postBody.publishNow = true;
    } else if (scheduledFor) {
      postBody.scheduledFor = scheduledFor;
      postBody.timezone = timezone || config.defaultTimezone;
    } else {
      postBody.publishNow = true;
    }

    const postData = await lateApiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(postBody),
    });

    // Store post in our database
    await createPost({
      jobId: jobId || null,
      accountId: accountId,
      caption: caption || '',
      videoUrl: finalVideoUrl,
      platform: 'tiktok',
      status: publishNow ? 'published' : 'scheduled',
      scheduledFor: scheduledFor || null,
    });

    const message = (postBody.publishNow as boolean)
      ? 'Video published to TikTok!'
      : `Video scheduled for ${scheduledFor}`;
    return NextResponse.json({
      success: true,
      post: (postData as { post?: unknown }).post ?? postData,
      message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
