'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ModelAccountMapping } from '@/types';

export function useModelAccounts(modelId: string | null) {
  const [mappings, setMappings] = useState<ModelAccountMapping[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMappings = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/models/${modelId}/accounts`);
      if (res.ok) {
        const data = await res.json();
        setMappings(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load model accounts:', e);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const saveMappings = useCallback(async (accounts: { lateAccountId: string; platform: string }[]) => {
    if (!modelId) return;
    try {
      const res = await fetch(`/api/models/${modelId}/accounts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      });
      if (res.ok) {
        const data = await res.json();
        setMappings(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to save model accounts:', e);
    }
  }, [modelId]);

  return { mappings, loading, saveMappings, refresh: loadMappings };
}
