import type { ModelImage, VideoGenConfig as VGC } from '@/types';
import type { FirstFrameOption, ImageSource } from './types';
import type { MasterModel } from '@/components/templates/NodeConfigPanel';

export function resolveModelImageDisplay(params: {
  imageSource: ImageSource;
  config: VGC;
  modelImages: ModelImage[];
  originalModelImageUrl: string | null;
}): string | null {
  const { imageSource, config, modelImages, originalModelImageUrl } = params;
  if (imageSource === 'model' && config.imageId) {
    const img = modelImages.find((m) => m.id === config.imageId);
    return img?.signedUrl || img?.gcsUrl || null;
  }
  if (imageSource === 'upload') {
    return originalModelImageUrl || config.imageUrl || null;
  }
  return null;
}

export function resolveModelImageUrl(params: {
  imageSource: ImageSource;
  config: VGC;
  modelImages: ModelImage[];
  originalModelImageUrl: string | null;
  uploadedGcsUrl: string | null;
}): string | null {
  const { imageSource, config, modelImages, originalModelImageUrl, uploadedGcsUrl } = params;
  if (imageSource === 'model' && config.imageId) {
    const img = modelImages.find((m) => m.id === config.imageId);
    return img?.gcsUrl || img?.signedUrl || null;
  }
  if (imageSource === 'upload') {
    return originalModelImageUrl || uploadedGcsUrl || config.imageUrl || null;
  }
  return null;
}

export async function generateAllMasterFirstFrames(params: {
  masterModels: MasterModel[];
  generateForModel: (modelId: string, primaryGcsUrl: string) => Promise<FirstFrameOption[] | null>;
  onProgress: (done: number, total: number) => void;
}) {
  const { masterModels, generateForModel, onProgress } = params;
  const total = masterModels.length;
  let done = 0;
  onProgress(0, total);

  const promises = masterModels.map((model) =>
    generateForModel(model.modelId, model.primaryGcsUrl).then(() => {
      done += 1;
      onProgress(Math.min(done, total), total);
    }),
  );

  await Promise.all(promises);
}
