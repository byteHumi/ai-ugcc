import { getSignedUrlFromPublicUrl } from '@/lib/storage';

const TTL = 6 * 24 * 60 * 60 * 1000; // 6 days (URLs are valid for 7 days)
const cache = new Map<string, { url: string; ts: number }>();
const inflight = new Map<string, Promise<string>>();

/**
 * Get a signed URL with in-memory caching.
 * Avoids redundant GCS calls on every poll.
 */
export async function getCachedSignedUrl(gcsUrl: string): Promise<string> {
  const entry = cache.get(gcsUrl);
  if (entry && Date.now() - entry.ts < TTL) {
    return entry.url;
  }

  const pending = inflight.get(gcsUrl);
  if (pending) return pending;

  const request = getSignedUrlFromPublicUrl(gcsUrl)
    .then((signed) => {
      cache.set(gcsUrl, { url: signed, ts: Date.now() });
      return signed;
    })
    .finally(() => {
      inflight.delete(gcsUrl);
    });

  inflight.set(gcsUrl, request);
  return request;
}
