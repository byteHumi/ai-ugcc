'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Post } from '@/types';

const ACTIVE_POLL_INTERVAL = 2_000;   // 2s when posts are publishing
const IDLE_POLL_INTERVAL   = 60_000;  // 60s baseline
const CACHE_KEY = 'ai-ugc-posts';

function getCachedPosts(): { posts: Post[]; filter: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.posts)) return parsed;
    }
  } catch {}
  return null;
}

function setCachedPosts(posts: Post[], filter: string) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ posts, filter })); } catch {}
}

export function usePosts() {
  const [postsFilter, setPostsFilter] = useState<string>('all');

  // Initialize from cache if filter matches
  const [posts, setPosts] = useState<Post[]>(() => {
    const cached = getCachedPosts();
    return cached && cached.filter === 'all' ? cached.posts : [];
  });
  const [isLoadingPage, setIsLoadingPage] = useState(() => {
    const cached = getCachedPosts();
    return !(cached && cached.filter === 'all' && cached.posts.length > 0);
  });

  const lastSnapshotRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const filterRef = useRef(postsFilter);
  filterRef.current = postsFilter;

  const loadPosts = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const timeout = setTimeout(() => ac.abort(), 15_000);

    try {
      let endpoint = '/api/late/posts?limit=50';
      if (filterRef.current !== 'all') endpoint += `&status=${filterRef.current}`;
      const res = await fetch(endpoint, { signal: ac.signal });
      clearTimeout(timeout);
      if (!mountedRef.current) return;
      if (!res.ok) return; // silently skip bad responses
      const data = await res.json();
      const arr: Post[] = data.posts || [];

      // Snapshot: only update state if data actually changed
      const snapshot = arr.map((p) => {
        const pStatus = p.platforms?.map((pl) => `${pl.platform}:${pl.status}`).join(',') || '';
        return `${p._id}:${pStatus}:${p.content?.slice(0, 20) || ''}`;
      }).join('|');

      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setPosts(arr);
        setCachedPosts(arr, filterRef.current);
      }
    } catch {
      clearTimeout(timeout);
      // Silently ignore — cached data stays visible
    } finally {
      if (mountedRef.current) setIsLoadingPage(false);
    }
  }, []);

  // Adaptive polling
  const scheduleNext = useCallback(() => {
    if (!mountedRef.current) return;
    setPosts((current) => {
      const hasActive = current.some((p) => {
        const status = p.platforms?.[0]?.status || '';
        return status === 'publishing' || status === 'processing' || status === 'in_progress' || status === 'pending';
      });
      const delay = hasActive ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await loadPosts();
        scheduleNext();
      }, delay);

      return current;
    });
  }, [loadPosts]);

  // On filter change: reset snapshot, reload
  useEffect(() => {
    lastSnapshotRef.current = '';
    const cached = getCachedPosts();
    if (cached && cached.filter === postsFilter && cached.posts.length > 0) {
      setPosts(cached.posts);
      setIsLoadingPage(false);
    } else {
      setIsLoadingPage(true);
    }
    loadPosts().then(scheduleNext);
  }, [postsFilter, loadPosts, scheduleNext]);

  // Mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    lastSnapshotRef.current = '';
    await loadPosts();
    scheduleNext();
  }, [loadPosts, scheduleNext]);

  return { posts, postsFilter, setPostsFilter, isLoadingPage, refresh };
}
