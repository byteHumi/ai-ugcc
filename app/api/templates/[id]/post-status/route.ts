import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, updateTemplateJobPostStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;

    const body = await request.json();
    const { postStatus } = body as { postStatus: string };

    if (!postStatus || !['posted', 'rejected'].includes(postStatus)) {
      return NextResponse.json(
        { error: 'postStatus must be "posted" or "rejected"' },
        { status: 400 }
      );
    }

    const updatedJob = await updateTemplateJobPostStatus(id, postStatus);

    if (!updatedJob) {
      return NextResponse.json(
        { error: 'Template job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedJob);
  } catch (err) {
    console.error('Update template job post status error:', err);
    return NextResponse.json(
      { error: 'Failed to update post status' },
      { status: 500 }
    );
  }
}
