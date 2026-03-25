import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

export function useTaskToggle(listId: string | null | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const queryKey = listId
    ? trpc.task.getByList.queryKey({ listId })
    : ["task", "getByList", { listId: null }];

  const listOneQueryKey = listId
    ? trpc.list.getOne.queryKey({ id: listId })
    : ["list", "getOne", { id: null }];

  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(
    new Set(),
  );

  const toggle = useMutation(
    trpc.task.toggle.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        if (!listId) return { previous: [] as Task[] };

        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        setPendingToggleIds((prev) => new Set([...prev, id]));

        queryClient.setQueryData(queryKey, (prev: Task[] = []) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, isCompleted: !t.isCompleted, isCurrent: false }
              : t,
          ),
        );

        return { previous };
      },

      onError: (_, __, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(queryKey, ctx.previous);
        }
        showBanner({
          message: "Failed to update task status",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: (task) => {
        const action = task.isCompleted ? "completed" : "re-opened";
        showBanner({
          message: `Task marked as ${action}`,
          variant: "success",
          duration: 2800,
        });
      },

      onSettled: (_, __, vars) => {
        setPendingToggleIds((prev) => {
          const next = new Set(prev);
          next.delete(vars.id);
          return next;
        });
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: listOneQueryKey,
          exact: true,
        });
      },
    }),
  );

  const toggleTask = ({ id }: { id: string }) => {
    if (!listId) return;
    toggle.mutate({ id });
  };

  return {
    toggleTask,
    toggleTaskPending: toggle.isPending,
    pendingToggleIds,
  };
}
