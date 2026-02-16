import { useEffect } from 'react';
import { signUrls } from '@/lib/signedUrlClient';
import type { GeneratedImage } from '@/types';

type Params = {
  isDirectLibraryFirstFrame: boolean;
  imageUrl?: string;
  libraryImages: GeneratedImage[];
  selectedFirstFrameDisplayUrl: string | null;
  setSelectedFirstFrameDisplayUrl: (url: string | null) => void;
  setIsResolvingSelectedFirstFrame: (value: boolean) => void;
};

export function useDirectLibraryPreview({
  isDirectLibraryFirstFrame,
  imageUrl,
  libraryImages,
  selectedFirstFrameDisplayUrl,
  setSelectedFirstFrameDisplayUrl,
  setIsResolvingSelectedFirstFrame,
}: Params) {
  useEffect(() => {
    if (!isDirectLibraryFirstFrame || !imageUrl) {
      setIsResolvingSelectedFirstFrame(false);
      return;
    }

    const matched = libraryImages.find((img) => img.gcsUrl === imageUrl);
    if (matched?.signedUrl || matched?.gcsUrl) {
      const resolved = matched.signedUrl || matched.gcsUrl;
      if (selectedFirstFrameDisplayUrl !== resolved) setSelectedFirstFrameDisplayUrl(resolved);
      setIsResolvingSelectedFirstFrame(false);
      return;
    }

    const needsSigning = imageUrl.includes('storage.googleapis.com');
    if (!needsSigning) {
      if (selectedFirstFrameDisplayUrl !== imageUrl) setSelectedFirstFrameDisplayUrl(imageUrl);
      setIsResolvingSelectedFirstFrame(false);
      return;
    }

    let cancelled = false;
    setIsResolvingSelectedFirstFrame(true);

    signUrls([imageUrl])
      .then((signed) => {
        if (cancelled) return;
        const resolved = signed.get(imageUrl) || imageUrl;
        if (selectedFirstFrameDisplayUrl !== resolved) setSelectedFirstFrameDisplayUrl(resolved);
      })
      .catch(() => {
        if (!cancelled && selectedFirstFrameDisplayUrl !== imageUrl) {
          setSelectedFirstFrameDisplayUrl(imageUrl);
        }
      })
      .finally(() => {
        if (!cancelled) setIsResolvingSelectedFirstFrame(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    imageUrl,
    isDirectLibraryFirstFrame,
    libraryImages,
    selectedFirstFrameDisplayUrl,
    setIsResolvingSelectedFirstFrame,
    setSelectedFirstFrameDisplayUrl,
  ]);
}
