import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { lateApiRequest } from '@/lib/lateApi';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!config.LATE_API_KEY) {
    return NextResponse.json({ error: 'LATE_API_KEY not configured' }, { status: 500 });
  }
  try {
    const { id } = await params;
    await lateApiRequest(`/accounts/${id}`, { method: 'DELETE' });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
