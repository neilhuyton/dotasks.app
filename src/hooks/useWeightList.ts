// src/hooks/useWeightList.ts

import { trpc } from "../trpc";
import { formatDate } from "@/utils/date";
import {
  getCachedLatestWeight,
  saveLatestWeight,
  clearLatestWeightCache,
} from "@/utils/weightCache";

export function useWeightList() {
  const utils = trpc.useUtils();

  const {
    data: weightsRaw,
    isLoading,
    isError,
    error,
    refetch, // ← important for explicit refetch after delete
  } = trpc.weight.getWeights.useQuery(undefined, {
    staleTime: 1000 * 15, // 15 seconds — short enough to feel fresh after mutations
  });

  // Whenever fresh server data arrives, update the quick cache
  if (weightsRaw && weightsRaw.length > 0) {
    const sorted = [...weightsRaw].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latest = sorted[0];
    saveLatestWeight({
      weightKg: latest.weightKg,
      createdAt: latest.createdAt,
    });
  }

  // Sorted descending for the history list
  const weights = weightsRaw
    ? [...weightsRaw].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : undefined;

  const cachedLatest = getCachedLatestWeight();

  const latestWeight = weights?.[0] ??
    (cachedLatest
      ? {
          id: "cached",
          weightKg: cachedLatest.weightKg,
          createdAt: cachedLatest.createdAt,
        }
      : undefined);

  const deleteMutation = trpc.weight.delete.useMutation({
    async onMutate(variables: { weightId: string }) {
      await utils.weight.getWeights.cancel();
      const previous = utils.weight.getWeights.getData();
      if (previous) {
        utils.weight.getWeights.setData(
          undefined,
          previous.filter(w => w.id !== variables.weightId)
        );
      }
      return { previousWeights: previous };
    },

    onSuccess: (_, variables) => {
      refetch();

      utils.weight.getWeights.invalidate();

      const currentData = utils.weight.getWeights.getData();
      if (currentData) {
        const remaining = currentData.filter(w => w.id !== variables.weightId);
        if (remaining.length > 0) {
          const newLatest = remaining.reduce((a, b) =>
            new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime() ? b : a
          );
          saveLatestWeight({
            weightKg: newLatest.weightKg,
            createdAt: newLatest.createdAt,
          });
        } else {
          clearLatestWeightCache();
        }
      } else {
        clearLatestWeightCache();
      }
    },

    onError: (err, _variables, context) => {
      if (context?.previousWeights) {
        utils.weight.getWeights.setData(undefined, context.previousWeights);
      }
      console.error("Delete failed:", err);
      // → add toast here in real app
    },
  });

  const handleDelete = (weightId: string) => {
    if (window.confirm("Are you sure you want to delete this weight measurement?")) {
      deleteMutation.mutate({ weightId });
    }
  };

  return {
    weights,
    latestWeight,
    isLoading,
    isError,
    error,
    formatDate,
    handleDelete,
    isDeleting: deleteMutation.isPending,
  };
}