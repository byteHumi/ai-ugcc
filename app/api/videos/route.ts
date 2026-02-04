import { NextResponse } from 'next/server';
import { getAllMediaFiles } from '@/lib/db';
import { getSignedUrlFromPublicUrl } from '@/lib/storage';

type MediaFile = {
  filename: string;
  gcsUrl: string;
  fileSize: number | null;
  createdAt: string | null;
  jobId: string | null;
};

export async function GET() {
  try {
    const videos = await getAllMediaFiles('video') as (MediaFile | null)[];

    const formattedVideos = await Promise.all(
      videos
        .filter((v): v is MediaFile => v !== null)
        .map(async (v) => {
          let signedUrl = v.gcsUrl;
          try {
            signedUrl = await getSignedUrlFromPublicUrl(v.gcsUrl);
          } catch {
            // Keep original URL if signing fails
          }
          return {
            name: v.filename,
            path: v.gcsUrl,
            url: signedUrl,
            size: v.fileSize,
            created: v.createdAt,
            jobId: v.jobId,
          };
        })
    );

    return NextResponse.json({ videos: formattedVideos });
  } catch (err) {
    console.error('Get videos error:', err);
    return NextResponse.json({ videos: [] });
  }
}
