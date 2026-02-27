// src/hooks/useListTasks.ts

import { useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { useSupabaseTaskRealtime } from "../shared/hooks/useSupabaseTaskRealtime";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

export function useListTasks(listId: string | null | undefined) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const enabled = !!listId;
  const input = useMemo(() => ({ listId: listId! }), [listId]);

  const queryKey = trpc.task.getByList.queryKey(input);

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

  useSupabaseTaskRealtime({ listId });

  const [pendingReorder, setPendingReorder] = useState<Task[] | null>(null);
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set());

  const displayedTasks = pendingReorder ?? tasks;

  const setOptimisticTasks = (updater: (prev: Task[]) => Task[]) => {
    queryClient.setQueryData(queryKey, (old: Task[] = []) => updater([...old]));
  };

  const rollback = (previous?: Task[]) => {
    if (previous) {
      queryClient.setQueryData(queryKey, previous);
    }
  };

  const reorder = useMutation(
    trpc.task.reorder.mutationOptions({
      onMutate: async (updates: { id: string; order: number }[]) => {
        if (!enabled || !updates.length) return { previous: [] as Task[] };

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
        setOptimisticTasks(() => updated);

        return { previous };
      },

      onSuccess: (result) => {
        if (result?.updated) {
          setOptimisticTasks((prev) =>
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
        rollback(ctx?.previous);
        showBanner({
          message: "Failed to reorder tasks",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        setPendingReorder(null);
        queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  const create = useMutation(
    trpc.task.create.mutationOptions({
      onMutate: async (newTaskInput: {
        title: string;
        listId: string;
        description?: string;
      }) => {
        if (!enabled) return { previous: [] as Task[] };

        await queryClient.cancelQueries({ queryKey });

        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        const optimisticTask: Task = {
          id: `temp-${crypto.randomUUID()}`,
          title: newTaskInput.title,
          description: newTaskInput.description ?? null,
          listId: newTaskInput.listId,
          order: previous.length,
          isCompleted: false,
          isCurrent: false,
          isPinned: false,
          dueDate: null,
          priority: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setOptimisticTasks((prev) => [...prev, optimisticTask]);

        return { previous };
      },
      onError: (_, __, ctx) => {
        rollback(ctx?.previous);
        showBanner({
          message: "Failed to create task",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: () =>
        showBanner({
          message: "Task added",
          variant: "success",
          duration: 3000,
        }),

      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );

  const toggle = useMutation(
    trpc.task.toggle.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        if (!enabled) return { previous: [] };
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        setPendingToggleIds((prev) => new Set([...prev, id]));

        setOptimisticTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, isCompleted: !t.isCompleted, isCurrent: false }
              : t,
          ),
        );

        return { previous };
      },

      onError: (_, __, ctx) => {
        rollback(ctx?.previous);
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
      },
    }),
  );

  const remove = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        if (!enabled) return { previous: [] };
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        setOptimisticTasks((prev) => prev.filter((t) => t.id !== id));

        return { previous };
      },

      onError: (_, __, ctx) => {
        rollback(ctx?.previous);
        showBanner({
          message: "Failed to delete task",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );

  const setCurrent = useMutation(
    trpc.task.setCurrent.mutationOptions({
      onMutate: async ({ id }: { id: string }) => {
        if (!enabled) return { previous: [] };
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
        setOptimisticTasks(() => copy);

        return { previous };
      },

      onError: (_, __, ctx) => {
        rollback(ctx?.previous);
        showBanner({
          message: "Failed to set current task",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );

  const clearCurrent = useMutation(
    trpc.task.clearCurrent.mutationOptions({
      onMutate: async () => {
        if (!enabled) return { previous: [] };
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? [];

        setOptimisticTasks((prev) =>
          prev.map((t) => ({ ...t, isCurrent: false })),
        );

        return { previous };
      },

      onError: (_, __, ctx) => {
        rollback(ctx?.previous);
        showBanner({
          message: "Failed to clear current task",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => queryClient.invalidateQueries({ queryKey }),
    }),
  );

  return {
    tasks: displayedTasks,

    isLoadingTasks:
      isLoading || (enabled && isFetching && displayedTasks.length === 0),

    createTask: create.mutate,
    createTaskPending: create.isPending,

    toggleTask: toggle.mutate,
    toggleTaskPending: toggle.isPending,
    pendingToggleIds,

    deleteTask: remove.mutate,
    deleteTaskPending: remove.isPending,

    setCurrentTask: setCurrent.mutate,
    setCurrentTaskPending: setCurrent.isPending,

    clearCurrentTask: clearCurrent.mutate,
    clearCurrentTaskPending: clearCurrent.isPending,

    updateTaskOrder: reorder.mutate,
    isReordering: reorder.isPending,
  };
}