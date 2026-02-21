import { useMemo } from "react";
import { trpc } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { toast } from "sonner";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

export function useListTasks(listId: string | null | undefined) {
  const utils = trpc.useUtils();
  const enabled = !!listId;
  const queryKey = useMemo(() => ({ listId: listId! }), [listId]);

  const {
    data: tasks = [],           // ← renamed rawTasks → tasks, no sorting applied
    isFetching,
    isLoading,
  } = trpc.task.getByList.useQuery(queryKey, {
    enabled,
    staleTime: 60_000, // 1 minute
  });

  // const optimisticUpdate = (updater: (prev: Task[]) => Task[]) => {
  //   utils.task.getByList.setData(queryKey, (prev = []) => updater([...prev]));
  // };

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

      // optimisticUpdate((prev) =>
      //   prev.map((t) => {
      //     const update = updates.find((u) => u.id === t.id);
      //     return update ? { ...t, order: update.order } : t;
      //   }),
      // );

      return { previous };
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      console.error("Reorder failed");
    },

    onSettled: () => {
      utils.task.getByList.invalidate(queryKey);
    },
  });

  // Create – no optimistic anymore (as per previous request)
  const create = trpc.task.create.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      // optimisticUpdate((prev) =>
      //   prev.map((t) =>
      //     t.id === id
      //       ? {
      //           ...t,
      //           isCompleted: !t.isCompleted,
      //           isCurrent: false,   // keep if you still want auto-clear current
      //         }
      //       : t,
      //   ),
      // );

      return { previous };
    },
    
    onSuccess: () => {
      toast.success("Task created");
    },

    onError: () => {
      toast.error("Failed to create task");
    },

    // onSettled: () => {
    //   utils.task.getByList.invalidate(queryKey);
    // },
  });

  // Toggle complete
  const toggle = trpc.task.toggle.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      // optimisticUpdate((prev) =>
      //   prev.map((t) =>
      //     t.id === id
      //       ? {
      //           ...t,
      //           isCompleted: !t.isCompleted,
      //           isCurrent: false,   // keep if you still want auto-clear current
      //         }
      //       : t,
      //   ),
      // );

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

      // optimisticUpdate((prev) => prev.filter((t) => t.id !== id));

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

      // optimisticUpdate((prev) =>
      //   prev.map((t) => ({
      //     ...t,
      //     isCurrent: t.id === id,
      //   })),
      // );

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

      // optimisticUpdate((prev) =>
      //   prev.map((t) => ({
      //     ...t,
      //     isCurrent: false,
      //   })),
      // );

      return { previous };
    },

    onError: (_, __, context) => rollbackTo(context?.previous),
    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  return {
    tasks,   // ← directly from query, no sorting applied
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