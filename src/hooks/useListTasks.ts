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
    // pinned first, then by order ascending
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    // stable tie-breaker using id (prevents random reordering)
    return a.id.localeCompare(b.id);
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

  // Reordering (drag & drop)
  const reorderTasks = trpc.task.reorder.useMutation({
    onMutate: async (updates: { id: string; order: number }[]) => {
      if (!enabled || updates.length === 0) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => {
          const update = updates.find((u) => u.id === t.id);
          return update ? { ...t, order: update.order } : t;
        }),
      );

      return { previous };
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      console.error("Reorder failed:", _);
    },

    onSettled: () => {
      utils.task.getByList.invalidate(queryKey);
    },
  });

  // Create – new task appears at bottom, no position change on success
  const create = trpc.task.create.useMutation({
    onMutate: async (input) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      // Same calculation as backend → exact same final position
      const currentMaxOrder =
        previous.length > 0
          ? Math.max(...previous.map((t) => t.order ?? 0))
          : -1;
      const nextOrder = currentMaxOrder + 1;

      const tempId = `temp-${uuidv4()}`;
      const now = new Date().toISOString();

      const tempTask: Task = {
        id: tempId,
        listId: listId!,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
        priority: input.priority ?? null,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      };

      optimisticUpdate((prev) => sortTasks([...prev, tempTask]));

      return { previous, tempId };
    },

    onSuccess: (createdTask, _, context) => {
      // Replace temp → real (same order → same position)
      optimisticUpdate((prev) =>
        prev.map((t) =>
          t.id === context.tempId
            ? {
                ...createdTask,
              }
            : t,
        ),
      );

      // No immediate invalidate — let user see smooth result first
      // Background refetch will happen naturally on next focus/mount
      // If you want forced refresh, uncomment next line:
      // utils.task.getByList.invalidate(queryKey);

      toast.success("Task created");
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      toast.error("Failed to create task");
    },
  });

  // Toggle complete
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
            : t,
        ),
      );

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // Delete
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

  // Set current
  const setCurrentMutation = trpc.task.setCurrent.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => ({
          ...t,
          isCurrent: t.id === id,
        })),
      );

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // Clear current
  const clearCurrentMutation = trpc.task.clearCurrent.useMutation({
    onMutate: async () => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => ({
          ...t,
          isCurrent: false,
        })),
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