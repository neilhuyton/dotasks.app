import { useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { useAuthStore } from "@/store/authStore";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

export function useTaskRead(listId: string | null | undefined) {
  const trpc = useTRPC();
  const userId = useAuthStore((s) => s.user?.id);

  const enabled = !!listId && !!userId;
  const input = useMemo(() => ({ listId: listId! }), [listId]);
  

  const {
    data: tasks = [],
    isLoading,
    isFetching,
  } = useQuery({
    ...trpc.task.getByList.queryOptions(input),
    enabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    tasks,
    isLoadingTasks: isLoading || (enabled && isFetching && tasks.length === 0),
  };
}
