// src/hooks/useLatestWeight.ts

import { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { getCachedLatestWeight, saveLatestWeight } from "../utils/weightCache"; // assuming you also export saveLatestWeight

interface LatestWeightDisplay {
  weightKg: number;
  createdAt: string;
  source: "cache" | "server";
}

export function useLatestWeight() {
  const query = trpc.weight.getWeights.useQuery(undefined, {
    staleTime: 1000 * 15, // 15s – short enough to feel fresh
    gcTime: 1000 * 60 * 5, // 5 min – keep around longer
  });

  const { data: weights, isSuccess, isLoading, isFetching } = query;

  const [display, setDisplay] = useState<LatestWeightDisplay | null>(null);

  // 1. Initialize from cache on mount (fast first paint)
  useEffect(() => {
    const cached = getCachedLatestWeight();
    if (cached) {
      setDisplay({
        weightKg: cached.weightKg,
        createdAt: cached.createdAt,
        source: "cache",
      });
    }
  }, []); // only on mount

  // 2. Update when we get fresh server data
  useEffect(() => {
    if (!isSuccess || !weights) return;

    if (weights.length === 0) {
      setDisplay(null);
      // Optionally: clear cache too
      // clearLatestWeightCache();
      return;
    }

    const sorted = [...weights].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latest = sorted[0];

    setDisplay({
      weightKg: latest.weightKg,
      createdAt: latest.createdAt,
      source: "server",
    });

    // Also keep the cache in sync with latest server value
    saveLatestWeight({
      weightKg: latest.weightKg,
      createdAt: latest.createdAt,
    });
  }, [isSuccess, weights]); // only when server data meaningfully changes

  // Optional: During background refetch, keep showing current display (no flicker)
  // We don't downgrade to cache again unless server fetch fails completely

  const isFromCache = display?.source === "cache";
  // isServerLoaded = we have confirmed server data at least once and are not in initial loading
  const isServerLoaded = isSuccess && !isLoading && display?.source === "server";

  return {
    latestWeight: display,
    isFromCache,
    isServerLoaded,
    // Bonus: expose these if you want richer status in UI
    isLoading,
    isFetching, // background fetch in progress
    error: query.error,
  };
}