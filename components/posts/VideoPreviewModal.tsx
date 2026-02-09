'use client';

export default function VideoPreviewModal({
  video,
  onClose,
}: {
  video: { url: string; caption: string } | null;
  onClose: () => void;
}) {
  if (!video) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
          <h3 className="truncate text-lg font-medium text-white">{video.caption}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <video
          src={video.url}
          controls
          autoPlay
          className="h-auto max-h-[90vh] w-full"
          style={{ aspectRatio: '9/16', maxWidth: '100%', margin: '0 auto' }}
        />
      </div>
    </div>
  );
}
