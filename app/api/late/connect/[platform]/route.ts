import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  if (!config.LATE_API_KEY) {
    return NextResponse.json({ error: 'LATE_API_KEY not configured' }, { status: 500 });
  }
  try {
    const { platform } = await params;
    const url = new URL(_request.url);
    const profileId = url.searchParams.get('profileId');
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID required' }, { status: 400 });
    }
    const connectRes = await fetch(
      `${config.LATE_API_URL}/connect/${platform}?profileId=${profileId}`,
      { headers: { Authorization: `Bearer ${config.LATE_API_KEY}` } }
    );
    if (connectRes.ok) {
      const data = (await connectRes.json()) as {
        url?: string;
        connectUrl?: string;
        authUrl?: string;
        authorization_url?: string;
      };
      const connectUrl = data.url ?? data.connectUrl ?? data.authUrl ?? data.authorization_url;
      if (connectUrl) return NextResponse.json({ connectUrl });
    }
    return NextResponse.json({ error: 'Failed to get connect URL' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
