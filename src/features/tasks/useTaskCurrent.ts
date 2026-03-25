import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

export function useTaskCurrent(listId: string | null | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const queryKey = listId
    ? trpc.task.getByList.queryKey({ listId })
    : ["task", "getByList", { listId: null }];

  const listOneQueryKey = listId
    ? trpc.list.getOne.queryKey({ id: listId })
    : ["list", "getOne", { id: null }];

  const setCurrent = useMutation(
    trpc.task.setCurrent.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        if (!listId) return { previous: [] as Task[] };

        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        const copy = previous.map((t) => ({ ...t, isCurrent: t.id === id }));

        const idx = copy.findIndex((t) => t.id === id);
        if (idx === -1) return { previous };

        const [target] = copy.splice(idx, 1);
        const minOrder = copy.length
          ? Math.min(...copy.map((t) => t.order ?? 0))
          : 0;
        target.order = minOrder - 100;

        copy.unshift(target);
        queryClient.setQueryData(queryKey, copy);

        return { previous };
      },

      onError: (_, __, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(queryKey, ctx.previous);
        }
        showBanner({
          message: "Failed to set current task",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: () => {
        showBanner({
          message: "Current task set",
          variant: "success",
          duration: 2000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: listOneQueryKey,
          exact: true,
        });
      },
    }),
  );

  const clearCurrent = useMutation(
    trpc.task.clearCurrent.mutationOptions({
      onMutate: async () => {
        if (!listId) return { previous: [] as Task[] };

        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        const updated = previous.map((t) => ({ ...t, isCurrent: false }));
        queryClient.setQueryData(queryKey, updated);

        return { previous };
      },

      onError: (_, __, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(queryKey, ctx.previous);
        }
        showBanner({
          message: "Failed to clear current task",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: () => {
        showBanner({
          message: "Current task cleared",
          variant: "success",
          duration: 2000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: listOneQueryKey,
          exact: true,
        });
      },
    }),
  );

  const setCurrentTask = ({ id }: { id: string }) => {
    if (!listId) return;
    setCurrent.mutate({ id, listId });
  };

  const clearCurrentTask = () => {
    if (!listId) return;
    clearCurrent.mutate({ listId });
  };

  return {
    setCurrentTask,
    setCurrentTaskPending: setCurrent.isPending,
    clearCurrentTask,
    clearCurrentTaskPending: clearCurrent.isPending,
  };
}
