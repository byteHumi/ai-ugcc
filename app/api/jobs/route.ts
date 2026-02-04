import { NextResponse } from 'next/server';
import { getAllJobs } from '@/lib/db';

export async function GET() {
  try {
    const jobs = await getAllJobs();
    return NextResponse.json(jobs);
  } catch (err) {
    console.error('Get jobs error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
