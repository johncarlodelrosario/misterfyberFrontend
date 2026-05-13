import { useState, useEffect, useCallback, useRef } from "react";

interface UseOptimizedQueryOptions<T> {
  queryFn: () => Promise<T>;
  cacheKey: string;
  enabled?: boolean;
  cacheTime?: number; // in milliseconds
  staleTime?: number; // in milliseconds
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<any>>();

export function useOptimizedQuery<T>({
  queryFn,
  cacheKey,
  enabled = true,
  cacheTime = 5 * 60 * 1000, // 5 minutes
  staleTime = 30 * 1000, // 30 seconds
}: UseOptimizedQueryOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return;
      if (fetchingRef.current) return;

      // Check cache
      const cached = globalCache.get(cacheKey);
      if (!force && cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        return;
      }

      fetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const result = await queryFn();
        if (isMounted.current) {
          setData(result);
          globalCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }
      } catch (err) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
        fetchingRef.current = false;
      }
    },
    [queryFn, cacheKey, enabled, cacheTime],
  );

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    // Auto-refresh based on staleTime
    const interval = setInterval(() => {
      fetchData(true);
    }, staleTime);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchData, staleTime]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, error, refetch };
}
