'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Batch } from '@/types';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { downloadVideo } from '@/lib/dateUtils';
import Spinner from '@/components/ui/Spinner';
import RefreshButton from '@/components/ui/RefreshButton';
import VideoPreviewModal from '@/components/posts/VideoPreviewModal';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

// Module-level cache keyed by batch ID
const _cache: Record<string, Batch> = {};

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [batch, setBatch] = useState<Batch | null>(_cache[id] || null);
  const [isLoading, setIsLoading] = useState(!_cache[id]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [videoPreview, setVideoPreview] = useState<{ url: string; caption: string } | null>(null);

  const loadBatch = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch(`/api/batches/${id}`);
      const data = await res.json();
      _cache[id] = data;
      setBatch(data);
    } catch {
      showToast('Failed to load batch', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  // Only fetch on mount if not cached
  useEffect(() => {
    if (!_cache[id]) {
      loadBatch(true);
    }
  }, [id, loadBatch]);

  const jobs = batch?.jobs || [];
  const { page, setPage, totalPages, paginatedItems, pageNumbers, hasPrev, hasNext, prevPage, nextPage } = usePagination(jobs, 10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8 text-[var(--primary)]" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-20 text-center">
        <h2 className="mb-2 text-xl font-semibold">Batch not found</h2>
        <Link href="/batches" className="text-[var(--primary)] hover:underline">Back to batches</Link>
      </div>
    );
  }

  const isActive = batch.status === 'pending' || batch.status === 'processing';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <Link href="/batches" className="hover:text-[var(--text)]">Batches</Link>
        <span>/</span>
        <span className="text-[var(--text)]">{batch.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-xl">
            {batch.model?.avatarUrl ? (
              <img src={batch.model.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              '🎬'
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{batch.name}</h1>
            <p className="text-[var(--text-muted)]">{batch.model?.name || 'Single image'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${
            batch.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
            batch.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
            batch.status === 'partial' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
            isActive ? 'bg-blue-50 text-blue-600' :
            'bg-[var(--background)] text-[var(--text-muted)]'
          }`}>
            {isActive && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />}
            {batch.status}
          </span>
          <RefreshButton onClick={() => loadBatch()} />
          <button
            onClick={async () => {
              if (!confirm('Delete this batch? Completed videos will be preserved.')) return;
              setIsDeleting(true);
              try {
                await fetch(`/api/batches/${batch.id}`, { method: 'DELETE' });
                showToast('Batch deleted', 'success');
                router.push('/batches');
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="rounded-lg border border-[var(--error)] bg-[var(--error-bg)] px-3 py-1.5 text-sm text-[var(--error)] hover:opacity-80 disabled:opacity-50"
          >
            {isDeleting ? <Spinner className="h-4 w-4" /> : 'Delete'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Total</div>
          <div className="text-3xl font-bold">{batch.totalJobs}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">videos</div>
        </div>
        <div className="rounded-xl border border-[var(--success)]/20 bg-[var(--success-bg)] p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--success)]">Completed</div>
          <div className="text-3xl font-bold text-[var(--success)]">{batch.completedJobs}</div>
          <div className="mt-1 text-xs text-[var(--success)]">{batch.totalJobs > 0 ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0}% done</div>
        </div>
        <div className="rounded-xl border border-[var(--error)]/20 bg-[var(--error-bg)] p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--error)]">Failed</div>
          <div className="text-3xl font-bold text-[var(--error)]">{batch.failedJobs}</div>
          <div className="mt-1 text-xs text-[var(--error)]">{batch.totalJobs > 0 ? Math.round((batch.failedJobs / batch.totalJobs) * 100) : 0}% failed</div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Pending</div>
          <div className="text-3xl font-bold text-[var(--text-muted)]">{batch.totalJobs - batch.completedJobs - batch.failedJobs}</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">remaining</div>
        </div>
      </div>

      {/* Videos grid */}
      <h2 className="mb-4 text-lg font-semibold">Videos ({jobs.length})</h2>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--text-muted)]">
          No videos in this batch
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((job) => (
              <div key={job.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {/* Video thumbnail */}
                <div
                  className={`relative aspect-video bg-[var(--background)] ${(job.signedUrl || job.outputUrl) ? 'cursor-pointer group' : ''}`}
                  onClick={() => {
                    if (job.signedUrl || job.outputUrl) {
                      setVideoPreview({
                        url: job.signedUrl || job.outputUrl || '',
                        caption: job.videoSource === 'upload' ? 'Uploaded video' : (job.tiktokUrl || ''),
                      });
                    }
                  }}
                >
                  {(job.signedUrl || job.outputUrl) ? (
                    <>
                      <video
                        src={job.signedUrl || job.outputUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                          <svg className="ml-0.5 h-5 w-5 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-[var(--text-muted)]">
                      {job.status === 'failed' ? '❌' : '🎬'}
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                    job.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                    'bg-[var(--warning-bg)] text-[var(--warning)]'
                  }`}>
                    {job.status}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="mb-1 truncate text-sm">
                    {job.videoSource === 'upload' ? 'Uploaded video' : job.tiktokUrl}
                  </div>
                  <div className="mb-2 text-xs text-[var(--text-muted)]">{job.step}</div>

                  {job.status === 'completed' && (job.signedUrl || job.outputUrl) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadVideo(job.signedUrl || job.outputUrl!, `video-${job.id}.mp4`, showToast)}
                        className="flex-1 rounded-lg border border-[var(--border)] py-1.5 text-center text-xs font-medium hover:bg-[var(--background)]"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => {
                          router.push('/posts?createPost=true&videoUrl=' + encodeURIComponent(job.outputUrl!));
                        }}
                        className="flex-1 rounded-lg border border-[var(--accent-border)] bg-[var(--accent)] py-1.5 text-center text-xs font-medium hover:bg-[#fde68a]"
                      >
                        Create Post
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={prevPage} className={!hasPrev ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
                {pageNumbers.map((p, i) =>
                  p === 'ellipsis' ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink isActive={page === p} onClick={() => setPage(p)} className="cursor-pointer">
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext onClick={nextPage} className={!hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <VideoPreviewModal video={videoPreview} onClose={() => setVideoPreview(null)} />
    </div>
  );
}
