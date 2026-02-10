'use client';

import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import { useToast } from '@/hooks/useToast';
import { downloadVideo } from '@/lib/dateUtils';
import { useSidebar } from '@/components/ui/sidebar';
import Spinner from '@/components/ui/Spinner';

export default function GenerationQueue() {
  const router = useRouter();
  const { jobs } = useJobs();
  const { showToast } = useToast();
  const { state } = useSidebar();

  if (state === 'collapsed') return null;

  const activeJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'processing');
  const recentJobs = jobs.slice(0, 8);

  if (recentJobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 px-2">
      <div className="px-2 text-xs font-medium text-[var(--text-muted)]">
        Queue
        {activeJobs.length > 0 && (
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--warning)] px-1 text-[10px] font-bold text-white">
            {activeJobs.length}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-300px)]">
        {recentJobs.map((job) => (
          <div key={job.id} className="rounded-md bg-[var(--background)] p-2">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[11px] text-[var(--text-muted)]">
                {job.videoSource === 'upload'
                  ? 'Uploaded video'
                  : job.tiktokUrl?.replace('https://www.tiktok.com/', '').slice(0, 20) + '...'}
              </span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  job.status === 'completed' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                  job.status === 'failed' ? 'bg-[var(--error-bg)] text-[var(--error)]' :
                  'bg-[var(--warning-bg)] text-[var(--warning)]'
                }`}
              >
                {job.status === 'processing' ? <Spinner className="h-3 w-3" /> : job.status}
              </span>
            </div>
            {(job.status === 'queued' || job.status === 'processing') && (
              <div className="mt-1 text-[10px] text-[var(--text-muted)]">{job.step}</div>
            )}
            {job.status === 'completed' && (job.signedUrl || job.outputUrl) && (
              <div className="mt-1.5 flex gap-1">
                <button
                  onClick={() => downloadVideo(job.signedUrl || job.outputUrl!, `video-${job.id}.mp4`, showToast)}
                  className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium hover:bg-[var(--accent)]"
                >
                  Download
                </button>
                <button
                  onClick={() => {
                    router.push('/posts?createPost=true&videoUrl=' + encodeURIComponent(job.signedUrl || job.outputUrl!));
                  }}
                  className="rounded border border-[var(--accent-border)] bg-[var(--accent)] px-2 py-0.5 text-[10px] font-medium hover:bg-[#fde68a]"
                >
                  Post
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
