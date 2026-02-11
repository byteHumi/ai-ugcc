'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TemplatePreset, MiniAppStep } from '@/types';

const CACHE_KEY = 'ai-ugc-presets';

function getCached(): TemplatePreset[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function setCache(presets: TemplatePreset[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(presets)); } catch {}
}

export function usePresets() {
  const [presets, setPresets] = useState<TemplatePreset[]>(getCached);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const mountedRef = useRef(true);

  const loadPresets = useCallback(async () => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 15_000);
    try {
      const res = await fetch('/api/template-presets', { signal: ac.signal });
      clearTimeout(timeout);
      if (!mountedRef.current) return;
      if (!res.ok) return;
      const data = await res.json();
      const arr: TemplatePreset[] = Array.isArray(data) ? data : [];
      setPresets(arr);
      setCache(arr);
    } catch {
      clearTimeout(timeout);
      // Silently ignore — cached data stays visible
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadPresets();
    return () => { mountedRef.current = false; };
  }, [loadPresets]);

  const savePreset = useCallback(async (name: string, pipeline: MiniAppStep[], description?: string) => {
    setIsSaving(true);
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 15_000);
    try {
      const res = await fetch('/api/template-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pipeline, description }),
        signal: ac.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Failed to save preset');
      // Add saved preset to local list immediately
      try {
        const saved = await res.json();
        if (saved && saved.id) {
          setPresets((prev) => {
            const next = [saved, ...prev.filter((p) => p.id !== saved.id)];
            setCache(next);
            return next;
          });
        }
      } catch {
        // If parsing fails, just refetch
        await loadPresets();
      }
    } catch (e) {
      clearTimeout(timeout);
      throw e; // Let caller show the error toast
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [loadPresets]);

  const deletePreset = useCallback(async (id: string) => {
    // Optimistic remove from UI
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setCache(next);
      return next;
    });
    try {
      await fetch(`/api/template-presets/${id}`, { method: 'DELETE' });
    } catch {
      // Revert on failure
      await loadPresets();
    }
  }, [loadPresets]);

  return { presets, isLoading, isSaving, savePreset, deletePreset, refresh: loadPresets };
}
