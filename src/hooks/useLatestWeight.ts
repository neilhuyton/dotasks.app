// src/hooks/useLatestWeight.ts

import { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { getCachedLatestWeight } from "../utils/weightCache";

interface LatestWeightDisplay {
  weightKg: number;
  createdAt: string;
  source: "cache" | "server";
}

export function useLatestWeight() {
  const { data: weights, isSuccess, isFetching } = trpc.weight.getWeights.useQuery(undefined, {
    staleTime: 1000 * 15, // match useWeightList
  });

  const [latest, setLatest] = useState<LatestWeightDisplay | null>(null);

  useEffect(() => {
    if (isSuccess && weights) {
      if (weights.length === 0) {
        setLatest(null);
        return;
      }

      const sorted = [...weights].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const mostRecent = sorted[0];

      setLatest({
        weightKg: mostRecent.weightKg,
        createdAt: mostRecent.createdAt,
        source: "server",
      });
    } else {
      // Fallback to cache while loading or error
      const cached = getCachedLatestWeight();
      if (cached) {
        setLatest({
          weightKg: cached.weightKg,
          createdAt: cached.createdAt,
          source: "cache",
        });
      } else {
        setLatest(null);
      }
    }
  }, [isSuccess, weights, isFetching]); // isFetching helps catch loading→success transitions

  const isFromCache = latest?.source === "cache";
  const isServerLoaded = isSuccess;

  return {
    latestWeight: latest,
    isFromCache,
    isServerLoaded,
  };
}