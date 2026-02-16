import { sql } from './db-client';
import { transformBatch } from './db-transforms';

export async function createBatch({ name, modelId, imageSelectionMode, selectedImageIds, totalJobs }) {
  const result = await sql`
    INSERT INTO batches (name, model_id, image_selection_mode, selected_image_ids, total_jobs)
    VALUES (${name}, ${modelId || null}, ${imageSelectionMode || 'model'}, ${selectedImageIds || null}, ${totalJobs || 0})
    RETURNING *
  `;
  return transformBatch(result[0]);
}

export async function getBatch(id) {
  const result = await sql`SELECT * FROM batches WHERE id = ${id}`;
  return result[0] ? transformBatch(result[0]) : null;
}

export async function getAllBatches() {
  const result = await sql`SELECT * FROM batches ORDER BY created_at DESC`;
  return result.map(transformBatch);
}

export async function updateBatch(id, updates) {
  const { status, completedJobs, failedJobs, completedAt } = updates;
  const result = await sql`
    UPDATE batches SET
      status = COALESCE(${status || null}, status),
      completed_jobs = COALESCE(${completedJobs ?? null}, completed_jobs),
      failed_jobs = COALESCE(${failedJobs ?? null}, failed_jobs),
      completed_at = COALESCE(${completedAt || null}, completed_at)
    WHERE id = ${id}
    RETURNING *
  `;
  return result[0] ? transformBatch(result[0]) : null;
}

export async function deleteBatch(id) {
  await sql`DELETE FROM batches WHERE id = ${id}`;
}

export async function updateBatchProgress(batchId) {
  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) as total
    FROM jobs WHERE batch_id = ${batchId}
  `;

  const { completed, failed, total } = stats[0];
  const completedNum = parseInt(completed, 10) || 0;
  const failedNum = parseInt(failed, 10) || 0;
  const totalNum = parseInt(total, 10) || 0;

  let status = 'processing';
  let completedAt = null;

  if (completedNum + failedNum >= totalNum) {
    completedAt = new Date().toISOString();
    if (failedNum === 0) {
      status = 'completed';
    } else if (completedNum === 0) {
      status = 'failed';
    } else {
      status = 'partial';
    }
  }

  return updateBatch(batchId, {
    status,
    completedJobs: completedNum,
    failedJobs: failedNum,
    completedAt,
  });
}
