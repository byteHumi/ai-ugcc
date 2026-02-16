import { Storage } from '@google-cloud/storage';
import path from 'path';
import crypto from 'crypto';

let storageOptions = {};
if (process.env.GCS_SERVICE_ACCOUNT_KEY) {
  try {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
    storageOptions = {
      projectId: credentials.project_id || process.env.GCS_PROJECT_ID,
      credentials,
    };
  } catch (error) {
    console.error('Failed to parse GCS_SERVICE_ACCOUNT_KEY:', error instanceof Error ? error.message : String(error));
  }
} else if (process.env.GCS_PROJECT_ID) {
  storageOptions = { projectId: process.env.GCS_PROJECT_ID };
}

export const storage = new Storage(storageOptions);

export const config = {
  bucketName: process.env.GCS_BUCKET_NAME || 'runable_staging_files',
  uploadExpiresInMinutes: 60,
  readExpiresInMinutes: 1440,
};

function generateUniqueFilename(originalFilename = 'file') {
  const ext = path.extname(originalFilename) || '';
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `uploads/${timestamp}-${random}${ext}`;
}

export async function getPresignedUploadUrl(filename, contentType = 'application/octet-stream') {
  if (!config.bucketName) throw new Error('GCS_BUCKET_NAME is not set');
  const bucket = storage.bucket(config.bucketName);
  const file = bucket.file(filename);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + config.uploadExpiresInMinutes * 60 * 1000,
    contentType,
  });
  return { url, filename };
}

export async function getSignedReadUrl(filename) {
  if (!config.bucketName) throw new Error('GCS_BUCKET_NAME is not set');
  const bucket = storage.bucket(config.bucketName);
  const file = bucket.file(filename);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + config.readExpiresInMinutes * 60 * 1000,
  });
  return url;
}

export async function putToPresignedUrl(presignedUrl, buffer, contentType = 'application/octet-stream') {
  const body = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload PUT failed ${response.status}: ${text}`);
  }
}

export async function uploadBuffer(buffer, contentType = 'application/octet-stream', suggestedFilename = 'file') {
  if (!config.bucketName) throw new Error('GCS_BUCKET_NAME is not set. Set it in .env');
  const filename = generateUniqueFilename(suggestedFilename);
  const { url: uploadUrl } = await getPresignedUploadUrl(filename, contentType);
  await putToPresignedUrl(uploadUrl, buffer, contentType);
  return getSignedReadUrl(filename);
}
