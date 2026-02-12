// src/hooks/useCurrentGoal.ts

import { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { useAuthStore } from "../store/authStore";
import {
  getCachedCurrentGoal,
  saveCurrentGoal,
  clearCurrentGoalCache,
} from "../utils/goalCache";

interface CurrentGoalDisplay {
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: string | null;
  source: "cache" | "server";
}

export function useCurrentGoal() {
  const { userId } = useAuthStore();

  const query = trpc.weight.getCurrentGoal.useQuery(undefined, {
    enabled: !!userId,
    staleTime: 1000 * 30,     // 30 seconds – goals change less often than weights
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

  const { data, isSuccess, isLoading } = query;

  const [display, setDisplay] = useState<CurrentGoalDisplay | null>(null);

  // 1. Fast path: show cached goal immediately on mount
  useEffect(() => {
    const cached = getCachedCurrentGoal();
    if (cached) {
      setDisplay({
        ...cached,
        source: "cache",
      });
    }
  }, []); // only once

  // 2. When we get fresh server data → update display + cache
  useEffect(() => {
    if (!isSuccess || !data) return;

    if (!data) {
      // No current goal exists on server
      setDisplay(null);
      clearCurrentGoalCache();
      return;
    }

    setDisplay({
      goalWeightKg: data.goalWeightKg,
      goalSetAt: data.goalSetAt,
      reachedAt: data.reachedAt,
      source: "server",
    });

    // Keep cache in sync
    saveCurrentGoal({
      goalWeightKg: data.goalWeightKg,
      goalSetAt: data.goalSetAt,
      reachedAt: data.reachedAt,
    });
  }, [isSuccess, data]);

  const isFromCache = display?.source === "cache";
  const isServerLoaded = isSuccess && !isLoading && display?.source === "server";

  return {
    currentGoal: display,
    isLoading: query.isLoading,
    isFromCache,
    isServerLoaded,
    // Optional – useful for more detailed status messages
    isFetching: query.isFetching,
    error: query.error,
  };
}