import { sql } from './db-client';
import { transformModelImage } from './db-transforms';

export async function createModelImage({ modelId, gcsUrl, filename, originalName, fileSize, isPrimary }) {
  if (isPrimary) {
    await sql`UPDATE model_images SET is_primary = false WHERE model_id = ${modelId}`;
  }
  const result = await sql`
    INSERT INTO model_images (model_id, gcs_url, filename, original_name, file_size, is_primary)
    VALUES (${modelId}, ${gcsUrl}, ${filename}, ${originalName || null}, ${fileSize || null}, ${isPrimary || false})
    RETURNING *
  `;

  if (isPrimary) {
    await sql`UPDATE models SET avatar_url = ${gcsUrl} WHERE id = ${modelId}`;
  }

  return transformModelImage(result[0]);
}

export async function getModelImage(id) {
  const result = await sql`SELECT * FROM model_images WHERE id = ${id}`;
  return result[0] ? transformModelImage(result[0]) : null;
}

export async function getModelImages(modelId) {
  const result = await sql`SELECT * FROM model_images WHERE model_id = ${modelId} ORDER BY is_primary DESC, created_at ASC`;
  return result.map(transformModelImage);
}

export async function getModelImageCountsForModels(modelIds) {
  if (!modelIds || modelIds.length === 0) return [];
  const result = await sql`
    SELECT model_id, COUNT(*)::int AS count
    FROM model_images
    WHERE model_id = ANY(${modelIds})
    GROUP BY model_id
  `;

  return result.map((row) => ({
    modelId: row.model_id,
    count: Number(row.count) || 0,
  }));
}

export async function getImagesByIds(imageIds) {
  if (!imageIds || imageIds.length === 0) return [];
  const result = await sql`SELECT * FROM model_images WHERE id = ANY(${imageIds})`;
  return result.map(transformModelImage);
}

export async function setModelImagePrimary(modelId, imageId) {
  await sql`UPDATE model_images SET is_primary = false WHERE model_id = ${modelId}`;
  const result = await sql`
    UPDATE model_images SET is_primary = true WHERE id = ${imageId} AND model_id = ${modelId}
    RETURNING *
  `;
  if (result[0]) {
    await sql`UPDATE models SET avatar_url = ${result[0].gcs_url} WHERE id = ${modelId}`;
  }
  return result[0] ? transformModelImage(result[0]) : null;
}

export async function deleteModelImage(id) {
  const image = await getModelImage(id);
  if (image?.isPrimary) {
    const otherImages = await sql`SELECT * FROM model_images WHERE model_id = ${image.modelId} AND id != ${id} LIMIT 1`;
    if (otherImages[0]) {
      await setModelImagePrimary(image.modelId, otherImages[0].id);
    } else {
      await sql`UPDATE models SET avatar_url = NULL WHERE id = ${image.modelId}`;
    }
  }
  await sql`DELETE FROM model_images WHERE id = ${id}`;
}
