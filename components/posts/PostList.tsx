'use client';

import { useState } from 'react';
import type { Post } from '@/types';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { getCreatedDateDisplay, getScheduledDateDisplay } from '@/lib/dateUtils';
import Spinner from '@/components/ui/Spinner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

export default function PostList({
  posts,
  isLoading,
  refresh,
  onCreatePost,
  onVideoPreview,
}: {
  posts: Post[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  onCreatePost: () => void;
  onVideoPreview: (video: { url: string; caption: string }) => void;
}) {
  const { showToast } = useToast();
  const { page, setPage, totalPages, paginatedItems, pageNumbers, hasPrev, hasNext, prevPage, nextPage } = usePagination(posts, 10);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex animate-pulse gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="h-20 w-16 shrink-0 rounded-md bg-[var(--background)]" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 w-3/4 rounded bg-[var(--background)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--background)]" />
              <div className="h-3 w-1/3 rounded bg-[var(--background)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-muted)]">
        <h3 className="mb-2 font-semibold text-[var(--text)]">No posts yet</h3>
        <p className="mb-4">Create your first post to get started</p>
        <button onClick={onCreatePost} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white hover:bg-[var(--primary-hover)]">
          + Create Post
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2">
      {paginatedItems.map((post) => {
        const platform = post.platforms?.[0];
        const status = platform?.status || (post as { status?: string }).status || 'draft';
        const thumbnail = post.mediaItems?.[0]?.url || post.mediaItems?.[0]?.thumbnailUrl;
        const isScheduledCard = status === 'scheduled';
        const postTz = (post as { timezone?: string }).timezone || 'Asia/Kolkata';
        const scheduledDisplay = getScheduledDateDisplay(post.scheduledFor, postTz);
        const createdDisplay = getCreatedDateDisplay(post.createdAt);
        const isPublishing = status === 'publishing' || status === 'processing' || status === 'in_progress' || status === 'pending';

        return (
          <div
            key={post._id}
            className={`group rounded-lg border p-3 transition-all hover:shadow-md ${
              isScheduledCard
                ? 'border-blue-200 bg-blue-50/30'
                : 'border-[var(--border)] bg-[var(--surface)]'
            }`}
          >
            <div className="flex gap-3">
              {/* Checkbox */}
              <input type="checkbox" className="mt-1 h-3.5 w-3.5 shrink-0 rounded accent-[var(--primary)]" />

              {/* Thumbnail */}
              <div
                className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--background)] ${thumbnail ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (thumbnail) {
                    onVideoPreview({ url: thumbnail, caption: post.content || '(No caption)' });
                  }
                }}
              >
                {thumbnail ? (
                  <>
                    <video
                      src={thumbnail}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90">
                        <svg className="ml-0.5 h-3 w-3 text-[var(--primary)]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Top row: caption + status */}
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-xs font-semibold text-[var(--text)]">
                    {post.content || '(No caption)'}
                  </h3>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      status === 'published' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                      status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                      status === 'partial' ? 'bg-orange-100 text-orange-600' :
                      isScheduledCard ? 'bg-blue-100 text-blue-600' :
                      isPublishing ? 'bg-amber-100 text-amber-600' :
                      'bg-[var(--background)] text-[var(--text-muted)]'
                    }`}
                  >
                    {status === 'published' && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    {isPublishing && <span className="text-[10px]">🚀</span>}
                    {isScheduledCard && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    {status === 'partial' && <span className="text-[10px]">⚠️</span>}
                    {isPublishing ? 'Publishing' : status === 'partial' ? 'Partial' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>

                {/* Dates */}
                <div className="mb-1 flex flex-wrap items-center gap-x-2 text-[10px] text-[var(--text-muted)]">
                  {post.scheduledFor && <span>{scheduledDisplay}</span>}
                  {post.createdAt && <span>{createdDisplay}</span>}
                  <span>by: Internal</span>
                </div>

                {/* ID */}
                <div className="mb-1.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                  <span className="font-mono">{post._id.slice(0, 9)}...</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(post._id);
                      showToast('ID copied!', 'success');
                    }}
                    className="rounded p-0.5 hover:bg-[var(--background)]"
                    title="Copy ID"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                {/* Platforms */}
                <div className="flex flex-wrap gap-1">
                  {post.platforms?.map((p) => {
                    const pStatus = p.status || 'pending';
                    const isPlatformPublishing = pStatus === 'publishing' || pStatus === 'processing' || pStatus === 'in_progress' || pStatus === 'pending';
                    const isPlatformScheduled = pStatus === 'scheduled';
                    return (
                      <span
                        key={p.platform}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          pStatus === 'published' ? 'border-[var(--success)]/30 bg-[var(--success-bg)] text-[var(--success)]' :
                          pStatus === 'failed' ? 'border-[var(--error)]/30 bg-[var(--error-bg)] text-[var(--error)]' :
                          isPlatformScheduled ? 'border-blue-200 bg-blue-50 text-blue-600' :
                          isPlatformPublishing ? 'border-amber-200 bg-amber-50 text-amber-600' :
                          'border-[var(--warning)]/30 bg-[var(--warning-bg)] text-[var(--warning)]'
                        }`}
                      >
                        {p.platform === 'tiktok' && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>}
                        {p.platform === 'instagram' && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
                        {p.platform === 'youtube' && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
                        {p.platform === 'twitter' && <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                        {p.platform}
                        {pStatus === 'published' && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        {isPlatformScheduled && (
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {isPlatformPublishing && !isPlatformScheduled && (
                          <Spinner className="h-3 w-3" />
                        )}
                        {pStatus === 'published' && p.platformPostUrl && (
                          <a href={p.platformPostUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80" onClick={(e) => e.stopPropagation()}>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions row */}
            <div className="mt-2 flex items-center gap-1.5 pl-[26px]">
              {(status === 'failed' || status === 'partial') && (
                <button
                  onClick={async () => {
                    setIsRetrying(post._id);
                    try {
                      await fetch(`/api/late/posts/${post._id}/retry`, { method: 'POST' });
                      showToast('Retrying publish...', 'success');
                      refresh();
                    } finally {
                      setIsRetrying(null);
                    }
                  }}
                  disabled={isRetrying === post._id}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--success)]/30 bg-[var(--success-bg)] px-2 py-1 text-[10px] font-medium text-[var(--success)] hover:border-[var(--success)] disabled:opacity-50"
                >
                  {isRetrying === post._id ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {isRetrying === post._id ? 'Retrying...' : 'Retry'}
                </button>
              )}
              {status === 'scheduled' && (
                <button
                  onClick={() => { showToast('Edit feature coming soon', 'success'); }}
                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 hover:border-blue-300"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={async () => {
                  if (!confirm('Delete this post?')) return;
                  setIsDeletingPost(post._id);
                  try {
                    await fetch(`/api/late/posts/${post._id}`, { method: 'DELETE' });
                    showToast('Post deleted', 'success');
                    refresh();
                  } finally {
                    setIsDeletingPost(null);
                  }
                }}
                disabled={isDeletingPost === post._id}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-[var(--text-muted)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] disabled:opacity-50"
              >
                {isDeletingPost === post._id ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                {isDeletingPost === post._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        );
      })}
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
  );
}
