import { sql } from './db-client';
import { transformMediaFile } from './db-transforms';

export async function createMediaFile({ filename, originalName, fileType, gcsUrl, fileSize, mimeType, jobId }) {
  const result = await sql`
    INSERT INTO media_files (filename, original_name, file_type, gcs_url, file_size, mime_type, job_id)
    VALUES (${filename}, ${originalName || null}, ${fileType}, ${gcsUrl}, ${fileSize || null}, ${mimeType || null}, ${jobId || null})
    RETURNING *
  `;
  return transformMediaFile(result[0]);
}

export async function getMediaFile(id) {
  const result = await sql`SELECT * FROM media_files WHERE id = ${id}`;
  return result[0] ? transformMediaFile(result[0]) : null;
}

export async function getMediaFileByFilename(filename) {
  const result = await sql`SELECT * FROM media_files WHERE filename = ${filename}`;
  return result[0] ? transformMediaFile(result[0]) : null;
}

export async function getAllMediaFiles(fileType) {
  if (fileType) {
    const result = await sql`SELECT * FROM media_files WHERE file_type = ${fileType} ORDER BY created_at DESC`;
    return result.map(transformMediaFile);
  }
  const result = await sql`SELECT * FROM media_files ORDER BY created_at DESC`;
  return result.map(transformMediaFile);
}

export async function deleteMediaFile(id) {
  await sql`DELETE FROM media_files WHERE id = ${id}`;
}
