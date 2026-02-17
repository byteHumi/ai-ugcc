'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyticsAccount, AnalyticsOverview, AnalyticsMediaItem } from '@/types';
import { usePageVisibility } from './usePageVisibility';

const REFRESH_INTERVAL = 60_000;
const BACKGROUND_INTERVAL = 120_000;

// Module-level cache
let _overviewCache: AnalyticsOverview | null = null;
let _accountsCache: AnalyticsAccount[] = [];
let _mediaCache: AnalyticsMediaItem[] = [];
let _cacheTime = 0;

export function useAnalytics() {
  const isPageVisible = usePageVisibility();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(_overviewCache);
  const [accounts, setAccounts] = useState<AnalyticsAccount[]>(_accountsCache);
  const [mediaItems, setMediaItems] = useState<AnalyticsMediaItem[]>(_mediaCache);
  const [loading, setLoading] = useState(_accountsCache.length === 0);
  const [syncing, setSyncing] = useState(false);
  const wasVisibleRef = useRef(isPageVisible);

  const loadData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _overviewCache && now - _cacheTime < REFRESH_INTERVAL) {
      setOverview(_overviewCache);
      setAccounts(_accountsCache);
      setMediaItems(_mediaCache);
      setLoading(false);
      return;
    }

    try {
      const [overviewRes, accountsRes, mediaRes] = await Promise.all([
        fetch('/api/analytics/overview', { cache: 'no-store' }),
        fetch('/api/analytics/accounts', { cache: 'no-store' }),
        fetch('/api/analytics/media?limit=100', { cache: 'no-store' }),
      ]);

      const overviewData = await overviewRes.json();
      const accountsData = await accountsRes.json();
      const mediaData = await mediaRes.json();

      _overviewCache = overviewData;
      _accountsCache = accountsData.accounts || [];
      _mediaCache = mediaData.items || [];
      _cacheTime = Date.now();

      setOverview(overviewData);
      setAccounts(accountsData.accounts || []);
      setMediaItems(mediaData.items || []);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling - faster when visible, slower when hidden
  useEffect(() => {
    const interval = isPageVisible ? REFRESH_INTERVAL : BACKGROUND_INTERVAL;
    const id = setInterval(() => loadData(true), interval);
    return () => clearInterval(id);
  }, [isPageVisible, loadData]);

  // Re-fetch on tab focus
  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = isPageVisible;
    if (!wasVisible && isPageVisible) {
      void loadData(true);
    }
  }, [isPageVisible, loadData]);

  const addAccount = useCallback(async (platform: string, username: string) => {
    try {
      setSyncing(true);
      const res = await fetch('/api/analytics/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add account');
      await loadData(true);
      return data;
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  const removeAccount = useCallback(async (id: string) => {
    await fetch(`/api/analytics/accounts/${id}`, { method: 'DELETE' });
    await loadData(true);
  }, [loadData]);

  const refreshAccount = useCallback(async (id: string) => {
    try {
      setSyncing(true);
      await fetch(`/api/analytics/accounts/${id}/refresh`, { method: 'POST' });
      await loadData(true);
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  const refreshAll = useCallback(async () => {
    try {
      setSyncing(true);
      await fetch('/api/analytics/refresh', { method: 'POST' });
      await loadData(true);
    } finally {
      setSyncing(false);
    }
  }, [loadData]);

  return {
    overview,
    accounts,
    mediaItems,
    loading,
    syncing,
    addAccount,
    removeAccount,
    refreshAccount,
    refreshAll,
    reload: () => loadData(true),
  };
}
