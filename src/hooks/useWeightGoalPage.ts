// src/hooks/useWeightGoalPage.ts

import { useState } from "react";
import { trpc } from "../trpc";
import { useAuthStore } from "../store/authStore";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "server/trpc";

// Define Goal type to match weightRouter.ts
type Goal = {
  id: string;
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: Date | null;
};

export function useWeightGoalPage() {
  const [goalWeight, setGoalWeight] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { userId } = useAuthStore();

  const {
    data: currentGoal = null,
    isLoading: isGoalLoading,
    error: goalError,
  } = trpc.weight.getCurrentGoal.useQuery(undefined, {
    enabled: !!userId,
  }) as {
    data: Goal | null;
    isLoading: boolean;
    error: TRPCClientErrorLike<AppRouter>;
  };

  // const {
  //   data: goals = [],
  //   isLoading: isGoalsLoading,
  //   error: goalsError,
  // } = trpc.weight.getGoals.useQuery(undefined, {
  //   enabled: !!userId,
  // }) as { data: Goal[]; isLoading: boolean; error: TRPCClientErrorLike<AppRouter> };

  // const {
  //   data: weights = [],
  //   isLoading: isWeightsLoading,
  //   error: weightsError,
  // } = trpc.weight.getWeights.useQuery(undefined, {
  //   enabled: !!userId,
  // });

  // Get the most recent goal
  // const latestGoal: Goal | null =
  //   goals.length > 0
  //     ? goals.sort(
  //         (a, b) =>
  //           new Date(b.goalSetAt).getTime() - new Date(a.goalSetAt).getTime()
  //       )[0]
  //     : currentGoal;
  // const latestWeight = weights?.[0]?.weightKg ?? null;
  // Ensure latestGoal is defined before accessing properties
  // const isGoalAchieved =
  //   latestGoal &&
  //   latestWeight !== null &&
  //   (latestGoal.reachedAt !== null || latestWeight <= latestGoal.goalWeightKg);

  const queryClient = trpc.useContext();
  const setGoalMutation = trpc.weight.setGoal.useMutation({
    onSuccess: () => {
      setGoalWeight("");
      setMessage("Goal set successfully!");
      queryClient.weight.getCurrentGoal.invalidate();
      queryClient.weight.getGoals.invalidate();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage(`Failed to set goal: ${error.message}`);
    },
  });

  const updateGoalMutation = trpc.weight.updateGoal.useMutation({
    onSuccess: () => {
      setGoalWeight("");
      setMessage("Goal updated successfully!");
      queryClient.weight.getCurrentGoal.invalidate();
      queryClient.weight.getGoals.invalidate();
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      setMessage(`Failed to update goal: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage("You must be logged in to set a goal");
      return;
    }
    const goalWeightKg = parseFloat(goalWeight);
    if (isNaN(goalWeightKg) || goalWeightKg <= 0) {
      setMessage("Goal weight must be a positive number");
      return;
    }
    if (currentGoal) {
      // Update existing goal
      updateGoalMutation.mutate({ goalId: currentGoal.id, goalWeightKg });
    } else {
      // Set new goal
      setGoalMutation.mutate({ goalWeightKg });
    }
  };

  const handleGoalWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGoalWeight(e.target.value);
  };

  return {
    currentGoal,
    // goals,
    isLoading: isGoalLoading,
    error: goalError,
    goalWeight,
    message,
    isSettingGoal: setGoalMutation.isPending || updateGoalMutation.isPending,
    isGoalAchieved: false, // Ensure boolean return
    handleSubmit,
    handleGoalWeightChange,
  };
}
