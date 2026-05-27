import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseReady, getTemplateJobsForLibraryPicker } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseReady();
    const raw = request.nextUrl.searchParams.get('modelIds') || '';
    const modelIds = raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => UUID_RE.test(s));

    const jobs = await getTemplateJobsForLibraryPicker(modelIds.length > 0 ? modelIds : null);

    return NextResponse.json(jobs, {
      headers: { 'Cache-Control': 'private, max-age=2, stale-while-revalidate=15' },
    });
  } catch (err) {
    console.error('List library picker jobs error:', err);
    return NextResponse.json({ error: 'Failed to list library jobs' }, { status: 500 });
  }
}
