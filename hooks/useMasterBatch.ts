'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineBatch, TemplateJob } from '@/types';

const ACTIVE_POLL = 3_000;
const IDLE_POLL = 30_000;

export function useMasterBatch(batchId: string) {
  const [batch, setBatch] = useState<(PipelineBatch & { jobs?: TemplateJob[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBatch = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`/api/pipeline-batches/${batchId}`, { cache: 'no-store' });
      if (!mountedRef.current) return;
      if (!res.ok) return;
      const data = await res.json();
      setBatch(data);
    } catch {}
    finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [batchId]);

  // Polling
  useEffect(() => {
    mountedRef.current = true;
    loadBatch(true);

    const schedule = () => {
      if (!mountedRef.current) return;
      const isActive = batch?.status === 'pending' || batch?.status === 'processing';
      const delay = isActive ? ACTIVE_POLL : IDLE_POLL;
      timerRef.current = setTimeout(async () => {
        await loadBatch();
        schedule();
      }, delay);
    };

    // Start polling after initial load
    const t = setTimeout(schedule, 1000);

    return () => {
      mountedRef.current = false;
      clearTimeout(t);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [batchId, loadBatch, batch?.status]);

  const postSelected = useCallback(async (jobIds: string[]) => {
    setPosting(true);
    try {
      const res = await fetch(`/api/templates/master/${batchId}/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds }),
      });
      const data = await res.json();
      await loadBatch();
      return data;
    } finally {
      setPosting(false);
    }
  }, [batchId, loadBatch]);

  const setJobPostStatus = useCallback(async (jobId: string, postStatus: 'posted' | 'rejected') => {
    try {
      await fetch(`/api/templates/${jobId}/post-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postStatus }),
      });
      await loadBatch();
    } catch {}
  }, [loadBatch]);

  return { batch, loading, posting, postSelected, setJobPostStatus, refresh: loadBatch };
}
