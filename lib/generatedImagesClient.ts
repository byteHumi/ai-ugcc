import { signUrls } from '@/lib/signedUrlClient';
import type { GeneratedImage } from '@/types';

export async function ensureSignedGeneratedImages(images: GeneratedImage[]): Promise<GeneratedImage[]> {
  const missing = images
    .filter((img) => !img.signedUrl && img.gcsUrl?.includes('storage.googleapis.com'))
    .map((img) => img.gcsUrl);

  if (missing.length === 0) return images;

  try {
    const signed = await signUrls(missing);
    return images.map((img) => ({
      ...img,
      signedUrl: img.signedUrl || signed.get(img.gcsUrl) || img.signedUrl,
    }));
  } catch {
    return images;
  }
}

