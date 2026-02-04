import path from 'path';
import fs from 'fs';
import os from 'os';
import { fal } from '@fal-ai/client';
import { getJob, updateJob, createMediaFile, updateBatchProgress } from './db';
import { uploadVideoFromPath, downloadToBuffer as gcsDownloadToBuffer } from './storage';
import {
  getContentType,
  getContentTypeFromExtension,
  getExtensionFromUrl,
  getVideoDuration,
  trimVideo,
  downloadFile,
} from './utils';
import { rapidApiLimiter } from './rateLimiter';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { uploadBuffer } = require('./upload-via-presigned.js');

async function getTikTokDownloadUrl(tiktokUrl: string, rapidApiKey: string): Promise<string | null> {
  // Acquire rate limit token (9 req/sec for RapidAPI)
  await rapidApiLimiter.acquire();

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const https = require('https');
    const req = https.request(options, (res: import('http').IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          resolve(null);
          return;
        }
        try {
          const json = JSON.parse(data) as Record<string, unknown>;
          resolve(extractPlayUrl(json));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

function extractPlayUrl(data: Record<string, unknown>): string | null {
  if (data.play) return data.play as string;
  if (data.data && typeof data.data === 'object') {
    const d = data.data as Record<string, unknown>;
    if (d.play) return d.play as string;
    if (d.video_url) return d.video_url as string;
  }
  return null;
}

async function prepareVideoForFal(
  videoUrl: string,
  maxSeconds: number,
  jobId: string
): Promise<string> {
  // Use OS temp directory instead of local folder
  const tempDir = path.join(os.tmpdir(), 'ai-ugc-temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const base = path.join(tempDir, `video-${jobId}-${Date.now()}`);
  const downloaded = `${base}-full.mp4`;
  const trimmed = `${base}-trimmed.mp4`;

  try {
    await downloadFile(videoUrl, downloaded);
    const duration = getVideoDuration(downloaded);
    const toUpload = duration > maxSeconds ? trimmed : downloaded;
    if (duration > maxSeconds) {
      trimVideo(downloaded, trimmed, maxSeconds);
    }
    const buffer = fs.readFileSync(toUpload);
    return await uploadBuffer(buffer, 'video/mp4', 'video.mp4');
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(downloaded); } catch {}
    try { fs.unlinkSync(trimmed); } catch {}
  }
}

/**
 * Get image buffer and suggested extension from various sources.
 * Same approach as batch-motion-control: we need a buffer to upload via presigned URL.
 */
async function getImageBufferAndExt(
  imageUrl: string,
  jobId: string
): Promise<{ buffer: Buffer; ext: string }> {
  // 1) Local file path (e.g. uploads/xxx.png or absolute path)
  if (!imageUrl.startsWith('http')) {
    const cwd = process.cwd();
    const possiblePaths = [
      imageUrl,
      path.join(cwd, imageUrl),
      path.join(cwd, 'uploads', path.basename(imageUrl)),
    ];
    for (const filePath of possiblePaths) {
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const buffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase() || '.png';
          return { buffer, ext };
        }
      } catch {
        // skip
      }
    }
    throw new Error(`Image not found: ${imageUrl}. Use a full URL or a path under ${cwd}`);
  }

  // 2) Our GCS URL – fetch via GCS client (no public download)
  if (imageUrl.includes('storage.googleapis.com')) {
    try {
      const buffer = await gcsDownloadToBuffer(imageUrl);
      const ext = getExtensionFromUrl(imageUrl);
      return { buffer: Buffer.from(buffer), ext };
    } catch {
      // Fall through to HTTP download
    }
  }

  // 3) Any http(s) URL – download to temp then read (same as batch-motion-control flow)
  const tempDir = path.join(os.tmpdir(), 'ai-ugc-temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const ext = getExtensionFromUrl(imageUrl);
  const tempPath = path.join(tempDir, `image-${jobId}-${Date.now()}${ext}`);
  try {
    await downloadFile(imageUrl, tempPath);
    const buffer = fs.readFileSync(tempPath);
    return { buffer, ext };
  } finally {
    try {
      fs.unlinkSync(tempPath);
    } catch {}
  }
}

/**
 * Upload image so FAL can use it. Returns a URL (presigned/signed) like batch-motion-control.
 * Always re-uploads to our presigned bucket so FAL gets a single, reliable link.
 */
async function uploadImageToFal(imageUrl: string, jobId: string): Promise<string> {
  if (imageUrl.startsWith('https://fal.media') || imageUrl.startsWith('https://v3.fal.media')) {
    return imageUrl;
  }

  const { buffer, ext } = await getImageBufferAndExt(imageUrl, jobId);
  const contentType = getContentTypeFromExtension(ext);
  const fileName = `model-image-${jobId}-${Date.now()}${ext}`;
  return await uploadBuffer(buffer, contentType, fileName);
}

export async function processJob(
  jobId: string,
  prompt: string,
  falKey: string,
  rapidApiKey: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  try {
    await updateJob(jobId, { status: 'processing', step: 'Fetching TikTok video...' });

    const downloadUrl = await getTikTokDownloadUrl(job.tiktokUrl, rapidApiKey);
    if (!downloadUrl) {
      throw new Error('Failed to get TikTok download URL. The video may be private or unavailable.');
    }

    await updateJob(jobId, { step: 'Preparing video...' });
    const falVideoUrl = await prepareVideoForFal(downloadUrl, job.maxSeconds, jobId);

    await updateJob(jobId, { step: 'Uploading model image...' });
    const falImageUrl = await uploadImageToFal(job.imageUrl, jobId);

    await updateJob(jobId, { step: 'Generating video with AI...' });

    fal.config({ credentials: falKey });
    const result = await fal.subscribe(
      'fal-ai/kling-video/v2.6/standard/motion-control',
      {
        input: {
          image_url: falImageUrl,
          video_url: falVideoUrl,
          character_orientation: 'video',
          keep_original_sound: true,
          prompt: job.customPrompt || prompt,
        },
        logs: true,
        onQueueUpdate: async (update: { status?: string; queue_position?: number }) => {
          if (update.status === 'IN_QUEUE') {
            await updateJob(jobId, { step: `In queue (position: ${update.queue_position ?? '...'})` });
          } else if (update.status === 'IN_PROGRESS') {
            await updateJob(jobId, { step: 'AI is generating your video...' });
          }
        },
      }
    );

    const videoData = (result.data as { video?: { url?: string } })?.video ?? (result as { video?: { url?: string } }).video;
    if (!videoData?.url) {
      throw new Error('No video URL in API response');
    }

    await updateJob(jobId, { step: 'Downloading and uploading result...' });

    // Download to temp, then upload to GCS
    const tempDir = path.join(os.tmpdir(), 'ai-ugc-temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempOutputPath = path.join(tempDir, `result-${jobId}.mp4`);

    try {
      await downloadFile(videoData.url, tempOutputPath);

      // Upload to GCS
      const { filename, url } = await uploadVideoFromPath(tempOutputPath, `result-${jobId}.mp4`);

      // Store in database
      await createMediaFile({
        filename,
        originalName: `result-${jobId}.mp4`,
        fileType: 'video',
        gcsUrl: url,
        fileSize: fs.statSync(tempOutputPath).size,
        mimeType: 'video/mp4',
        jobId,
      });

      await updateJob(jobId, {
        status: 'completed',
        step: 'Done!',
        outputUrl: url,
        completedAt: new Date().toISOString(),
      });
    } finally {
      try { fs.unlinkSync(tempOutputPath); } catch {}
    }
    // Update batch progress if this job is part of a batch
    const completedJob = await getJob(jobId);
    if (completedJob?.batchId) {
      await updateBatchProgress(completedJob.batchId);
    }
  } catch (error) {
    await updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      step: 'Failed',
    });

    // Update batch progress on failure too
    const failedJob = await getJob(jobId);
    if (failedJob?.batchId) {
      await updateBatchProgress(failedJob.batchId);
    }
  }
}

/**
 * Process a job with a specific image URL (used by batch processor).
 * This allows overriding the job's stored imageUrl with a different one.
 */
export async function processJobWithImage(
  jobId: string,
  imageUrl: string,
  prompt: string,
  falKey: string,
  rapidApiKey: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  try {
    await updateJob(jobId, { status: 'processing', step: 'Fetching TikTok video...' });

    const downloadUrl = await getTikTokDownloadUrl(job.tiktokUrl, rapidApiKey);
    if (!downloadUrl) {
      throw new Error('Failed to get TikTok download URL. The video may be private or unavailable.');
    }

    await updateJob(jobId, { step: 'Preparing video...' });
    const falVideoUrl = await prepareVideoForFal(downloadUrl, job.maxSeconds, jobId);

    await updateJob(jobId, { step: 'Uploading model image...' });
    // Use the provided imageUrl instead of job.imageUrl
    const falImageUrl = await uploadImageToFal(imageUrl, jobId);

    await updateJob(jobId, { step: 'Generating video with AI...' });

    fal.config({ credentials: falKey });
    const result = await fal.subscribe(
      'fal-ai/kling-video/v2.6/standard/motion-control',
      {
        input: {
          image_url: falImageUrl,
          video_url: falVideoUrl,
          character_orientation: 'video',
          keep_original_sound: true,
          prompt: job.customPrompt || prompt,
        },
        logs: true,
        onQueueUpdate: async (update: { status?: string; queue_position?: number }) => {
          if (update.status === 'IN_QUEUE') {
            await updateJob(jobId, { step: `In queue (position: ${update.queue_position ?? '...'})` });
          } else if (update.status === 'IN_PROGRESS') {
            await updateJob(jobId, { step: 'AI is generating your video...' });
          }
        },
      }
    );

    const videoData = (result.data as { video?: { url?: string } })?.video ?? (result as { video?: { url?: string } }).video;
    if (!videoData?.url) {
      throw new Error('No video URL in API response');
    }

    await updateJob(jobId, { step: 'Downloading and uploading result...' });

    const tempDir = path.join(os.tmpdir(), 'ai-ugc-temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempOutputPath = path.join(tempDir, `result-${jobId}.mp4`);

    try {
      await downloadFile(videoData.url, tempOutputPath);

      const { filename, url } = await uploadVideoFromPath(tempOutputPath, `result-${jobId}.mp4`);

      await createMediaFile({
        filename,
        originalName: `result-${jobId}.mp4`,
        fileType: 'video',
        gcsUrl: url,
        fileSize: fs.statSync(tempOutputPath).size,
        mimeType: 'video/mp4',
        jobId,
      });

      await updateJob(jobId, {
        status: 'completed',
        step: 'Done!',
        outputUrl: url,
        completedAt: new Date().toISOString(),
      });

      // Update batch progress
      const completedJob = await getJob(jobId);
      if (completedJob?.batchId) {
        await updateBatchProgress(completedJob.batchId);
      }
    } finally {
      try { fs.unlinkSync(tempOutputPath); } catch {}
    }
  } catch (error) {
    await updateJob(jobId, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      step: 'Failed',
    });

    const failedJob = await getJob(jobId);
    if (failedJob?.batchId) {
      await updateBatchProgress(failedJob.batchId);
    }
  }
}
