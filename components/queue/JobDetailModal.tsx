'use client';

import type { Job } from '@/types';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';

export default function JobDetailModal({
  job,
  onClose,
  onDownload,
  onCreatePost,
}: {
  job: Job | null;
  onClose: () => void;
  onDownload: (job: Job) => void;
  onCreatePost: (job: Job) => void;
}) {
  if (!job) return null;

  const hasVideo = job.status === 'completed' && (job.signedUrl || job.outputUrl);
  const isActive = job.status === 'queued' || job.status === 'processing';

  return (
    <Modal open={!!job} onClose={onClose} maxWidth="max-w-md">
      {/* Video / Status area */}
      <div className="relative bg-black">
        {hasVideo ? (
          <video
            src={job.signedUrl || job.outputUrl}
            controls
            autoPlay
            className="mx-auto max-h-[60vh] w-full"
            style={{ aspectRatio: '9/16' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
            {isActive ? (
              <>
                <Spinner className="h-10 w-10 text-blue-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Generating video...</p>
                  <p className="mt-1 text-xs text-white/60">{job.step}</p>
                </div>
              </>
            ) : job.status === 'failed' ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-2xl">❌</div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Generation failed</p>
                  <p className="mt-1 text-xs text-white/60">This video could not be generated</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">🎬</div>
                <p className="text-sm text-white/60">{job.status}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div className="p-4">
        {/* Source */}
        <p className="mb-1 text-sm font-semibold text-[var(--text)]">
          {job.videoSource === 'upload' ? 'Uploaded video' : (job.tiktokUrl || 'Video')}
        </p>

        {/* Date + status */}
        <div className="mb-3 flex items-center gap-2">
          {job.createdAt && (
            <span className="text-xs text-[var(--text-muted)]">
              {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {new Date(job.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
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

        {/* Actions for completed */}
        {hasVideo && (
          <div className="flex gap-2">
            <button
              onClick={() => onDownload(job)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] py-2 text-xs font-medium hover:bg-[var(--background)]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </button>
            <button
              onClick={() => onCreatePost(job)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--accent-border)] bg-[var(--accent)] py-2 text-xs font-medium hover:bg-[#fde68a]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create Post
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
