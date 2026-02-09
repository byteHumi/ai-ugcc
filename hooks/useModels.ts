'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Model, ModelImage } from '@/types';

const REFRESH_INTERVAL = 60_000;

// Module-level cache
let _cache: Model[] = [];
let _cacheTime = 0;

export function useModels() {
  const [models, setModels] = useState<Model[]>(_cache);
  const [modelImages, setModelImages] = useState<ModelImage[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(_cache.length === 0);

  const loadModels = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && _cache.length > 0 && now - _cacheTime < REFRESH_INTERVAL) {
      setModels(_cache);
      setIsLoadingPage(false);
      return;
    }
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      const result = Array.isArray(data) ? data : [];
      _cache = result;
      _cacheTime = Date.now();
      setModels(result);
    } catch (e) {
      console.error('Failed to load models:', e);
    } finally {
      setIsLoadingPage(false);
    }
  }, []);

  const loadModelImages = useCallback(async (modelId: string) => {
    try {
      const res = await fetch(`/api/models/${modelId}/images`);
      const data = await res.json();
      setModelImages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load model images:', e);
    }
  }, []);

  // Initial load (uses cache if fresh)
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // 60s baseline refresh
  useEffect(() => {
    const id = setInterval(() => loadModels(true), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [loadModels]);

  const refresh = useCallback(() => loadModels(true), [loadModels]);

  return { models, modelImages, setModelImages, isLoadingPage, refresh, loadModelImages };
}
