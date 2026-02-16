import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, getPostsByJobIds } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const { jobIds } = await request.json();
    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ posts: [] });
    }
    const posts = await getPostsByJobIds(jobIds);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Get posts by jobs error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
