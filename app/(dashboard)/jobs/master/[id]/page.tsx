'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PipelineBatch, TemplateJob, MasterConfig } from '@/types';
import { useToast } from '@/hooks/useToast';
import { RefreshCw, Trash2, Loader2, CheckCircle2, XCircle, Clock, ArrowLeft, Crown, Square, CheckSquare, ThumbsUp } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import ProgressBar from '@/components/ui/ProgressBar';
import MasterJobCard from '@/components/templates/MasterJobCard';
import MasterJobModal from '@/components/templates/MasterJobModal';
import RegenerateModal from '@/components/templates/RegenerateModal';

const _cache: Record<string, PipelineBatch & { jobs?: TemplateJob[] }> = {};

async function signUrls(urls: string[]): Promise<Record<string, string>> {
  if (urls.length === 0) return {};
  try {
    const res = await fetch('/api/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.signed || {};
    }
  } catch {}
  return {};
}

export default function MasterBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [batch, setBatch] = useState<(PipelineBatch & { jobs?: TemplateJob[] }) | null>(_cache[id] || null);
  const [isLoading, setIsLoading] = useState(!_cache[id]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [modalJob, setModalJob] = useState<TemplateJob | null>(null);
  const [posting, setPosting] = useState(false);
  const [busyJobIds, setBusyJobIds] = useState<Set<string>>(new Set());
  const addBusy = (jid: string) => setBusyJobIds(prev => new Set(prev).add(jid));
  const removeBusy = (jid: string) => setBusyJobIds(prev => { const next = new Set(prev); next.delete(jid); return next; });
  const [regenerateJob, setRegenerateJob] = useState<TemplateJob | null>(null);

  const [signedModelImages, setSignedModelImages] = useState<Record<string, string>>({});
  const [jobPosts, setJobPosts] = useState<Record<string, { platform: string; status: string; platformPostUrl?: string; latePostId?: string }[]>>({});

  const masterConfig: MasterConfig | undefined = batch?.masterConfig;
  const jobs: TemplateJob[] = batch?.jobs || [];

  // Build model name + image lookup from masterConfig
  const modelNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    masterConfig?.models?.forEach((m) => { map[m.modelId] = m.modelName; });
    return map;
  }, [masterConfig]);

  const modelImageMap = useMemo(() => {
    const map: Record<string, string> = {};
    masterConfig?.models?.forEach((m) => {
      const signed = signedModelImages[m.primaryImageUrl];
      map[m.modelId] = signed || m.primaryImageUrl;
    });
    return map;
  }, [masterConfig, signedModelImages]);

  const loadBatch = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await fetch(`/api/pipeline-batches/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();

      // Server already signs output URLs — no need to re-sign on client

      // Update batch state immediately so UI reflects changes
      _cache[id] = data;
      setBatch(data);

      // Sign model image URLs from masterConfig (non-blocking)
      const mc = data.masterConfig as MasterConfig | undefined;
      if (mc?.models?.length) {
        const modelImageUrls = mc.models
          .map((m: { primaryImageUrl: string }) => m.primaryImageUrl)
          .filter((u: string) => u && u.includes('storage.googleapis.com'));
        if (modelImageUrls.length > 0) {
          try {
            const signedImages = await signUrls(modelImageUrls);
            setSignedModelImages((prev) => ({ ...prev, ...signedImages }));
          } catch {}
        }
      }

      // Fetch local post records for approved jobs (non-blocking)
      const postedJobs = (data.jobs || []).filter((j: TemplateJob) => j.postStatus === 'posted');
      if (postedJobs.length > 0) {
        try {
          const postRes = await fetch('/api/posts/by-jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobIds: postedJobs.map((j: TemplateJob) => j.id) }),
          });
          if (postRes.ok) {
            const postData = await postRes.json();
            const postsMap: Record<string, { platform: string; status: string; platformPostUrl?: string; latePostId?: string }[]> = {};
            for (const post of postData.posts || []) {
              if (!postsMap[post.jobId]) postsMap[post.jobId] = [];
              postsMap[post.jobId].push({
                platform: post.platform,
                status: post.status,
                platformPostUrl: post.platformPostUrl,
                latePostId: post.latePostId,
              });
            }
            setJobPosts(postsMap);
          }
        } catch {}
      }
    } catch {
      showToast('Failed to load master batch', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadBatch(!_cache[id]);
  }, [id, loadBatch]);

  // Auto-refresh while any job is still processing/queued
  const hasActiveJobs = jobs.some((j) => j.status === 'queued' || j.status === 'processing');
  const batchStatus = batch?.status;
  useEffect(() => {
    const isActive = batchStatus === 'pending' || batchStatus === 'processing' || hasActiveJobs;
    if (!isActive) return;
    const interval = setInterval(() => loadBatch(), 3000);
    return () => clearInterval(interval);
  }, [batchStatus, hasActiveJobs, loadBatch]);

  // Selectable completed jobs (not yet posted/rejected)
  const selectableJobs = useMemo(
    () => jobs.filter((j) => j.status === 'completed' && !j.postStatus),
    [jobs],
  );

  const toggleJob = (id: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedJobIds(new Set(selectableJobs.map((j) => j.id)));
  };

  const clearSelection = () => {
    setSelectedJobIds(new Set());
  };

  const handlePostSelected = async () => {
    if (selectedJobIds.size === 0) return;
    setPosting(true);
    try {
      const ids = Array.from(selectedJobIds);

      // 1. Try to post via Late API first
      try {
        const res = await fetch(`/api/templates/master/${id}/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds: ids }),
        });
        const data = await res.json();
        if (res.ok && data.summary?.posted > 0) {
          showToast(`Approved & posted ${data.summary.posted} video${data.summary.posted > 1 ? 's' : ''}!`, 'success');
        } else {
          showToast(`Approved ${ids.length} video${ids.length > 1 ? 's' : ''}!`, 'success');
        }
      } catch {
        showToast(`Approved ${ids.length} video${ids.length > 1 ? 's' : ''}!`, 'success');
      }

      // 2. Tag any remaining jobs as approved (post API already tags posted ones)
      await Promise.all(
        ids.map((jobId) =>
          fetch(`/api/templates/${jobId}/post-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postStatus: 'posted' }),
          })
        )
      );

      setSelectedJobIds(new Set());
      await loadBatch();
    } catch {
      showToast('Failed to approve videos', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedJobIds.size === 0) return;
    for (const jobId of selectedJobIds) {
      await fetch(`/api/templates/${jobId}/post-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postStatus: 'rejected' }),
      });
    }
    showToast(`Rejected ${selectedJobIds.size} video${selectedJobIds.size > 1 ? 's' : ''}`, 'success');
    setSelectedJobIds(new Set());
    await loadBatch();
  };

  const handleSinglePost = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (job?.postStatus === 'posted' || busyJobIds.has(jobId)) return;

    addBusy(jobId);
    try {
      try {
        const res = await fetch(`/api/templates/master/${id}/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobIds: [jobId] }),
        });
        const data = await res.json();
        if (res.ok && data.summary?.posted > 0) {
          showToast('Approved & posted!', 'success');
        } else if (res.ok && data.summary?.skipped > 0) {
          await fetch(`/api/templates/${jobId}/post-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postStatus: 'posted' }),
          });
          showToast('Approved! No social accounts linked — go to /models to link accounts.', 'success');
        } else {
          await fetch(`/api/templates/${jobId}/post-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postStatus: 'posted' }),
          });
          showToast('Approved!', 'success');
        }
      } catch {
        await fetch(`/api/templates/${jobId}/post-status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postStatus: 'posted' }),
        });
        showToast('Approved!', 'success');
      }

      setModalJob(null);
      await loadBatch();
    } catch {
      showToast('Failed to approve', 'error');
    } finally {
      removeBusy(jobId);
    }
  };

  const handleRepost = async (jobId: string) => {
    if (busyJobIds.has(jobId)) return;
    addBusy(jobId);
    try {
      const res = await fetch(`/api/templates/master/${id}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: [jobId], force: true }),
      });
      const data = await res.json();
      if (res.ok && data.summary?.posted > 0) {
        showToast('Reposted successfully!', 'success');
      } else if (res.ok && data.summary?.skipped > 0) {
        showToast('No social accounts linked — go to /models to link accounts.', 'error');
      } else {
        showToast('Failed to repost', 'error');
      }
      setModalJob(null);
      await loadBatch();
    } catch {
      showToast('Failed to repost', 'error');
    } finally {
      removeBusy(jobId);
    }
  };

  const handleQuickRegenerate = async (jobId: string) => {
    addBusy(jobId);
    try {
      const res = await fetch(`/api/templates/${jobId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast('Regenerating video...', 'success');
        setModalJob(null);
        await loadBatch();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to regenerate', 'error');
      }
    } catch {
      showToast('Failed to regenerate', 'error');
    } finally {
      removeBusy(jobId);
    }
  };

  const openRegenerateModal = (job: TemplateJob) => {
    setRegenerateJob(job);
  };

  const handleEditRegenerate = async (jobId: string, overrides?: { imageUrl?: string; imageId?: string }) => {
    setRegenerateJob(null);
    addBusy(jobId);
    try {
      const res = await fetch(`/api/templates/${jobId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrides || {}),
      });
      if (res.ok) {
        showToast(overrides?.imageUrl ? 'Regenerating with new image...' : 'Regenerating video...', 'success');
        setModalJob(null);
        await loadBatch();
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to regenerate', 'error');
      }
    } catch {
      showToast('Failed to regenerate', 'error');
    } finally {
      removeBusy(jobId);
    }
  };

  const handleSingleReject = async (jobId: string) => {
    addBusy(jobId);
    try {
      await fetch(`/api/templates/${jobId}/post-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postStatus: 'rejected' }),
      });
      showToast('Video rejected', 'success');
      setModalJob(null);
      await loadBatch();
    } catch {
      showToast('Failed to reject', 'error');
    } finally {
      removeBusy(jobId);
    }
  };

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
        <Link href="/jobs?tab=master" className="text-sm text-[var(--primary)] hover:underline">Back to jobs</Link>
      </div>
    );
  }

  const isActive = batch.status === 'pending' || batch.status === 'processing';
  const progress = batch.totalJobs > 0 ? Math.round((batch.completedJobs / batch.totalJobs) * 100) : 0;
  const pending = batch.totalJobs - batch.completedJobs - batch.failedJobs;
  const allSelected = selectableJobs.length > 0 && selectableJobs.every((j) => selectedJobIds.has(j.id));

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* Breadcrumb */}
      <Link href="/jobs?tab=master" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to master batches
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            isActive ? 'bg-master-light text-master dark:text-master-foreground' :
            'bg-[var(--accent)] text-[var(--text-muted)]'
          }`}>
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-master dark:text-master-foreground">{batch.name}</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {masterConfig?.models?.length || 0} models · {batch.totalJobs} videos
              {masterConfig?.publishMode && ` · ${masterConfig.publishMode}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsRefreshing(true); loadBatch(); }}
            disabled={isRefreshing}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={async () => {
              if (!confirm('Delete this master batch?')) return;
              setIsDeleting(true);
              try {
                await fetch(`/api/pipeline-batches/${batch.id}`, { method: 'DELETE' });
                showToast('Batch deleted', 'success');
                router.push('/jobs?tab=master');
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            {isDeleting ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Stats + Progress */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        {masterConfig?.caption && (
          <div className="mb-3 rounded-lg bg-[var(--background)] p-3 text-sm">
            {masterConfig.caption}
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs font-medium">
            <Crown className="h-3.5 w-3.5 text-master dark:text-master-foreground" />
            {batch.totalJobs} total
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {batch.completedJobs} done
          </span>
          {batch.failedJobs > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-500">
              <XCircle className="h-3.5 w-3.5" />
              {batch.failedJobs} failed
            </span>
          )}
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]">
              <Clock className="h-3.5 w-3.5" />
              {pending} pending
            </span>
          )}
        </div>
        {isActive && (
          <div className="mt-3">
            <ProgressBar progress={progress} />
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">{progress}% complete</div>
          </div>
        )}
      </div>

      {/* Video Grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Videos ({jobs.length})</h2>
          <div className="flex items-center gap-3">
            {selectableJobs.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm(`Approve all ${selectableJobs.length} videos?`)) return;
                  setPosting(true);
                  try {
                    const ids = selectableJobs.map(j => j.id);
                    // Try posting via Late API first
                    try {
                      const res = await fetch(`/api/templates/master/${id}/post`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jobIds: ids }),
                      });
                      const data = await res.json();
                      if (res.ok && data.summary?.posted > 0) {
                        showToast(`Approved & posted all ${data.summary.posted} videos!`, 'success');
                      } else {
                        showToast(`Approved all ${ids.length} videos!`, 'success');
                      }
                    } catch {
                      showToast(`Approved all ${ids.length} videos!`, 'success');
                    }
                    // Tag remaining as approved
                    await Promise.all(
                      ids.map((jobId) =>
                        fetch(`/api/templates/${jobId}/post-status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ postStatus: 'posted' }),
                        })
                      )
                    );
                    await loadBatch();
                  } catch {
                    showToast('Failed to approve all', 'error');
                  } finally {
                    setPosting(false);
                  }
                }}
                disabled={posting}
                className="flex items-center gap-1.5 rounded-lg bg-master px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 dark:text-master-foreground"
              >
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                Approve All ({selectableJobs.length})
              </button>
            )}
            {selectableJobs.length > 0 && (
              <button
                onClick={allSelected ? clearSelection : selectAll}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {allSelected ? 'Clear All' : 'Select All'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {jobs.map((job) => (
            <MasterJobCard
              key={job.id}
              job={job}
              modelName={job.modelId ? modelNameMap[job.modelId] : undefined}
              modelImageUrl={job.modelId ? modelImageMap[job.modelId] : undefined}
              isSelected={selectedJobIds.has(job.id)}
              onToggle={() => toggleJob(job.id)}
              onClick={() => setModalJob(job)}
              onApprove={() => handleSinglePost(job.id)}
              onReject={() => handleSingleReject(job.id)}
              onRepost={() => handleRepost(job.id)}
              onQuickRegenerate={() => handleQuickRegenerate(job.id)}
              onEditRegenerate={() => openRegenerateModal(job)}
              isApproving={busyJobIds.has(job.id)}
              isRejecting={false}
              isRegenerating={false}
            />
          ))}
        </div>
      </div>

      {/* Sticky Action Bar */}
      {selectedJobIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
            <div className="text-sm font-medium">
              {selectedJobIds.size} selected
            </div>
            <div className="flex-1" />
            <button
              onClick={handleRejectSelected}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject Selected
            </button>
            <button
              onClick={handlePostSelected}
              disabled={posting}
              className="flex items-center gap-1.5 rounded-lg bg-master px-5 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 dark:text-master-foreground"
            >
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              Approve Selected ({selectedJobIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {modalJob && (() => {
        const modelInfo = masterConfig?.models?.find((m) => m.modelId === modalJob.modelId);
        const signedImageUrl = modelInfo?.primaryImageUrl ? signedModelImages[modelInfo.primaryImageUrl] : undefined;
        const modelInfoWithSignedImage = modelInfo ? {
          ...modelInfo,
          primaryImageUrl: signedImageUrl || modelInfo.primaryImageUrl,
        } : undefined;
        return (
          <MasterJobModal
            job={modalJob}
            modelInfo={modelInfoWithSignedImage}
            onClose={() => setModalJob(null)}
            onPost={() => handleSinglePost(modalJob.id)}
            onRepost={() => handleRepost(modalJob.id)}
            onReject={() => handleSingleReject(modalJob.id)}
            onQuickRegenerate={() => handleQuickRegenerate(modalJob.id)}
            onEditRegenerate={() => openRegenerateModal(modalJob)}
            posting={busyJobIds.has(modalJob.id)}
            regenerating={false}
            postRecords={jobPosts[modalJob.id]}
          />
        );
      })()}

      {/* Regenerate Modal — image picker */}
      {regenerateJob && (() => {
        const modelInfo = masterConfig?.models?.find((m) => m.modelId === regenerateJob.modelId);
        const signedImageUrl = modelInfo?.primaryImageUrl ? signedModelImages[modelInfo.primaryImageUrl] : undefined;
        const modelInfoWithSignedImage = modelInfo ? {
          ...modelInfo,
          primaryImageUrl: signedImageUrl || modelInfo.primaryImageUrl,
        } : undefined;
        return (
          <RegenerateModal
            job={regenerateJob}
            modelInfo={modelInfoWithSignedImage}
            onClose={() => setRegenerateJob(null)}
            onRegenerate={handleEditRegenerate}
          />
        );
      })()}
    </div>
  );
}
