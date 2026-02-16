import type { BatchImageEntry } from '@/types';

export type ImageSource = 'model' | 'upload';

export type ExtractedFrame = {
  url: string;
  gcsUrl: string;
  score: number;
  hasFace: boolean;
  timestamp: number;
};

export type FirstFrameOption = {
  url: string;
  gcsUrl: string;
};

export type EntryDisplayResolver = (entry: BatchImageEntry) => string;
