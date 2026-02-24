// src/hooks/useListTasks.ts

import { useMemo, useState } from "react";
import { trpc } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { useBannerStore } from "@/store/bannerStore";
import { useSupabaseTaskRealtime } from "./useSupabaseTaskRealtime";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

export function useListTasks(listId: string | null | undefined) {
  const utils = trpc.useUtils();
  const { show: showBanner } = useBannerStore();

  const enabled = !!listId;
  const queryKey = useMemo(() => ({ listId: listId! }), [listId]);

  // Fetch tasks
  const {
    data: tasks = [],
    isFetching,
    isLoading,
  } = trpc.task.getByList.useQuery(queryKey, {
    enabled,
    staleTime: 60_000, // 1 minute
  });

  // Real-time subscription for this list's tasks
  useSupabaseTaskRealtime({ listId });

  const [pendingReorder, setPendingReorder] = useState<Task[] | null>(null);

  const displayedTasks = pendingReorder ?? tasks;

  const optimisticUpdate = (updater: (prev: Task[]) => Task[]) => {
    utils.task.getByList.setData(queryKey, (prev = []) => updater([...prev]));
  };

  const rollbackTo = (previous?: Task[]) => {
    if (previous) {
      utils.task.getByList.setData(queryKey, previous);
    }
  };

  // ──────────────────────────────────────────────
  // Reordering (drag & drop)
  // ──────────────────────────────────────────────
  const reorderTasks = trpc.task.reorder.useMutation({
    onMutate: async (updates: { id: string; order: number }[]) => {
      if (!enabled || updates.length === 0) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      const newTasks = previous
        .map((t) => {
          const update = updates.find((u) => u.id === t.id);
          return update ? { ...t, order: update.order } : t;
        })
        .sort((a, b) => a.order - b.order);

      setPendingReorder(newTasks);
      optimisticUpdate(() => newTasks);

      return { previous };
    },

    onSuccess: (result) => {
      if (result.updated) {
        optimisticUpdate((prev) =>
          prev
            .map((t) => {
              const update = result.updated.find((u) => u.id === t.id);
              return update ? { ...t, order: update.order } : t;
            })
            .sort((a, b) => a.order - b.order),
        );
      }
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      console.error("Reorder failed");
      showBanner({
        message: "Failed to reorder tasks. Please try again.",
        variant: "error",
        duration: 4000,
      });
    },

    onSettled: () => {
      setPendingReorder(null);
      utils.task.getByList.invalidate(queryKey);
    },
  });

  // ──────────────────────────────────────────────
  // Create task – NO optimistic update (realtime will handle insert)
  // ──────────────────────────────────────────────
  const create = trpc.task.create.useMutation({
    onSuccess: () => {
      showBanner({
        message: `Task has been added.`,
        variant: "success",
        duration: 3000,
      });
    },

    onError: () => {
      showBanner({
        message: "Failed to create task. Please try again.",
        variant: "error",
        duration: 4000,
      });
    },

    onSettled: () => {
      utils.task.getByList.invalidate(queryKey);
    },
  });

  // ──────────────────────────────────────────────
  // Toggle complete
  // ──────────────────────────────────────────────
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
                isCurrent: false,
              }
            : t,
        ),
      );

      return { previous };
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      showBanner({
        message: "Failed to update task status. Please try again.",
        variant: "error",
        duration: 4000,
      });
    },

    onSuccess: (updatedTask) => {
      const action = updatedTask.isCompleted ? "completed" : "re-opened";
      showBanner({
        message: `Task marked as ${action}.`,
        variant: "success",
        duration: 2800,
      });
    },

    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // ──────────────────────────────────────────────
  // Delete task
  // ──────────────────────────────────────────────
  const remove = trpc.task.delete.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) => prev.filter((t) => t.id !== id));

      return { previous };
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      showBanner({
        message: "Failed to delete task.",
        variant: "error",
        duration: 4000,
      });
    },

    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  // ──────────────────────────────────────────────
  // Set current task – with optimistic move to top + clear others
  // ──────────────────────────────────────────────
  const setCurrentMutation = trpc.task.setCurrent.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };

      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      const optimisticTasks = previous.map((t) => ({
        ...t,
        isCurrent: t.id === id,           // only the target becomes current
      }));

      // ── Move to top (same logic as before) ───────────────────────
      const targetIndex = optimisticTasks.findIndex((t) => t.id === id);
      if (targetIndex === -1) return { previous };

      const targetTask = optimisticTasks[targetIndex];

      // Remove from current position
      optimisticTasks.splice(targetIndex, 1);

      // Assign very low order → sorts to top
      const minOrder =
        optimisticTasks.length > 0
          ? Math.min(...optimisticTasks.map((t) => t.order ?? 0)) - 1
          : 0;

      const updatedTarget = {
        ...targetTask,
        isCurrent: true,
        order: minOrder,
      };

      // Insert at beginning
      optimisticTasks.unshift(updatedTarget);

      // Optional: re-normalize order values to 0,1,2,...
      optimisticTasks.forEach((t, idx) => {
        t.order = idx;
      });
      // ─────────────────────────────────────────────────────────────

      optimisticUpdate(() => optimisticTasks);

      return { previous };
    },

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      showBanner({
        message: "Failed to set current task.",
        variant: "error",
        duration: 4000,
      });
    },

    onSettled: () => {
      utils.task.getByList.invalidate(queryKey);
    },
  });

  // ──────────────────────────────────────────────
  // Clear current task
  // ──────────────────────────────────────────────
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

    onError: (_, __, context) => {
      rollbackTo(context?.previous);
      showBanner({
        message: "Failed to clear current task.",
        variant: "error",
        duration: 4000,
      });
    },

    onSettled: () => utils.task.getByList.invalidate(queryKey),
  });

  return {
    tasks: displayedTasks,
    isLoadingTasks:
      isLoading || (enabled && isFetching && displayedTasks.length === 0),

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