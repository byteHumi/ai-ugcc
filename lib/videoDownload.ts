import { rapidApiLimiter } from './rateLimiter';

function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com\/(p|reel|reels)\//i.test(url);
}

async function getTikTokDownloadUrlViaDownloadEndpoint(tiktokUrl: string, rapidApiKey: string): Promise<{ url: string | null; shouldRetry: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const https = require('https');

  return new Promise((resolve) => {
    const encodedUrl = encodeURIComponent(tiktokUrl);
    const options = {
      method: 'GET',
      hostname: 'tiktok-api23.p.rapidapi.com',
      path: `/api/download/video?url=${encodedUrl}`,
      headers: {
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    };

    const req = https.request(options, (res: import('http').IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 429) {
          console.warn(`[TikTok API] Rate limited (${res.statusCode}), will retry...`);
          resolve({ url: null, shouldRetry: true });
          return;
        }
        if (res.statusCode && res.statusCode >= 500) {
          console.warn(`[TikTok API] Server error (${res.statusCode}), will retry...`);
          resolve({ url: null, shouldRetry: true });
          return;
        }
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          console.error(`[TikTok API] HTTP ${res.statusCode}:`, data.slice(0, 300));
          resolve({ url: null, shouldRetry: false });
          return;
        }

        try {
          const json = JSON.parse(data) as Record<string, unknown>;
          if (json.error === 'Video not found') {
            resolve({ url: null, shouldRetry: true });
            return;
          }

          const playUrl = extractPlayUrl(json);
          if (playUrl) {
            resolve({ url: playUrl, shouldRetry: false });
          } else {
            resolve({ url: null, shouldRetry: false });
          }
        } catch {
          resolve({ url: null, shouldRetry: true });
        }
      });
    });

    req.on('error', () => resolve({ url: null, shouldRetry: true }));
    req.end();
  });
}

async function getTikTokDownloadUrl(tiktokUrl: string, rapidApiKey: string): Promise<string | null> {
  const normalizedUrl = tiktokUrl.trim();
  const maxRetries = 3;
  const baseDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await rapidApiLimiter.acquire();
    const result = await getTikTokDownloadUrlViaDownloadEndpoint(normalizedUrl, rapidApiKey);

    if (result.url) return result.url;
    if (!result.shouldRetry || attempt === maxRetries) return null;

    const delay = baseDelay * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}

function extractPlayUrl(data: Record<string, unknown>): string | null {
  if (typeof data.play === 'string' && data.play) return data.play;
  if (typeof data.hdplay === 'string' && data.hdplay) return data.hdplay;
  if (typeof data.wmplay === 'string' && data.wmplay) return data.wmplay;

  if (data.data && typeof data.data === 'object') {
    const d = data.data as Record<string, unknown>;
    if (typeof d.play === 'string' && d.play) return d.play;
    if (typeof d.hdplay === 'string' && d.hdplay) return d.hdplay;
    if (typeof d.wmplay === 'string' && d.wmplay) return d.wmplay;
    if (typeof d.video_url === 'string' && d.video_url) return d.video_url;
    if (typeof d.nwm_video_url === 'string' && d.nwm_video_url) return d.nwm_video_url;
    if (typeof d.wm_video_url === 'string' && d.wm_video_url) return d.wm_video_url;
  }

  if (data.result && typeof data.result === 'object') {
    const r = data.result as Record<string, unknown>;
    if (typeof r.play === 'string' && r.play) return r.play;
    if (typeof r.video_url === 'string' && r.video_url) return r.video_url;
  }

  if (typeof data.play_watermark === 'string' && data.play_watermark) return data.play_watermark;
  return null;
}

async function getInstagramDownloadUrlViaEndpoint(instagramUrl: string, rapidApiKey: string): Promise<{ url: string | null; shouldRetry: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const https = require('https');

  return new Promise((resolve) => {
    const encodedUrl = encodeURIComponent(instagramUrl);
    const options = {
      method: 'GET',
      hostname: 'instagram-looter2.p.rapidapi.com',
      path: `/post-dl?url=${encodedUrl}`,
      headers: {
        'x-rapidapi-host': 'instagram-looter2.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
    };

    const req = https.request(options, (res: import('http').IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 429) {
          resolve({ url: null, shouldRetry: true });
          return;
        }
        if (res.statusCode && res.statusCode >= 500) {
          resolve({ url: null, shouldRetry: true });
          return;
        }
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          resolve({ url: null, shouldRetry: false });
          return;
        }

        try {
          const json = JSON.parse(data) as Record<string, unknown>;
          const videoUrl = extractInstagramVideoUrl(json);
          if (videoUrl) {
            resolve({ url: videoUrl, shouldRetry: false });
          } else {
            resolve({ url: null, shouldRetry: false });
          }
        } catch {
          resolve({ url: null, shouldRetry: true });
        }
      });
    });

    req.on('error', () => resolve({ url: null, shouldRetry: true }));
    req.end();
  });
}

function extractInstagramVideoUrl(data: Record<string, unknown>): string | null {
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    const d = data.data as Record<string, unknown>;
    if (Array.isArray(d.medias) && d.medias.length > 0) {
      for (const media of d.medias) {
        if (typeof media === 'object' && media !== null) {
          const m = media as Record<string, unknown>;
          if (typeof m.link === 'string' && m.link) return m.link;
          if (typeof m.url === 'string' && m.url) return m.url;
        }
      }
    }
    if (typeof d.video_url === 'string' && d.video_url) return d.video_url;
    if (typeof d.url === 'string' && d.url) return d.url;
  }

  if (Array.isArray(data.data) && data.data.length > 0) {
    const first = data.data[0];
    if (typeof first === 'object' && first !== null) {
      const d = first as Record<string, unknown>;
      if (typeof d.url === 'string' && d.url) return d.url;
      if (typeof d.link === 'string' && d.link) return d.link;
      if (typeof d.video_url === 'string' && d.video_url) return d.video_url;
    }
  }

  if (typeof data.video_url === 'string' && data.video_url) return data.video_url;
  if (typeof data.url === 'string' && data.url) return data.url;
  return null;
}

async function getInstagramDownloadUrl(instagramUrl: string, rapidApiKey: string): Promise<string | null> {
  const normalizedUrl = instagramUrl.trim();
  const maxRetries = 3;
  const baseDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await rapidApiLimiter.acquire();
    const result = await getInstagramDownloadUrlViaEndpoint(normalizedUrl, rapidApiKey);

    if (result.url) return result.url;
    if (!result.shouldRetry || attempt === maxRetries) return null;

    const delay = baseDelay * Math.pow(2, attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return null;
}

export async function getVideoDownloadUrl(url: string, rapidApiKey: string): Promise<string> {
  if (isTikTokUrl(url)) {
    const result = await getTikTokDownloadUrl(url, rapidApiKey);
    if (!result) throw new Error('Failed to get TikTok video URL. The video may be private or unavailable.');
    return result;
  }

  if (isInstagramUrl(url)) {
    const result = await getInstagramDownloadUrl(url, rapidApiKey);
    if (!result) throw new Error('Failed to get Instagram video URL. The post may be private or unavailable.');
    return result;
  }

  throw new Error('Unsupported URL. Only TikTok and Instagram URLs are supported.');
}
