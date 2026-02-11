import { NextRequest, NextResponse } from 'next/server';
import { createTemplateJob, getAllTemplateJobs, initDatabase } from '@/lib/db';
import { getCachedSignedUrl } from '@/lib/signedUrlCache';
import { processTemplateJob } from '@/lib/processTemplateJob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initDatabase();
    const jobs = await getAllTemplateJobs();

    // Only sign completed jobs that have a GCS output URL.
    // Cached — subsequent polls are nearly instant.
    const jobsWithSignedUrls = await Promise.all(
      jobs.map(async (job: { status?: string; outputUrl?: string; [key: string]: unknown }) => {
        if (
          job.status === 'completed' &&
          job.outputUrl &&
          job.outputUrl.includes('storage.googleapis.com')
        ) {
          try {
            const signedUrl = await getCachedSignedUrl(job.outputUrl);
            return { ...job, signedUrl };
          } catch {
            return { ...job, signedUrl: job.outputUrl };
          }
        }
        return job;
      })
    );

    return NextResponse.json(jobsWithSignedUrls);
  } catch (err) {
    console.error('List template jobs error:', err);
    return NextResponse.json({ error: 'Failed to list template jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    const { name, pipeline, videoSource, tiktokUrl, videoUrl } = body;

    if (!name || !pipeline || !Array.isArray(pipeline) || pipeline.length === 0) {
      return NextResponse.json({ error: 'Name and pipeline steps are required' }, { status: 400 });
    }

    const enabledSteps = pipeline.filter((s: { enabled: boolean }) => s.enabled);
    if (enabledSteps.length === 0) {
      return NextResponse.json({ error: 'At least one pipeline step must be enabled' }, { status: 400 });
    }

    // Video source validation: need input video unless first step is subtle-animation (image-to-video)
    const firstStep = enabledSteps[0];
    const needsInputVideo = !(firstStep.type === 'video-generation'
      && (firstStep.config as { mode?: string }).mode === 'subtle-animation');
    if (needsInputVideo) {
      if (!tiktokUrl && !videoUrl) {
        return NextResponse.json({ error: 'A video source is required (TikTok URL or uploaded video)' }, { status: 400 });
      }
    }

    const job = await createTemplateJob({
      name,
      pipeline,
      videoSource: videoUrl ? 'upload' : 'tiktok',
      tiktokUrl: tiktokUrl || null,
      videoUrl: videoUrl || null,
    });

    if (!job) {
      return NextResponse.json({ error: 'Failed to create template job' }, { status: 500 });
    }

    // Fire and forget
    processTemplateJob(job.id).catch((err) => {
      console.error('processTemplateJob error:', err);
    });

    return NextResponse.json(job);
  } catch (err) {
    console.error('Create template job error:', err);
    return NextResponse.json({ error: 'Failed to create template job' }, { status: 500 });
  }
}
