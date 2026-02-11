import { NextResponse } from 'next/server';
import { getAllPipelineBatches, initDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initDatabase();
    const batches = await getAllPipelineBatches();
    return NextResponse.json(batches, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err) {
    console.error('List pipeline batches error:', err);
    return NextResponse.json({ error: 'Failed to list pipeline batches' }, { status: 500 });
  }
}
