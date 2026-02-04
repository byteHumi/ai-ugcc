import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { processJob } from '@/lib/processJob';
import { createJob } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    tiktokUrl,
    imageUrl,
    imageName,
    image_url: imageUrlSnake,
    customPrompt,
    maxSeconds,
  } = body as {
    tiktokUrl?: string;
    imageUrl?: string;
    imageName?: string;
    image_url?: string;
    customPrompt?: string;
    maxSeconds?: number;
  };

  if (!tiktokUrl) {
    return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
  }

  // Support imageUrl, imageName, and image_url (same as batch-motion-control link flow)
  const finalImageUrl = imageUrl || imageName || imageUrlSnake;
  if (!finalImageUrl) {
    return NextResponse.json({ error: 'Model image URL is required' }, { status: 400 });
  }

  if (!config.FAL_KEY) {
    return NextResponse.json({ error: 'FAL API key not configured' }, { status: 500 });
  }
  if (!config.RAPIDAPI_KEY) {
    return NextResponse.json({ error: 'RapidAPI key not configured' }, { status: 500 });
  }

  try {
    // Create job in database
    const job = await createJob({
      tiktokUrl,
      imageUrl: finalImageUrl,
      customPrompt,
      maxSeconds: typeof maxSeconds === 'number' ? maxSeconds : config.defaultMaxSeconds,
      batchId: null,
    });

    if (!job) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Start processing in background
    processJob(job.id, config.prompt, config.FAL_KEY, config.RAPIDAPI_KEY).catch((err) => {
      console.error('processJob error:', err);
    });

    return NextResponse.json({ jobId: job.id, job });
  } catch (err) {
    console.error('Create job error:', err);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
