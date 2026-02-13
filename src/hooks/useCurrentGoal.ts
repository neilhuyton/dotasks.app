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
  id: string;                        // ← added
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: string | null;
  source: "cache" | "server";
}

export function useCurrentGoal() {
  const { userId } = useAuthStore();

  const query = trpc.weight.getCurrentGoal.useQuery(undefined, {
    enabled: !!userId,
    staleTime: 1000 * 30,     // 30 seconds
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });

  const { data, isSuccess, isLoading } = query;

  const [display, setDisplay] = useState<CurrentGoalDisplay | null>(null);

  // 1. Fast path: show cached goal immediately
  useEffect(() => {
    const cached = getCachedCurrentGoal();
    if (cached) {
      setDisplay({
        ...cached,
        source: "cache",
      });
    }
  }, []);

  // 2. Update with server data when available
  useEffect(() => {
    if (!isSuccess || !data) return;

    if (!data) {
      setDisplay(null);
      clearCurrentGoalCache();
      return;
    }

    const goalData = {
      id: data.id,                           // ← added
      goalWeightKg: data.goalWeightKg,
      goalSetAt: data.goalSetAt,
      reachedAt: data.reachedAt,
      source: "server" as const,
    };

    setDisplay(goalData);

    // Cache without the source field (source is only for runtime)
    saveCurrentGoal({
      id: data.id,
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
    isFetching: query.isFetching,
    error: query.error,
  };
}