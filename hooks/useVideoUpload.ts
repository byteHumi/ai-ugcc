'use client';

import { useState, useCallback } from 'react';
import { uploadVideoDirectToGcs } from '@/lib/gcsResumableUpload';

type UploadResult = {
  success: boolean;
  gcsUrl: string;
  url?: string;
  filename?: string;
};

export function useVideoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadVideo = useCallback(async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    try {
      const data = await uploadVideoDirectToGcs(file, {
        onProgress: (uploadedBytes, totalBytes) => {
          const pct = totalBytes === 0 ? 0 : Math.round((uploadedBytes / totalBytes) * 100);
          setProgress(pct);
        },
      });
      if (data.gcsUrl) {
        return { success: true, gcsUrl: data.gcsUrl, url: data.url, filename: data.filename };
      }
      return null;
    } catch (err) {
      throw err;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
  }, []);

  return { uploadVideo, isUploading, progress, reset };
}
