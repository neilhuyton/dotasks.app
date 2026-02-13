// src/hooks/useWeightGoalMutations.ts

import { useState } from "react";
import { trpc } from "../trpc";
import { formatDate } from "../utils/date";
import type { WeightGoal } from "./useWeightGoalForm";

import { getCachedCurrentGoal, saveCurrentGoal } from "../utils/goalCache";

interface UseWeightGoalMutationsProps {
  currentGoal: WeightGoal | null;
  isFromCache: boolean;
  isServerLoaded: boolean;
}

type OptimisticContext = {
  previousGoals?: WeightGoal[];
};

export function useWeightGoalMutations({
  currentGoal,
  isFromCache,
  isServerLoaded,
}: UseWeightGoalMutationsProps) {
  const [optimisticWeight, setOptimisticWeight] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const cachedGoal = getCachedCurrentGoal();
  const persistedWeight = cachedGoal?.goalWeightKg ?? null;

  // Shared success handler
  const handleSuccess = (goal?: WeightGoal) => {
    setOptimisticWeight(null);
    if (goal) {
      saveCurrentGoal({
        id: goal.id,
        goalWeightKg: goal.goalWeightKg,
        goalSetAt: goal.goalSetAt,
        reachedAt: goal.reachedAt,
      });
    }
    utils.weight.getCurrentGoal.invalidate();
    utils.weight.getGoals.invalidate();
  };

  // Shared error handler
  const handleError = (_err: unknown, _vars: unknown, context?: OptimisticContext) => {
    setOptimisticWeight(null);
    if (context?.previousGoals) {
      utils.weight.getGoals.setData(undefined, context.previousGoals);
    }
    // Keep localStorage value (user intent preserved)
  };

  const updateGoal = trpc.weight.updateGoal.useMutation({
    onMutate: async ({ goalId, goalWeightKg }) => {
      setOptimisticWeight(goalWeightKg);

      const previousGoals = utils.weight.getGoals.getData();
      if (previousGoals && currentGoal) {
        utils.weight.getGoals.setData(
          undefined,
          previousGoals.map(g => (g.id === goalId ? { ...g, goalWeightKg } : g)),
        );
      }

      saveCurrentGoal({
        id: currentGoal?.id ?? `local-${Date.now()}`,
        goalWeightKg,
        goalSetAt: currentGoal?.goalSetAt ?? new Date().toISOString(),
        reachedAt: null,
      });

      return { previousGoals };
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const createGoal = trpc.weight.setGoal.useMutation({
    onMutate: async ({ goalWeightKg }) => {
      setOptimisticWeight(goalWeightKg);

      const previousGoals = utils.weight.getGoals.getData() ?? [];
      const tempGoal: WeightGoal = {
        id: `temp-${Date.now()}`,
        goalWeightKg,
        goalSetAt: new Date().toISOString(),
        reachedAt: null,
      };

      utils.weight.getGoals.setData(undefined, [tempGoal, ...previousGoals]);
      saveCurrentGoal(tempGoal);

      return { previousGoals };
    },
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const isPending = updateGoal.isPending || createGoal.isPending;

  const displayedWeight =
    optimisticWeight ?? persistedWeight ?? currentGoal?.goalWeightKg ?? null;

  const statusText = (() => {
    if (optimisticWeight !== null) return "Saving new goal...";
    if (displayedWeight === null) return "";

    const source =
      optimisticWeight !== null
        ? "optimistic"
        : persistedWeight !== null && persistedWeight === displayedWeight
          ? "local"
          : "server";

    const base = currentGoal ?? cachedGoal;
    if (!base) return "Just saved locally";

    const parts: string[] = [`Set on ${formatDate(base.goalSetAt)}`];
    if (base.reachedAt) parts.push(` • Reached on ${formatDate(base.reachedAt)}`);

    if (source === "local") parts.push(" • local");
    else if (isFromCache) parts.push(" • cached");
    else if (isServerLoaded) parts.push(" • synced");

    return parts.join("");
  })();

  return {
    optimisticWeight,
    setOptimisticWeight,
    updateGoal,
    createGoal,
    isPending,
    displayedWeight,
    statusText,
  };
}