'use client';

import Modal from '@/components/ui/Modal';
import type { GeneratedVideo } from '@/hooks/useGeneratedVideos';

function formatDate(iso: string) {
  const value = +new Date(iso);
  if (!Number.isFinite(value) || value <= 0) return 'Unknown date';
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VideoPreviewModal({
  open,
  onClose,
  video,
}: {
  open: boolean;
  onClose: () => void;
  video: GeneratedVideo | null;
}) {
  if (!video) return null;
  const src = video.signedUrl || video.gcsUrl;

  return (
    <Modal open={open} onClose={onClose} title="Video Preview" maxWidth="max-w-3xl">
      <div className="p-4">
        <div className="overflow-hidden rounded-lg bg-black">
          <video
            src={src}
            controls
            autoPlay
            preload="metadata"
            playsInline
            className="h-auto max-h-[80vh] w-full"
          />
        </div>
        <div className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
          <p>
            <span className="font-medium text-[var(--text)]">Name:</span>{' '}
            {video.filename}
          </p>
          <p>
            <span className="font-medium text-[var(--text)]">Created:</span>{' '}
            {formatDate(video.createdAt)}
          </p>
          {video.jobId && (
            <p>
              <span className="font-medium text-[var(--text)]">Job:</span>{' '}
              {video.jobId}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
