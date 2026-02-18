'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyticsAccount, AnalyticsOverview, AnalyticsMediaItem } from '@/types';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// Module-level cache
let _overviewCache: AnalyticsOverview | null = null;
let _accountsCache: AnalyticsAccount[] = [];
let _mediaCache: AnalyticsMediaItem[] = [];
let _cacheTime = 0;

export function useAnalytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(_overviewCache);
  const [accounts, setAccounts] = useState<AnalyticsAccount[]>(_accountsCache);
  const [mediaItems, setMediaItems] = useState<AnalyticsMediaItem[]>(_mediaCache);
  const [loading, setLoading] = useState(_accountsCache.length === 0);
  const [syncing, setSyncing] = useState(false);
  const autoRefreshChecked = useRef(false);

  // Load data from our own DB (cheap, no external API calls)
  const loadData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _overviewCache && now - _cacheTime < 30_000) {
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
      return _accountsCache;
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load from DB on mount (no external API calls)
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh once if any account hasn't been synced in 24hrs
  useEffect(() => {
    if (loading || autoRefreshChecked.current) return;
    autoRefreshChecked.current = true;

    if (accounts.length === 0) return;
    const now = Date.now();
    const needsRefresh = accounts.some(a => {
      if (!a.lastSyncedAt) return true;
      return now - new Date(a.lastSyncedAt).getTime() > TWENTY_FOUR_HOURS;
    });

    if (needsRefresh) {
      setSyncing(true);
      fetch('/api/analytics/refresh?mode=quick', { method: 'POST' })
        .then(() => loadData(true))
        .catch(e => console.error('Auto-refresh failed:', e))
        .finally(() => setSyncing(false));
    }
  }, [loading, accounts, loadData]);

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
