'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import { useToast } from '@/hooks/useToast';
import { usePagination } from '@/hooks/usePagination';
import { downloadVideo } from '@/lib/dateUtils';
import Spinner from '@/components/ui/Spinner';
import RefreshButton from '@/components/ui/RefreshButton';
import JobDetailModal from '@/components/queue/JobDetailModal';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';

export default function QueuePage() {
  const router = useRouter();
  const { jobs, refresh } = useJobs();
  const { showToast } = useToast();
  const { page, setPage, totalPages, paginatedItems, pageNumbers, hasPrev, hasNext, prevPage, nextPage } = usePagination(jobs, 10);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Always read latest job data from jobs array so modal updates live
  const selectedJob = selectedJobId ? jobs.find((j) => j.id === selectedJobId) || null : null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Generation Queue</h1>
          <p className="text-[var(--text-muted)]">Track your video generation jobs</p>
        </div>
        <RefreshButton onClick={refresh} />
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-[var(--text-muted)]">No videos generated yet</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {paginatedItems.map((job) => {
              const hasVideo = job.status === 'completed' && (job.signedUrl || job.outputUrl);
              const isActive = job.status === 'queued' || job.status === 'processing';

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-md ${
                    isActive ? 'border-blue-200 bg-blue-50/30' : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--background)]">
                      {hasVideo ? (
                        <video
                          src={job.signedUrl || job.outputUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">
                          {job.status === 'failed' ? '❌' : isActive ? '⏳' : '🎬'}
                        </div>
                      )}
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Spinner className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Source + status */}
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="line-clamp-1 text-xs font-semibold text-[var(--text)]">
                          {job.videoSource === 'upload' ? 'Uploaded video' : (job.tiktokUrl?.slice(0, 40) + '...')}
                        </span>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            job.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                            job.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                            isActive ? 'bg-blue-100 text-blue-600' :
                            'bg-[var(--warning-bg)] text-[var(--warning)]'
                          }`}
                        >
                          {isActive && <Spinner className="h-3 w-3" />}
                          {job.status === 'completed' && <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                          {job.status}
                        </span>
                      </div>

                      {/* Step (for active jobs) */}
                      {isActive && (
                        <div className="mb-1 text-[10px] text-blue-600">{job.step}</div>
                      )}

                      {/* Date */}
                      {job.createdAt && (
                        <div className="mb-1.5 text-[10px] text-[var(--text-muted)]">
                          {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(job.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}

                      {/* Actions */}
                      {hasVideo && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); downloadVideo(job.signedUrl || job.outputUrl!, `video-${job.id}.mp4`, showToast); }}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-medium hover:bg-[var(--background)]"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push('/posts?createPost=true&videoUrl=' + encodeURIComponent(job.outputUrl!));
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-border)] bg-[var(--accent)] px-2 py-1 text-[10px] font-medium hover:bg-[#fde68a]"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Create Post
                          </button>
                        </div>
                      )}

                      {/* Error message */}
                      {job.status === 'failed' && (
                        <div className="text-[10px] text-[var(--error)]">Generation failed</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={prevPage}
                    className={!hasPrev ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
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
                  <PaginationNext
                    onClick={nextPage}
                    className={!hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJobId(null)}
        onDownload={(j) => downloadVideo(j.signedUrl || j.outputUrl!, `video-${j.id}.mp4`, showToast)}
        onCreatePost={(j) => {
          setSelectedJobId(null);
          router.push('/posts?createPost=true&videoUrl=' + encodeURIComponent(j.outputUrl!));
        }}
      />
    </div>
  );
}
