'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useGeneratedVideos, type GeneratedVideo } from '@/hooks/useGeneratedVideos';
import { useModelFilterOptions } from '@/hooks/useModelFilterOptions';
import VideoGallery from '@/components/videos/VideoGallery';
import VideoPreviewModal from '@/components/videos/VideoPreviewModal';
import ModelDateToolbar from '@/components/media/ModelDateToolbar';
import type { DateFilterValue } from '@/types/media-filters';

export default function VideosPage() {
  const [modelFilter, setModelFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('newest');
  const { models: modelOptions } = useModelFilterOptions();
  const { videos, isLoadingPage, refresh, page, setPage, totalPages, total } = useGeneratedVideos({
    modelId: modelFilter === 'all' ? undefined : modelFilter,
    dateFilter,
  });
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary)]">Videos</h1>
          <p className="text-[var(--text-muted)]">
            Generated videos{total > 0 && <span className="ml-1">({total})</span>}
          </p>
        </div>
        <ModelDateToolbar
          modelId={modelFilter}
          onModelChange={(value) => {
            setModelFilter(value);
            setPage(1);
          }}
          dateFilter={dateFilter}
          onDateFilterChange={(value) => {
            setDateFilter(value);
            setPage(1);
          }}
          modelOptions={modelOptions}
          onRefresh={refresh}
        />
      </div>

      <VideoGallery
        videos={videos}
        isLoading={isLoadingPage}
        onVideoClick={(video) => setPreviewVideo(video)}
      />

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
              if (i > 0 && p - arr[i - 1] > 1) acc.push('dots');
              acc.push(p);
              return acc;
            }, [])
            .map((item, i) =>
              item === 'dots' ? (
                <span key={`dots-${i}`} className="px-1 text-[var(--text-muted)]">...</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-medium transition-colors ${
                    page === item
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent)]'
                  }`}
                >
                  {item}
                </button>
              )
            )}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <VideoPreviewModal
        open={!!previewVideo}
        onClose={() => setPreviewVideo(null)}
        video={previewVideo}
      />
    </div>
  );
}
