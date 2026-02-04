import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_MIME[ext] || 'application/octet-stream';
}

/** Get content type from a file extension (e.g. from URL path) */
export function getContentTypeFromExtension(ext: string): string {
  const normalized = ext.toLowerCase().startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return IMAGE_MIME[normalized] || 'application/octet-stream';
}

/** Get file extension from URL (pathname part only, so path.extname works) */
export function getExtensionFromUrl(url: string): string {
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url;
    const ext = path.extname(pathname).toLowerCase();
    return ext && /\.(png|jpg|jpeg|webp)$/i.test(ext) ? ext : '.png';
  } catch {
    return '.png';
  }
}

export function getVideoDuration(videoPath: string): number {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: 'utf8' }
    );
    return parseFloat(out.trim()) || 0;
  } catch {
    return 0;
  }
}

export function trimVideo(inputPath: string, outputPath: string, maxSeconds: number): void {
  execSync(`ffmpeg -y -i "${inputPath}" -t ${maxSeconds} -c copy "${outputPath}"`, { stdio: 'pipe' });
}

export function extractPlayUrl(json: Record<string, unknown> | null): string | null {
  if (!json || typeof json !== 'object') return null;
  const play =
    (json.play as string) ??
    (json.data as Record<string, unknown>)?.play ??
    (json.result as Record<string, unknown>)?.play;
  if (play && typeof play === 'string') return play;
  const watermark =
    (json.play_watermark as string) ??
    (json.data as Record<string, unknown>)?.play_watermark ??
    (json.result as Record<string, unknown>)?.play_watermark;
  if (watermark && typeof watermark === 'string') return watermark;
  return null;
}

export function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlink(outputPath, () => {});
          const loc = response.headers.location;
          if (loc) downloadFile(loc, outputPath).then(resolve).catch(reject);
          else reject(new Error('Redirect without location'));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
  });
}
