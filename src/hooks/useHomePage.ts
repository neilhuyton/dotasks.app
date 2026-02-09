// src/hooks/useHomePage.ts
import { useAuthStore } from "../store/authStore";
import { trpc } from "../trpc";

type Goal = {
  id: string;
  goalWeightKg: number;
  goalSetAt: string;
  reachedAt: Date | null;
};

export const useHomePage = () => {
  const { isLoggedIn } = useAuthStore();

  // tRPC queries
  const {
    data: weightsData = [],
    isLoading: weightsLoading,
    error: weightsError,
  } = trpc.weight.getWeights.useQuery(undefined, {
    enabled: isLoggedIn,
  });

  const {
    data: goalData = null,
    isLoading: goalLoading,
    error: goalError,
  } = trpc.weight.getCurrentGoal.useQuery(undefined, {
    enabled: isLoggedIn,
  }) as { data: Goal | null; isLoading: boolean; error: Error | null };

  const {
    data: goalsData = [],
    isLoading: goalsLoading,
    error: goalsError,
  } = trpc.weight.getGoals.useQuery(undefined, {
    enabled: isLoggedIn,
  }) as { data: Goal[]; isLoading: boolean; error: Error | null };

  // Latest weight and goal weight
  const latestWeight = weightsData?.[0]?.weightKg ?? null;

  // Use the most recent goal from getGoals if available, fallback to getCurrentGoal
  const latestGoal: Goal | null =
    goalsData?.length > 0
      ? goalsData.sort(
          (a, b) =>
            new Date(b.goalSetAt).getTime() - new Date(a.goalSetAt).getTime()
        )[0]
      : goalData;

  const goalWeight = latestGoal?.goalWeightKg ?? null;
  const weightChange =
    latestWeight && goalWeight ? latestWeight - goalWeight : null;

  // Check if goal is achieved (prefer reachedAt, fallback to weight <= goal)
  const isGoalAchieved =
    latestGoal !== null &&
    (latestGoal.reachedAt !== null ||
      (latestWeight !== null &&
        goalWeight !== null &&
        latestWeight <= goalWeight));

  // Loading state
  const isLoading = weightsLoading || goalLoading || goalsLoading;

  // Error state
  const hasError = weightsError || goalError || goalsError;

  // Recent measurement data
  const recentMeasurement = weightsData[0]
    ? {
        value: `${weightsData[0].weightKg.toFixed(1)} kg`,
        description: `${weightsData[0].note || "No note"} - ${new Date(
          weightsData[0].createdAt
        ).toLocaleDateString("en-US")}`,
      }
    : { value: null, description: "No measurements" };

  return {
    isLoading,
    hasError,
    latestWeight,
    goalWeight,
    weightChange,
    isGoalAchieved,
    recentMeasurement,
  };
};