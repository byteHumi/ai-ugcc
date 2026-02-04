import { config } from './config';
import { processJobWithImage } from './processJob';
import {
  getBatch,
  getJobsByBatchId,
  getModelImages,
  getImagesByIds,
  updateBatch,
  updateBatchProgress,
} from './db';

/**
 * Process a batch of video generation jobs.
 * Images are cycled through based on the batch's image selection mode.
 * Rate limiting is handled within processJobWithImage.
 */
export async function processBatch(batchId: string): Promise<void> {
  const batch = await getBatch(batchId);
  if (!batch) {
    console.error(`Batch ${batchId} not found`);
    return;
  }

  const jobs = await getJobsByBatchId(batchId);
  if (jobs.length === 0) {
    console.log(`No jobs in batch ${batchId}`);
    await updateBatch(batchId, { status: 'completed' });
    return;
  }

  // Update batch status to processing
  await updateBatch(batchId, { status: 'processing' });

  // Get images based on selection mode
  let images: { id: string; gcsUrl: string }[] = [];

  if (batch.imageSelectionMode === 'model' && batch.modelId) {
    images = await getModelImages(batch.modelId);
  } else if (batch.imageSelectionMode === 'specific' && batch.selectedImageIds?.length) {
    images = await getImagesByIds(batch.selectedImageIds);
  }

  if (images.length === 0) {
    console.error(`No images available for batch ${batchId}`);
    await updateBatch(batchId, { status: 'failed' });
    return;
  }

  console.log(`Processing batch ${batchId}: ${jobs.length} jobs with ${images.length} images`);

  // Validate API keys
  if (!config.FAL_KEY || !config.RAPIDAPI_KEY) {
    console.error(`Batch ${batchId}: Missing API keys`);
    await updateBatch(batchId, { status: 'failed' });
    return;
  }

  const falKey = config.FAL_KEY;
  const rapidApiKey = config.RAPIDAPI_KEY;

  // Shuffle images for random distribution
  const shuffledImages = [...images].sort(() => Math.random() - 0.5);

  // Process all jobs in parallel
  // Rate limiting is handled within processJobWithImage for RapidAPI calls
  const promises = jobs.map((job: { id: string }, index: number) => {
    // Cycle through images
    const imageIndex = index % shuffledImages.length;
    const imageUrl = shuffledImages[imageIndex].gcsUrl;

    return processJobWithImage(
      job.id,
      imageUrl,
      config.prompt,
      falKey,
      rapidApiKey
    )
      .then(() => {
        // Update batch progress after each job completes
        return updateBatchProgress(batchId);
      })
      .catch((err) => {
        console.error(`Job ${job.id} in batch ${batchId} failed:`, err);
        return updateBatchProgress(batchId);
      });
  });

  // Wait for all jobs to complete
  await Promise.allSettled(promises);

  // Final progress update
  await updateBatchProgress(batchId);

  console.log(`Batch ${batchId} processing complete`);
}

/**
 * Process batch in background (fire and forget).
 * Returns immediately after starting.
 */
export function processBatchInBackground(batchId: string): void {
  processBatch(batchId).catch((err) => {
    console.error(`Background batch processing error for ${batchId}:`, err);
  });
}
