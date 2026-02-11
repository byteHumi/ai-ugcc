import { NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/db';
import { getCachedSignedUrl } from '@/lib/signedUrlCache';

export const dynamic = 'force-dynamic';

type Job = {
  id: string;
  status?: string;
  outputUrl?: string;
  [key: string]: unknown;
};

export async function GET() {
  try {
    const jobs = await getAllJobs() as Job[];

    // Only sign completed jobs. Cached — subsequent polls are nearly instant.
    const jobsWithSignedUrls = await Promise.all(
      jobs.map(async (job) => {
        if (
          job.status === 'completed' &&
          job.outputUrl &&
          job.outputUrl.includes('storage.googleapis.com')
        ) {
          try {
            const signedUrl = await getCachedSignedUrl(job.outputUrl);
            return { ...job, signedUrl, outputUrl: job.outputUrl };
          } catch {
            return { ...job, signedUrl: job.outputUrl };
          }
        }
        return { ...job, signedUrl: job.outputUrl };
      })
    );

    return NextResponse.json(jobsWithSignedUrls);
  } catch (err) {
    console.error('Get jobs error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
