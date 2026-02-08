// src/hooks/useGoalList.ts
import { trpc } from "../trpc";
import { formatDate } from "../utils/date"; 

export function useGoalList() {
  const {
    data: goals,
    isLoading,
    isError,
    error,
  } = trpc.weight.getGoals.useQuery();

  return {
    goals,
    isLoading,
    isError,
    error,
    formatDate,
  };
}
