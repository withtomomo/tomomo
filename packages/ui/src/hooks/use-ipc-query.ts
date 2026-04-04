import { useState, useEffect, useRef, useCallback } from "react";

export function useIpcQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const hasLoaded = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Serialize deps to a stable string so the effect has a fixed-length dependency array
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    if (!hasLoaded.current) {
      setLoading(true);
    }
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
          hasLoaded.current = true;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // depsKey encodes the caller's dependency values as a stable string
  }, [tick, depsKey]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, refetch };
}
