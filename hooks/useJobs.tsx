'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import type { Job } from '@/types';

const REFRESH_INTERVAL = 60_000;
const ACTIVE_POLL_INTERVAL = 2_000;

function useJobsInternal() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const activePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSnapshotRef = useRef('');

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      // Only update state if data actually changed (avoids video element remounts)
      const snapshot = JSON.stringify(arr.map((j: Job) => `${j.id}:${j.status}:${j.step}`));
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setJobs(arr);
      }
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // 60s baseline refresh
  useEffect(() => {
    const id = setInterval(loadJobs, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [loadJobs]);

  // Fast poll when jobs are active
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'processing');
    if (hasActive && !activePollRef.current) {
      activePollRef.current = setInterval(loadJobs, ACTIVE_POLL_INTERVAL);
    } else if (!hasActive && activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }
    return () => {
      if (activePollRef.current) {
        clearInterval(activePollRef.current);
        activePollRef.current = null;
      }
    };
  }, [jobs, loadJobs]);

  const forceRefresh = useCallback(async () => {
    lastSnapshotRef.current = ''; // invalidate so next fetch always updates
    await loadJobs();
  }, [loadJobs]);

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
