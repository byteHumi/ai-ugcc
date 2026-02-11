import { NextRequest, NextResponse } from 'next/server';
import { getPipelineBatch, deletePipelineBatch, getTemplateJobsByBatchId, initDatabase } from '@/lib/db';
import { getCachedSignedUrl } from '@/lib/signedUrlCache';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const batch = await getPipelineBatch(id);
    if (!batch) {
      return NextResponse.json({ error: 'Pipeline batch not found' }, { status: 404 });
    }

    // Get child template jobs
    const childJobs = await getTemplateJobsByBatchId(id);

    // Sign output URLs for completed child jobs
    const jobsWithSignedUrls = await Promise.all(
      childJobs.map(async (job: { status?: string; outputUrl?: string; stepResults?: { stepId: string; type: string; label: string; outputUrl: string; signedUrl?: string }[]; [key: string]: unknown }) => {
        const result = { ...job };

        if (
          job.status === 'completed' &&
          job.outputUrl &&
          job.outputUrl.includes('storage.googleapis.com')
        ) {
          try {
            const signedUrl = await Promise.race([
              getCachedSignedUrl(job.outputUrl),
              new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ]);
            result.signedUrl = signedUrl;
          } catch {
            result.signedUrl = job.outputUrl;
          }
        }

        if (Array.isArray(job.stepResults) && job.stepResults.length > 0) {
          result.stepResults = await Promise.all(
            job.stepResults.map(async (sr) => {
              if (sr.outputUrl?.includes('storage.googleapis.com')) {
                try {
                  const signed = await Promise.race([
                    getCachedSignedUrl(sr.outputUrl),
                    new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
                  ]);
                  return { ...sr, signedUrl: signed };
                } catch {
                  return { ...sr, signedUrl: sr.outputUrl };
                }
              }
              return sr;
            })
          );
        }

        return result;
      })
    );

    return NextResponse.json({ ...batch, jobs: jobsWithSignedUrls }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('Get pipeline batch error:', err);
    return NextResponse.json({ error: 'Failed to get pipeline batch' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    await deletePipelineBatch(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete pipeline batch error:', err);
    return NextResponse.json({ error: 'Failed to delete pipeline batch' }, { status: 500 });
  }
}
