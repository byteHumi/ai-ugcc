'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Job } from '@/types';

const ACTIVE_POLL_INTERVAL = 1_500;  // 1.5s when jobs are running
const IDLE_POLL_INTERVAL   = 30_000; // 30s baseline

function useJobsInternal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const lastSnapshotRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const loadJobs = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/jobs', { signal: ac.signal });
      if (!mountedRef.current) return;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];

      const snapshot = arr.map((j: Job) => `${j.id}:${j.status}:${j.step}`).join('|');
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setJobs(arr);
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error('Failed to load jobs:', e);
    }
  }, []);

  // Adaptive polling: fast when active, slow when idle
  const scheduleNext = useCallback(() => {
    if (!mountedRef.current) return;
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

      return current;
    });
  }, [loadJobs]);

  useEffect(() => {
    mountedRef.current = true;
    loadJobs().then(scheduleNext);

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadJobs, scheduleNext]);

  const forceRefresh = useCallback(async () => {
    lastSnapshotRef.current = '';
    await loadJobs();
    scheduleNext();
  }, [loadJobs, scheduleNext]);

  return { jobs, refresh: forceRefresh };
}

type JobsContextType = { jobs: Job[]; refresh: () => Promise<void> };

const JobsContext = createContext<JobsContextType | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const value = useJobsInternal();
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobs must be used within a JobsProvider');
  return ctx;
}
