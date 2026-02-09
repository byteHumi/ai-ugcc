'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Post } from '@/types';

const REFRESH_INTERVAL = 60_000;
const ACTIVE_POLL_INTERVAL = 5_000;

// Module-level cache (keyed by filter)
const _cache: Record<string, { data: Post[]; time: number }> = {};

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsFilter, setPostsFilter] = useState<string>('all');
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const activePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPosts = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = _cache[postsFilter];
    if (!force && cached && now - cached.time < REFRESH_INTERVAL) {
      setPosts(cached.data);
      setIsLoadingPage(false);
      return;
    }
    try {
      let endpoint = '/api/late/posts?limit=50';
      if (postsFilter !== 'all') endpoint += `&status=${postsFilter}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const result = data.posts || [];
      _cache[postsFilter] = { data: result, time: Date.now() };
      setPosts(result);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setIsLoadingPage(false);
    }
  }, [postsFilter]);

  // Load on mount and filter change (uses cache if fresh)
  useEffect(() => {
    const cached = _cache[postsFilter];
    if (cached && Date.now() - cached.time < REFRESH_INTERVAL) {
      setPosts(cached.data);
      setIsLoadingPage(false);
    } else {
      setIsLoadingPage(true);
      loadPosts();
    }
  }, [postsFilter, loadPosts]);

  // 60s baseline refresh
  useEffect(() => {
    const id = setInterval(() => loadPosts(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [loadPosts]);

  // Fast poll when posts are publishing
  useEffect(() => {
    const hasPublishing = posts.some((p) => {
      const status = p.platforms?.[0]?.status || '';
      return status === 'publishing' || status === 'processing' || status === 'in_progress' || status === 'pending';
    });
    if (hasPublishing && !activePollRef.current) {
      activePollRef.current = setInterval(() => loadPosts(true), ACTIVE_POLL_INTERVAL);
    } else if (!hasPublishing && activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }
    return () => {
      if (activePollRef.current) {
        clearInterval(activePollRef.current);
        activePollRef.current = null;
      }
    };
  }, [posts, loadPosts]);

  const refresh = useCallback(() => {
    // Invalidate all filter caches
    Object.keys(_cache).forEach((k) => delete _cache[k]);
    return loadPosts(true);
  }, [loadPosts]);

  return { posts, postsFilter, setPostsFilter, isLoadingPage, refresh };
}
