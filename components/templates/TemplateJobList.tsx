'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Download, Check, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TemplateJob } from '@/types';
import Spinner from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';

const stepIcon = (status: 'done' | 'active' | 'pending' | 'disabled') => {
  switch (status) {
    case 'done':     return <Check className="h-3 w-3 text-emerald-500" />;
    case 'active':   return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
    case 'disabled': return <span className="h-3 w-3 rounded-full border border-dashed border-[var(--border)]" />;
    default:         return <span className="h-3 w-3 rounded-full border border-[var(--border)]" />;
  }
};

const PER_PAGE = 16;

export default function TemplateJobList({ jobs }: { jobs: TemplateJob[] }) {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<TemplateJob | null>(null);
  const [page, setPage] = useState(1);

  // Keep modal in sync with live polling data
  const liveJob = selectedJob ? jobs.find((j) => j.id === selectedJob.id) ?? selectedJob : null;

  const totalPages = Math.max(1, Math.ceil(jobs.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedJobs = useMemo(
    () => jobs.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [jobs, safePage],
  );

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-8 text-center shadow-sm backdrop-blur-xl">
        <p className="text-[var(--text-muted)]">No template jobs yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {paginatedJobs.map((job) => {
          const isActive = job.status === 'queued' || job.status === 'processing';
          const hasVideo = job.status === 'completed' && job.outputUrl;
          const progress = job.totalSteps > 0 ? Math.round((job.currentStep / job.totalSteps) * 100) : 0;

          return (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`group cursor-pointer overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-lg ${
                isActive ? 'ring-1 ring-blue-300' : ''
              }`}
            >
              {/* Thumbnail — 9:16 */}
              <div
                className="relative w-full bg-black/90"
                style={{ aspectRatio: '9/16' }}
              >
                {hasVideo ? (
                  <video
                    src={job.signedUrl || job.outputUrl}
                    className="absolute inset-0 h-full w-full object-contain"
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                    ) : job.status === 'failed' ? (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    ) : (
                      <span className="text-[10px] text-white/40">Queued</span>
                    )}
                  </div>
                )}

                {/* Status overlay */}
                <div className="absolute left-1.5 top-1.5">
                  <StatusBadge status={job.status} />
                </div>

                {/* Active progress overlay */}
                {isActive && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                    <div className="mb-1 flex items-center gap-1 text-[9px] text-white/80">
                      <Spinner className="h-2.5 w-2.5" />
                      <span className="truncate">{job.step}</span>
                    </div>
                    <ProgressBar progress={progress} size="sm" />
                  </div>
                )}
              </div>

              {/* Info bar */}
              <div className="bg-[var(--surface)] px-2.5 py-2">
                <p className="truncate text-xs font-medium">{job.name}</p>
                {job.createdAt && (
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                    {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                    {new Date(job.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                p === safePage
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--accent)]'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        open={!!liveJob}
        onClose={() => setSelectedJob(null)}
        title={liveJob?.name || 'Job'}
        maxWidth="max-w-xs"
      >
        {liveJob && (() => {
          const isActive = liveJob.status === 'queued' || liveJob.status === 'processing';
          const isFailed = liveJob.status === 'failed';
          const isCompleted = liveJob.status === 'completed';
          const enabledSteps = liveJob.pipeline.filter((s) => s.enabled);
          const completedSteps = isCompleted
            ? enabledSteps.length
            : Math.min(liveJob.currentStep, enabledSteps.length);
          const progress = enabledSteps.length > 0
            ? Math.round((completedSteps / enabledSteps.length) * 100)
            : 0;
          const videoSrc = liveJob.signedUrl || liveJob.outputUrl;

          return (
            <div className="flex flex-col">
              {/* ── Video / Placeholder (9:16) ── */}
              <div
                className="relative w-full bg-black"
                style={{ aspectRatio: '9/16', maxHeight: 600 }}
              >
                {isCompleted && videoSrc ? (
                  <video
                    src={videoSrc}
                    controls
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    {isActive ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                        <span className="text-xs text-white/60">{liveJob.step || 'Processing...'}</span>
                      </>
                    ) : isFailed ? (
                      <>
                        <AlertCircle className="h-6 w-6 text-red-400" />
                        <span className="text-xs text-white/60">Failed</span>
                      </>
                    ) : (
                      <span className="text-xs text-white/40">Queued</span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Info section ── */}
              <div className="p-3 space-y-2.5">
                {/* Status + date row */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={liveJob.status} />
                  {liveJob.createdAt && (
                    <span className="text-[10px] tabular-nums text-[var(--text-muted)]">
                      {new Date(liveJob.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                      {new Date(liveJob.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Progress */}
                {enabledSteps.length > 0 && !isCompleted && (
                  <div>
                    <ProgressBar progress={progress} />
                    <div className="mt-1 text-[10px] tabular-nums text-[var(--text-muted)]">
                      {completedSteps} of {enabledSteps.length} steps
                    </div>
                  </div>
                )}

                {/* Pipeline chips */}
                <div className="flex flex-wrap gap-1">
                  {liveJob.pipeline.map((step, i) => {
                    let st: 'done' | 'active' | 'pending' | 'disabled' = 'pending';
                    if (!step.enabled) st = 'disabled';
                    else if (i < liveJob.currentStep || isCompleted) st = 'done';
                    else if (i === liveJob.currentStep && liveJob.status === 'processing') st = 'active';

                    return (
                      <span
                        key={step.id}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] leading-none ${
                          st === 'done'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : st === 'active'
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                              : st === 'disabled'
                                ? 'bg-[var(--accent)] text-[var(--text-muted)] line-through opacity-60'
                                : 'bg-[var(--accent)] text-[var(--text-muted)]'
                        }`}
                      >
                        {stepIcon(st)}
                        <span className="capitalize">{step.type.replace(/-/g, ' ')}</span>
                      </span>
                    );
                  })}
                </div>

                {/* Error */}
                {isFailed && liveJob.error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{liveJob.error}</span>
                  </div>
                )}

                {/* Action buttons */}
                {isCompleted && videoSrc && (
                  <div className="flex gap-2 pt-0.5">
                    <a
                      href={videoSrc}
                      download
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--accent)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                    <button
                      onClick={() => {
                        setSelectedJob(null);
                        router.push(`/posts?createPost=true&videoUrl=${encodeURIComponent(videoSrc!)}`);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white transition-colors hover:opacity-90"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Create Post
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
