import { NextResponse } from 'next/server';
import { fal } from '@fal-ai/client';
import { config } from '@/lib/config';
import { uploadImage, getSignedUrlFromPublicUrl } from '@/lib/storage.js';

export const maxDuration = 120;

// Prompt A: Strict face-swap — model image (1) is the identity, scene frame (2) is background/pose only.
const PROMPT_A =
  'FACE SWAP — Image 1 is the ONLY identity to use. Image 2 is ONLY a scene/pose reference. ' +
  'Take the EXACT person from image 1 — their precise face, gender, age, ethnicity, skin tone, hair color, hair style, and every facial feature — and place them into the scene from image 2. ' +
  'You MUST preserve the gender and full facial identity from image 1. Do NOT invent a new face. Do NOT use any face from image 2. ' +
  'The output must show the same recognizable person from image 1, in the pose and environment of image 2. Photorealistic, consistent lighting.';

// Prompt B: Same intent, alternative wording for diversity.
const PROMPT_B =
  'This is a face replacement task. Image 1 = source person (the face/identity to keep). Image 2 = target scene (the background, body pose, and camera angle to use). ' +
  'Generate a photorealistic photo of the EXACT same person from image 1 standing in the setting of image 2. ' +
  'CRITICAL: The person\'s face, gender, age, skin color, hair, and identity MUST match image 1 exactly. Do NOT generate a different person. Do NOT change their gender or features. ' +
  'Only change the environment, clothing, and body position to match image 2. The result should look like a real photograph of the image 1 person in the image 2 location.';

// Detect actual image content type from buffer magic bytes
function detectImageType(buf: Buffer): { contentType: string; ext: string } {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    return { contentType: 'image/png', ext: 'png' };
  }
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return { contentType: 'image/jpeg', ext: 'jpg' };
}

export async function POST(req: Request) {
  try {
    const { modelImageUrl, frameImageUrl } = await req.json();

    if (!modelImageUrl || !frameImageUrl) {
      return NextResponse.json(
        { error: 'Both modelImageUrl and frameImageUrl are required' },
        { status: 400 },
      );
    }

    if (!config.FAL_KEY) {
      return NextResponse.json(
        { error: 'FAL API key not configured' },
        { status: 500 },
      );
    }

    fal.config({ credentials: config.FAL_KEY });

    // Sign GCS URLs so we can fetch them (raw GCS public URLs return 403)
    const isGcsUrl = (url: string) =>
      url.includes('storage.googleapis.com') || url.includes('storage.cloud.google.com') || url.startsWith('gs://');

    // If a URL is already signed (has query params), strip them to get the base GCS URL for re-signing
    const stripSignedParams = (url: string) => {
      if (url.startsWith('gs://')) return url;
      try {
        const u = new URL(url);
        if (u.searchParams.has('X-Goog-Signature') || u.searchParams.has('X-Goog-Date')) {
          return `${u.origin}${u.pathname}`;
        }
      } catch { /* not a valid URL, return as-is */ }
      return url;
    };

    const signUrl = async (url: string) => {
      if (!isGcsUrl(url)) return url;
      const baseUrl = stripSignedParams(url);
      return getSignedUrlFromPublicUrl(baseUrl);
    };

    console.log('First frame request URLs:', { modelImageUrl, frameImageUrl });

    const [fetchableFrameUrl, fetchableModelUrl] = await Promise.all([
      signUrl(frameImageUrl),
      signUrl(modelImageUrl),
    ]);

    // Upload both images to FAL-accessible presigned URLs
    const { uploadBuffer } = require('@/lib/upload-via-presigned.cjs');

    const [frameBuffer, modelBuffer] = await Promise.all([
      fetch(fetchableFrameUrl).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch frame image: ${r.status}`);
        return r.arrayBuffer();
      }),
      fetch(fetchableModelUrl).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch model image: ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);

    const frameBuf = Buffer.from(frameBuffer);
    const modelBuf = Buffer.from(modelBuffer);
    const frameType = detectImageType(frameBuf);
    const modelType = detectImageType(modelBuf);

    const [falFrameUrl, falModelUrl] = await Promise.all([
      uploadBuffer(frameBuf, frameType.contentType, `first-frame-scene-${Date.now()}.${frameType.ext}`),
      uploadBuffer(modelBuf, modelType.contentType, `first-frame-face-${Date.now()}.${modelType.ext}`),
    ]);

    // Make 2 parallel calls with slightly different prompts
    // image_urls: [model (the person/face), frame (the scene/background/pose)]
    const imageUrls = [falModelUrl, falFrameUrl];

    const [resultA, resultB] = await Promise.all([
      fal.subscribe('fal-ai/nano-banana-pro/edit', {
        input: {
          image_urls: imageUrls,
          prompt: PROMPT_A,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.map((log) => log.message).forEach(console.log);
          }
        },
      }),
      fal.subscribe('fal-ai/nano-banana-pro/edit', {
        input: {
          image_urls: imageUrls,
          prompt: PROMPT_B,
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs?.map((log) => log.message).forEach(console.log);
          }
        },
      }),
    ]);

    // Extract image URLs from results
    const falImageUrlA = resultA.data?.images?.[0]?.url;
    const falImageUrlB = resultB.data?.images?.[0]?.url;

    if (!falImageUrlA || !falImageUrlB) {
      throw new Error('No image URL returned from Nano Banana Pro');
    }

    // Download generated images and upload to GCS
    const [bufferA, bufferB] = await Promise.all([
      fetch(falImageUrlA).then((r) => {
        if (!r.ok) throw new Error(`Failed to download generated image A: ${r.status}`);
        return r.arrayBuffer();
      }),
      fetch(falImageUrlB).then((r) => {
        if (!r.ok) throw new Error(`Failed to download generated image B: ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);

    const [uploadedA, uploadedB] = await Promise.all([
      uploadImage(Buffer.from(bufferA), `first-frame-a-${Date.now()}.jpg`),
      uploadImage(Buffer.from(bufferB), `first-frame-b-${Date.now()}.jpg`),
    ]);

    const [signedA, signedB] = await Promise.all([
      getSignedUrlFromPublicUrl(uploadedA.url),
      getSignedUrlFromPublicUrl(uploadedB.url),
    ]);

    return NextResponse.json({
      images: [
        { url: signedA, gcsUrl: uploadedA.url },
        { url: signedB, gcsUrl: uploadedB.url },
      ],
    });
  } catch (error: unknown) {
    console.error('Generate first frame error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
