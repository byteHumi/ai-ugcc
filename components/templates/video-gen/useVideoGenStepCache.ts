import { useEffect } from 'react';
import type { CachedStepState, FirstFrameInputMode, FirstFrameOption, ImageSource, ExtractedFrame } from './types';

export const videoGenStepCache = new Map<string, CachedStepState>();

type Params = {
  stepId?: string;
  extractedFrames: ExtractedFrame[];
  firstFrameOptions: FirstFrameOption[];
  dismissedOptions: Set<string>;
  imageSource: ImageSource;
  sceneDisplayUrl: string | null;
  showImageGrid: boolean;
  firstFrameInputMode: FirstFrameInputMode;
  selectedFirstFrameDisplayUrl: string | null;
  masterPerModelResults: Record<string, FirstFrameOption[]>;
  masterAutoExtracted: boolean;
  originalModelImageUrlRef: React.MutableRefObject<string | null>;
  uploadedGcsUrlRef: React.MutableRefObject<string | null>;
};

export function useVideoGenStepCache({
  stepId,
  extractedFrames,
  firstFrameOptions,
  dismissedOptions,
  imageSource,
  sceneDisplayUrl,
  showImageGrid,
  firstFrameInputMode,
  selectedFirstFrameDisplayUrl,
  masterPerModelResults,
  masterAutoExtracted,
  originalModelImageUrlRef,
  uploadedGcsUrlRef,
}: Params) {
  useEffect(() => {
    if (!stepId) return;
    videoGenStepCache.set(stepId, {
      extractedFrames,
      firstFrameOptions,
      dismissedOptions: Array.from(dismissedOptions),
      imageSource,
      sceneDisplayUrl,
      originalModelImageUrl: originalModelImageUrlRef.current,
      uploadedGcsUrl: uploadedGcsUrlRef.current,
      showImageGrid,
      firstFrameInputMode,
      selectedFirstFrameDisplayUrl,
      masterPerModelResults,
      masterAutoExtracted,
    });
  }, [
    stepId,
    extractedFrames,
    firstFrameOptions,
    dismissedOptions,
    imageSource,
    sceneDisplayUrl,
    showImageGrid,
    firstFrameInputMode,
    selectedFirstFrameDisplayUrl,
    masterPerModelResults,
    masterAutoExtracted,
    originalModelImageUrlRef,
    uploadedGcsUrlRef,
  ]);
}
