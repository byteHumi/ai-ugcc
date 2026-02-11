import { NextRequest, NextResponse } from 'next/server';
import { getTemplateJob, initDatabase } from '@/lib/db';
import { getSignedUrlFromPublicUrl } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const job = await getTemplateJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Template job not found' }, { status: 404 });
    }

    let signedUrl: string | undefined;
    if (job.outputUrl && job.outputUrl.includes('storage.googleapis.com')) {
      try {
        signedUrl = await getSignedUrlFromPublicUrl(job.outputUrl);
      } catch {
        signedUrl = job.outputUrl;
      }
    }

    // Sign step result URLs
    let stepResults = job.stepResults;
    if (Array.isArray(stepResults) && stepResults.length > 0) {
      stepResults = await Promise.all(
        stepResults.map(async (sr: { outputUrl?: string; [key: string]: unknown }) => {
          if (sr.outputUrl?.includes('storage.googleapis.com')) {
            try {
              const signed = await getSignedUrlFromPublicUrl(sr.outputUrl);
              return { ...sr, signedUrl: signed };
            } catch {
              return { ...sr, signedUrl: sr.outputUrl };
            }
          }
          return sr;
        })
      );
    }

    return NextResponse.json({ ...job, signedUrl, stepResults });
  } catch (err) {
    console.error('Get template job error:', err);
    return NextResponse.json({ error: 'Failed to get template job' }, { status: 500 });
  }
}
