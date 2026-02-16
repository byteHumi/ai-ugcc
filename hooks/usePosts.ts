'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Post } from '@/types';
import { derivePostStatus, isActiveStatus, postMatchesFilter } from '@/lib/postStatus';

const ACTIVE_POLL_INTERVAL = 2_000;   // 2s when posts are publishing
const IDLE_POLL_INTERVAL   = 60_000;  // 60s baseline
const CACHE_KEY = 'ai-ugc-posts-v2';

function getCachedPosts(): Post[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return null;
}

function setCachedPosts(posts: Post[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(posts)); } catch {}
}

export function usePosts() {
  const [postsFilter, setPostsFilter] = useState<string>('all');

  // Initialize from cache instantly to avoid blocking UI on slow network
  const [postsAll, setPostsAll] = useState<Post[]>(() => getCachedPosts() || []);
  const [isLoadingPage, setIsLoadingPage] = useState(() => {
    const cached = getCachedPosts();
    return !(cached && cached.length > 0);
  });

  const lastSnapshotRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const postsRef = useRef(postsAll);
  postsRef.current = postsAll;

  const loadPosts = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const timeout = setTimeout(() => ac.abort(), 15_000);

    try {
      const endpoint = '/api/late/posts?limit=80';
      const res = await fetch(endpoint, { signal: ac.signal });
      clearTimeout(timeout);
      if (!mountedRef.current) return;
      if (!res.ok) return; // silently skip bad responses
      const data = await res.json();
      const arr: Post[] = data.posts || [];

      // Snapshot: only update state if data actually changed
      const snapshot = arr.map((p) => {
        const normalizedStatus = p.derivedStatus || derivePostStatus(p);
        const platformState = p.platforms
          ?.map((platform) => `${platform.platform}:${platform.status || ''}:${platform.platformPostUrl || ''}`)
          .sort()
          .join(',') || '';
        return [
          p._id,
          p.status || '',
          normalizedStatus,
          p.updatedAt || '',
          p.publishedAt || '',
          p.scheduledFor || '',
          platformState,
          p.content?.slice(0, 40) || '',
        ].join(':');
      }).join('|');

      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setPostsAll(arr);
        setCachedPosts(arr);
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
    const hasActive = postsRef.current.some((post) => {
      const status = post.derivedStatus || derivePostStatus(post);
      return isActiveStatus(status)
        || post.platforms?.some((platform) => isActiveStatus(platform.status));
    });
    const delay = hasActive ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      await loadPosts();
      scheduleNext();
    }, delay);
  }, [loadPosts]);

  // Initial load (cache stays visible while network refresh runs)
  useEffect(() => {
    if ((getCachedPosts() || []).length === 0) setIsLoadingPage(true);
    loadPosts().then(scheduleNext);
  }, [loadPosts, scheduleNext]);

  // Mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const posts = useMemo(
    () => postsAll.filter((post) => postMatchesFilter(post, postsFilter)),
    [postsAll, postsFilter]
  );

  const refresh = useCallback(async () => {
    lastSnapshotRef.current = '';
    await loadPosts();
    scheduleNext();
  }, [loadPosts, scheduleNext]);

  return { posts, postsFilter, setPostsFilter, isLoadingPage, refresh };
}
