import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

export function useTaskReorder(listId: string | null | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const queryKey = listId
    ? trpc.task.getByList.queryKey({ listId })
    : ["invalid-key"];

  const listOneQueryKey = listId
    ? trpc.list.getOne.queryKey({ id: listId })
    : ["invalid-key"];

  const [pendingReorder, setPendingReorder] = useState<Task[] | null>(null);

  const mutation = useMutation(
    trpc.task.reorder.mutationOptions({
      onMutate: async (updates: { id: string; order: number }[]) => {
        if (!listId || !updates.length) return { previous: [] as Task[] };

        await queryClient.cancelQueries({ queryKey });

        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        const updated = previous.map((t) => {
          const change = updates.find((u) => u.id === t.id);
          return change ? { ...t, order: change.order } : t;
        });

        updated.sort((a, b) =>
          a.isCurrent === b.isCurrent
            ? a.order - b.order
            : a.isCurrent
              ? -1
              : 1,
        );

        setPendingReorder(updated);
        queryClient.setQueryData(queryKey, updated);

        return { previous };
      },

      onSuccess: (result) => {
        if (result && "updated" in result && result.updated) {
          queryClient.setQueryData(queryKey, (prev: Task[] = []) =>
            prev.map((t) => {
              const u = result.updated.find((up) => up.id === t.id);
              return u ? { ...t, order: u.order } : t;
            }),
          );
        }

        showBanner({
          message: "Tasks reordered",
          variant: "success",
          duration: 2000,
        });
      },

      onError: (_, __, ctx) => {
        if (ctx?.previous) {
          queryClient.setQueryData(queryKey, ctx.previous);
        }
        showBanner({
          message: "Failed to reorder tasks",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        setPendingReorder(null);
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({
          queryKey: listOneQueryKey,
          exact: true,
        });
      },
    }),
  );

  const reorderTasks = (updates: { id: string; order: number }[]) => {
    if (!listId) return;
    mutation.mutate(updates);
  };

  return {
    pendingReorder,
    reorderTasks,
    isReordering: mutation.isPending,
  };
}
