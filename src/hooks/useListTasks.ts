// src/hooks/useListTasks.ts

import { useMemo } from "react";
import { trpc } from "@/trpc";
import { v4 as uuidv4 } from "uuid";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

const sortNewestFirst = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    // Newest createdAt first (descending)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

export function useListTasks(listId: string | null | undefined) {
  const utils = trpc.useUtils();
  const enabled = !!listId;
  const queryKey = useMemo(() => ({ listId: listId! }), [listId]);

  const {
    data: rawTasks = [],
    isFetching,
    isLoading,
  } = trpc.task.getByList.useQuery(queryKey, {
    enabled,
    staleTime: 60_000,
  });

  // Always sort newest-first — stable reference only when data changes
  const tasks = useMemo(() => sortNewestFirst(rawTasks), [rawTasks]);

  const optimisticUpdate = (updater: (prev: Task[]) => Task[]) => {
    utils.task.getByList.setData(queryKey, (prevRaw = []) => {
      const prevSorted = sortNewestFirst(prevRaw);
      const nextSorted = updater(prevSorted);
      return sortNewestFirst(nextSorted); // ensure newest-first even after mutation
    });
  };

  const rollbackTo = (previousSorted?: Task[]) => {
    if (previousSorted !== undefined) {
      utils.task.getByList.setData(queryKey, previousSorted);
    }
  };

  const create = trpc.task.create.useMutation({
    onMutate: async (input) => {
      if (!enabled) return { previousSorted: [] };

      await utils.task.getByList.cancel(queryKey);
      const previousRaw = utils.task.getByList.getData(queryKey) ?? [];
      const previousSorted = sortNewestFirst(previousRaw);

      const tempId = `temp-${uuidv4()}`;
      const now = new Date().toISOString();

      const tempTask: Task = {
        id: tempId,
        listId: listId!,
        title: input.title,
        description: input.description ?? null,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
        priority: input.priority ?? null,
        order: previousSorted.length,
        createdAt: now,
        updatedAt: now,
      };

      // Insert at top (newest)
      optimisticUpdate((prev) => [tempTask, ...prev]);

      return { previousSorted };
    },

    onError: (_, __, context) => rollbackTo(context?.previousSorted),

    onSuccess: (saved) => {
      if (!enabled) return;
      optimisticUpdate((prev) =>
        prev.map((t) => (t.id.startsWith("temp-") ? saved : t)),
      );
      // Background sync to catch any server-side adjustments
      utils.task.getByList.invalidate(queryKey);

      toast.success("List created", {
        description: `has been added.`,
        duration: 4000,
      });
    },
  });

  const toggle = trpc.task.toggle.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previousSorted: [] };

      await utils.task.getByList.cancel(queryKey);
      const previousRaw = utils.task.getByList.getData(queryKey) ?? [];
      const previousSorted = sortNewestFirst(previousRaw);

      optimisticUpdate((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                isCompleted: !t.isCompleted,
                // If becoming completed → force-remove pin & current flags
                // (matches backend enforcement in taskRouter.toggle)
                isPinned: !t.isCompleted ? false : t.isPinned,
                isCurrent: !t.isCompleted ? false : t.isCurrent,
              }
            : t,
        ),
      );

      return { previousSorted };
    },

    onError: (_, __, context) => rollbackTo(context?.previousSorted),

    // Added: always revalidate after toggle (success or error)
    // Ensures cache stays in sync with server (especially important for forced isPinned = false)
    onSettled: () => {
      utils.task.getByList.invalidate(queryKey);
    },
  });

  const remove = trpc.task.delete.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previousSorted: [] };

      await utils.task.getByList.cancel(queryKey);
      const previousRaw = utils.task.getByList.getData(queryKey) ?? [];
      const previousSorted = sortNewestFirst(previousRaw);

      optimisticUpdate((prev) => prev.filter((t) => t.id !== id));

      return { previousSorted };
    },
    onError: (_, __, context) => rollbackTo(context?.previousSorted),
  });

  const setCurrent = trpc.task.setCurrent.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previousSorted: [] };

      await utils.task.getByList.cancel(queryKey);
      const previousRaw = utils.task.getByList.getData(queryKey) ?? [];
      const previousSorted = sortNewestFirst(previousRaw);

      optimisticUpdate((prev) =>
        prev.map((t) => ({
          ...t,
          isCurrent: t.id === id,
        })),
      );

      return { previousSorted };
    },
    onError: (_, __, context) => rollbackTo(context?.previousSorted),
  });

  const clearCurrent = trpc.task.clearCurrent.useMutation({
    onMutate: async () => {
      if (!enabled) return { previousSorted: [] };

      await utils.task.getByList.cancel(queryKey);
      const previousRaw = utils.task.getByList.getData(queryKey) ?? [];
      const previousSorted = sortNewestFirst(previousRaw);

      optimisticUpdate((prev) =>
        prev.map((t) => ({
          ...t,
          isCurrent: false,
        })),
      );

      return { previousSorted };
    },
    onError: (_, __, context) => rollbackTo(context?.previousSorted),
  });

  return {
    tasks,
    isLoadingTasks: isLoading || (enabled && isFetching && tasks.length === 0),

    createTask: create.mutate,
    createTaskPending: create.isPending,

    toggleTask: toggle.mutate,
    toggleTaskPending: toggle.isPending,

    deleteTask: remove.mutate,
    deleteTaskPending: remove.isPending,

    setCurrentTask: setCurrent.mutate,
    setCurrentTaskPending: setCurrent.isPending,

    clearCurrentTask: clearCurrent.mutate,
    clearCurrentTaskPending: clearCurrent.isPending,
  };
}
