'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Profile, Account } from '@/types';
import { usePageVisibility } from './usePageVisibility';

const REFRESH_INTERVAL = 60_000;

// Module-level cache
let _profilesCache: Profile[] = [];
let _accountsCache: Account[] = [];
let _cacheTime = 0;

function getProfileIdFromAccount(account: Account): string | undefined {
  if (!account?.profileId) return undefined;
  if (typeof account.profileId === 'object') return account.profileId._id;
  return account.profileId;
}

export function useConnections() {
  const isPageVisible = usePageVisibility();
  const [profiles, setProfiles] = useState<Profile[]>(_profilesCache);
  const [accounts, setAccounts] = useState<Account[]>(_accountsCache);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    _profilesCache.length > 0 ? _profilesCache[0]._id : null,
  );
  const [isLoadingPage, setIsLoadingPage] = useState(_profilesCache.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const wasVisibleRef = useRef(isPageVisible);

  const loadConnections = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _profilesCache.length > 0 && now - _cacheTime < REFRESH_INTERVAL) {
      setProfiles(_profilesCache);
      setAccounts(_accountsCache);
      setSelectedProfileId((prev) => prev ?? (_profilesCache[0]?._id ?? null));
      setIsLoadingPage(false);
      return;
    }
    if (force) setRefreshing(true);
    try {
      const [profilesRes, accountsRes] = await Promise.all([
        fetch('/api/late/profiles', { cache: 'no-store' }),
        fetch('/api/late/accounts', { cache: 'no-store' }),
      ]);
      const profilesData = await profilesRes.json();
      const accountsData = await accountsRes.json();
      const p = profilesData.profiles || [];
      const a = accountsData.accounts || [];
      _profilesCache = p;
      _accountsCache = a;
      _cacheTime = Date.now();
      setProfiles(p);
      setAccounts(a);
      setSelectedProfileId((prev) => {
        if (!p.length) return null;
        if (!prev) return p[0]._id;
        return p.some((profile: Profile) => profile._id === prev) ? prev : p[0]._id;
      });
    } catch (e) {
      console.error('Failed to load connections:', e);
    } finally {
      setIsLoadingPage(false);
      if (force) setRefreshing(false);
    }
  }, []);

  // Initial load (uses cache if fresh)
  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // 60s baseline refresh
  useEffect(() => {
    if (!isPageVisible) return;
    const id = setInterval(() => loadConnections(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [isPageVisible, loadConnections]);

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = isPageVisible;
    if (!wasVisible && isPageVisible) {
      void loadConnections(true);
    }
  }, [isPageVisible, loadConnections]);

  const currentProfile = profiles.find((profile) => profile._id === selectedProfileId) || null;

  const profileAccounts = accounts.filter((account) => getProfileIdFromAccount(account) === currentProfile?._id);

  const tiktokAccounts = accounts.filter((a) => a.platform === 'tiktok');

  const refresh = useCallback(() => loadConnections(true), [loadConnections]);

  const setCurrentProfile = useCallback((profile: Profile | null) => {
    setSelectedProfileId(profile?._id ?? null);
  }, []);

  return {
    profiles,
    accounts,
    currentProfile,
    setCurrentProfile,
    profileAccounts,
    tiktokAccounts,
    isLoadingPage,
    refreshing,
    refresh,
  };
}
