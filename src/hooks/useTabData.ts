import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchTabData } from '../lib/api';

interface UseTabDataOptions {
  tabName: string;
  activeTab: string;
  enabled?: boolean;
  params?: Record<string, any>;
  cacheKey?: string;
}

interface UseTabDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const tabDataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000;

export function useTabData<T = any>({ tabName, activeTab, enabled = true, params, cacheKey }: UseTabDataOptions): UseTabDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchKey = useRef<string>('');

  const isActive = activeTab === tabName || 
    (tabName === 'dashboard' && activeTab === 'dashboard') ||
    (tabName === 'wm-dashboard' && activeTab === 'wm-dashboard') ||
    (tabName === 'wm-districts' && activeTab === 'wm-districts') ||
    (tabName === 'wm-products' && activeTab === 'wm-products');

  const fetchKey = `${tabName}:${JSON.stringify(params || {})}:${cacheKey || ''}`;

  const doFetch = useCallback(async () => {
    if (!enabled) return;

    const cached = tabDataCache.get(fetchKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    if (lastFetchKey.current === fetchKey && data) return;

    setLoading(true);
    setError(null);

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const result = await fetchTabData<T>(tabName, params);
      tabDataCache.set(fetchKey, { data: result, timestamp: Date.now() });
      setData(result);
      lastFetchKey.current = fetchKey;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
    }
  }, [tabName, fetchKey, enabled]);

  useEffect(() => {
    if (isActive && enabled) {
      doFetch();
    }
  }, [isActive, doFetch, enabled]);

  const refetch = useCallback(() => {
    tabDataCache.delete(fetchKey);
    lastFetchKey.current = '';
    doFetch();
  }, [fetchKey, doFetch]);

  return { data, loading, error, refetch };
}

export function invalidateTabCache(tabName?: string) {
  if (tabName) {
    for (const key of tabDataCache.keys()) {
      if (key.startsWith(tabName + ':')) tabDataCache.delete(key);
    }
  } else {
    tabDataCache.clear();
  }
}
