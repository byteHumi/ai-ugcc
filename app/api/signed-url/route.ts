import { NextRequest, NextResponse } from 'next/server';
import { getSignedUrlFromPublicUrl } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    // Validate it's a GCS URL
    if (!url.includes('storage.googleapis.com')) {
      return NextResponse.json({ error: 'Invalid GCS URL' }, { status: 400 });
    }

    const signedUrl = await getSignedUrlFromPublicUrl(url);

    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error('Get signed URL error:', err);
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
}
