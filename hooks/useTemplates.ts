'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TemplateJob } from '@/types';

const ACTIVE_POLL_INTERVAL = 1_500;  // 1.5s when jobs are running
const IDLE_POLL_INTERVAL   = 30_000; // 30s baseline
const CACHE_KEY = 'ai-ugc-template-jobs';

function getCachedJobs(): TemplateJob[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function setCachedJobs(jobs: TemplateJob[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(jobs)); } catch {}
}

export function useTemplates() {
  const [jobs, setJobs] = useState<TemplateJob[]>(getCachedJobs);
  const lastSnapshotRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const loadJobs = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/templates', { signal: ac.signal });
      if (!mountedRef.current) return;
      const data = await res.json();
      const arr: TemplateJob[] = Array.isArray(data) ? data : [];

      const snapshot = arr
        .map((j) => `${j.id}:${j.status}:${j.step}:${j.currentStep}:${j.signedUrl || ''}`)
        .join('|');

      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setJobs(arr);
        setCachedJobs(arr);
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error('Failed to load template jobs:', e);
    }
  }, []);

  // Adaptive polling: fast when active, slow when idle, stops when unmounted
  const scheduleNext = useCallback(() => {
    if (!mountedRef.current) return;
    // Read current jobs from ref-stable state via functional update trick
    setJobs((current) => {
      const hasActive = current.some(
        (j) => j.status === 'queued' || j.status === 'processing',
      );
      const delay = hasActive ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await loadJobs();
        scheduleNext();
      }, delay);

      return current; // no state change
    });
  }, [loadJobs]);

  // Mount: load immediately, start adaptive loop
  useEffect(() => {
    mountedRef.current = true;
    loadJobs().then(scheduleNext);

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadJobs, scheduleNext]);

  const refresh = useCallback(async () => {
    lastSnapshotRef.current = '';
    await loadJobs();
    scheduleNext(); // re-kick adaptive timer after manual refresh
  }, [loadJobs, scheduleNext]);

  return { jobs, refresh };
}
