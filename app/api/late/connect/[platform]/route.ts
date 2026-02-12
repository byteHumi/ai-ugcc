import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CONNECT_TIMEOUT = 30000;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);

    try {
      const connectRes = await fetch(
        `${config.LATE_API_URL}/connect/${platform}?profileId=${profileId}`,
        {
          headers: { Authorization: `Bearer ${config.LATE_API_KEY}` },
          signal: controller.signal,
          cache: 'no-store',
        }
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

        console.error('Late API connect: no URL in response', JSON.stringify(data));
        return NextResponse.json({ error: 'No connect URL returned from API' }, { status: 500 });
      }

      const errorText = await connectRes.text();
      console.error('Late API connect error:', connectRes.status, errorText);
      return NextResponse.json({ error: `Connect failed (${connectRes.status}): ${errorText}` }, { status: connectRes.status });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Late API connect timeout');
      return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
    }
    console.error('Late API connect error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
