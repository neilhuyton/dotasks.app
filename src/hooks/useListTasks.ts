// src/hooks/useListTasks.ts

import { useMemo } from "react";
import { trpc } from "@/trpc";
import { v4 as uuidv4 } from "uuid";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

const sortTasks = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    // Exact match to Prisma: isPinned DESC (true first), then order ASC
    if (a.isPinned !== b.isPinned) {
      return b.isPinned ? 1 : -1;  // pinned (true) comes BEFORE non-pinned
    }
    return a.order - b.order;     // lower order = higher in list
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
    staleTime: 60_000, // 1 minute
  });

  const tasks = useMemo(() => sortTasks(rawTasks), [rawTasks]);

  const optimisticUpdate = (updater: (prev: Task[]) => Task[]) => {
    utils.task.getByList.setData(queryKey, (prev = []) => updater([...prev]));
  };

  const rollbackTo = (previous?: Task[]) => {
    if (previous) {
      utils.task.getByList.setData(queryKey, previous);
    }
  };

  // Reordering (drag & drop) – bulk update orders
  const reorderTasks = trpc.task.reorder.useMutation({
    onMutate: async (updates: { id: string; order: number }[]) => {
      if (!enabled || updates.length === 0) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => {
          const update = updates.find((u) => u.id === t.id);
          return update ? { ...t, order: update.order } : t;
        })
      );

      return { previous };
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      console.error("Reorder failed:", _);
    },

    // Keep invalidate to ensure server truth wins
    onSettled: () => {
      utils.task.getByList.invalidate(queryKey);
    },
  });

  // Create task (optimistic – insert at top)
  const create = trpc.task.create.useMutation({
    onMutate: async (input) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

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
        order: 0,
        createdAt: now,
        updatedAt: now,
      };

      optimisticUpdate((prev) => [tempTask, ...prev]);

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),

    onSuccess: () => {
      utils.task.getByList.invalidate(queryKey);
      toast.success("Task created");
    },
  });

  // Toggle complete ↔ incomplete
  const toggle = trpc.task.toggle.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                isCompleted: !t.isCompleted,
                isPinned: false,
                isCurrent: false,
              }
            : t
        )
      );

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // Delete task
  const remove = trpc.task.delete.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) => prev.filter((t) => t.id !== id));

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // Set current task
  const setCurrentMutation = trpc.task.setCurrent.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => ({
          ...t,
          isCurrent: t.id === id,
        }))
      );

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // Clear current task
  const clearCurrentMutation = trpc.task.clearCurrent.useMutation({
    onMutate: async () => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => ({
          ...t,
          isCurrent: false,
        }))
      );

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
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

    setCurrentTask: setCurrentMutation.mutate,
    setCurrentTaskPending: setCurrentMutation.isPending,

    clearCurrentTask: clearCurrentMutation.mutate,
    clearCurrentTaskPending: clearCurrentMutation.isPending,

    updateTaskOrder: reorderTasks.mutate,
    isReordering: reorderTasks.isPending,
  };
}