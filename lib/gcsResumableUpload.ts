type UploadProgressHandler = (uploadedBytes: number, totalBytes: number) => void;

type SessionResponse = {
  success: boolean;
  sessionUrl: string;
  objectPath: string;
  gcsUrl: string;
  error?: string;
};

type CompleteResponse = {
  success: boolean;
  filename: string;
  gcsUrl: string;
  url: string;
  path?: string;
  size?: number;
  mimeType?: string;
  error?: string;
};

type UploadOptions = {
  chunkSizeBytes?: number;
  maxRetriesPerChunk?: number;
  signal?: AbortSignal;
  onProgress?: UploadProgressHandler;
};

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB
const DEFAULT_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUploadedBytes(rangeHeader: string | null): number {
  if (!rangeHeader) return 0;
  const match = rangeHeader.match(/bytes=0-(\d+)/i);
  if (!match) return 0;
  const lastByte = Number(match[1]);
  return Number.isFinite(lastByte) ? lastByte + 1 : 0;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function createSession(file: File): Promise<SessionResponse> {
  const res = await fetch('/api/upload-video/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'video/mp4',
      fileSize: file.size,
    }),
  });

  const data = (await res.json()) as SessionResponse;
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create upload session');
  }
  return data;
}

async function completeUpload(objectPath: string, originalName: string): Promise<CompleteResponse> {
  const res = await fetch('/api/upload-video/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objectPath, originalName }),
  });

  const data = (await res.json()) as CompleteResponse;
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to finalize upload');
  }
  return data;
}

async function uploadChunk(
  sessionUrl: string,
  chunk: Blob,
  contentType: string,
  startByte: number,
  endByteExclusive: number,
  totalBytes: number,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(sessionUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Range': `bytes ${startByte}-${endByteExclusive - 1}/${totalBytes}`,
    },
    body: chunk,
    signal,
  });
}

export async function uploadVideoDirectToGcs(
  file: File,
  options: UploadOptions = {}
): Promise<CompleteResponse> {
  const {
    chunkSizeBytes = DEFAULT_CHUNK_SIZE,
    maxRetriesPerChunk = DEFAULT_RETRIES,
    signal,
    onProgress,
  } = options;

  const { sessionUrl, objectPath } = await createSession(file);
  const totalBytes = file.size;
  const contentType = file.type || 'video/mp4';
  let uploadedBytes = 0;

  if (onProgress) onProgress(0, totalBytes);

  while (uploadedBytes < totalBytes) {
    const nextEnd = Math.min(uploadedBytes + chunkSizeBytes, totalBytes);
    const chunk = file.slice(uploadedBytes, nextEnd);

    let attempt = 0;
    while (true) {
      try {
        const res = await uploadChunk(
          sessionUrl,
          chunk,
          contentType,
          uploadedBytes,
          nextEnd,
          totalBytes,
          signal
        );

        if (res.status === 308) {
          const resumedBytes = parseUploadedBytes(res.headers.get('Range'));
          uploadedBytes = resumedBytes > uploadedBytes ? resumedBytes : nextEnd;
          if (onProgress) onProgress(uploadedBytes, totalBytes);
          break;
        }

        if (res.ok) {
          uploadedBytes = totalBytes;
          if (onProgress) onProgress(uploadedBytes, totalBytes);
          break;
        }

        const body = await res.text();
        if (isRetryableStatus(res.status) && attempt < maxRetriesPerChunk) {
          attempt += 1;
          await sleep(400 * 2 ** attempt);
          continue;
        }

        throw new Error(`Upload failed (${res.status}): ${body || 'Unknown error'}`);
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (isAbort) throw err;

        if (attempt < maxRetriesPerChunk) {
          attempt += 1;
          await sleep(400 * 2 ** attempt);
          continue;
        }

        if (err instanceof Error && err.message.toLowerCase().includes('failed to fetch')) {
          throw new Error('Direct upload failed. Check Google Cloud Storage CORS settings and network connectivity.');
        }
        throw err instanceof Error ? err : new Error('Upload failed');
      }
    }
  }

  return completeUpload(objectPath, file.name);
}
