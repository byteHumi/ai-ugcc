import { NextRequest, NextResponse } from 'next/server';
import { getCachedSignedUrl } from '@/lib/signedUrlCache';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!url.includes('storage.googleapis.com')) {
      return NextResponse.json({ signedUrl: url });
    }

    const signedUrl = await getCachedSignedUrl(url);
    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error('Sign music URL error:', err);
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 });
  }
}
