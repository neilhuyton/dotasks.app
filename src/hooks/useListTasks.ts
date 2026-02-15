// src/hooks/useListTasks.ts

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/trpc";
import { v4 as uuidv4 } from "uuid";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
export type Task = RouterOutput["task"]["getByList"][number];

const sortByDueDate = (tasks: Task[]): Task[] =>
  [...tasks].sort((a, b) => {
    // Pure due-date sort — no special treatment for isCurrent
    // This prevents any jumping when toggling current status
    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return da - db; // earliest first, nulls last
  });

export function useListTasks(listId: string | null | undefined) {
  const utils = trpc.useUtils();
  const queryKey = { listId: listId! };
  const enabled = !!listId;

  const { data: raw = [], isFetching } = trpc.task.getByList.useQuery(queryKey, {
    enabled,
    staleTime: 60_000,
  });

  const serverTasks = useMemo(() => sortByDueDate(raw), [raw]);

  const [optimistic, setOptimistic] = useState<Task[]>([]);

  const visible = useMemo(
    () => (optimistic.length > 0 ? sortByDueDate(optimistic) : serverTasks),
    [optimistic, serverTasks]
  );

  useEffect(() => {
    setOptimistic(serverTasks);
  }, [serverTasks]);

  const optimisticUpdate = (updater: (prev: Task[]) => Task[]) => {
    const current = utils.task.getByList.getData(queryKey) ?? [];
    const next = updater([...current]);
    const sorted = sortByDueDate(next);

    utils.task.getByList.setData(queryKey, sorted);
    setOptimistic(sorted);
  };

  const rollbackTo = (snapshot?: Task[]) => {
    if (!snapshot || !enabled) return;
    const sorted = sortByDueDate(snapshot);
    utils.task.getByList.setData(queryKey, sorted);
    setOptimistic(sorted);
  };

  const create = trpc.task.create.useMutation({
    onMutate: async (input) => {
      if (!enabled) return { previous: [] as Task[] };
      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      const tempId = `temp-${uuidv4()}`;
      const tempTask: Task = {
        id: tempId,
        listId: listId!,
        title: input.title,
        description: input.description ?? null,
        isCompleted: false,
        isCurrent: false,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
        priority: input.priority ?? null,
        order: previous.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      optimisticUpdate((prev) => [...prev, tempTask]);
      return { previous };
    },
    onError: (_, __, context) => rollbackTo(context?.previous),
    onSuccess: (saved) => {
      if (!enabled) return;
      optimisticUpdate((prev) =>
        prev.map((t) => (t.id.startsWith("temp-") ? saved : t))
      );
    },
  });

  const toggle = trpc.task.toggle.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };
      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t))
      );
      return { previous };
    },
    onError: (_, __, context) => rollbackTo(context?.previous),
  });

  const remove = trpc.task.delete.useMutation({
    onMutate: async ({ id }) => {
      if (!enabled) return { previous: [] as Task[] };
      await utils.task.getByList.cancel(queryKey);
      const previous = utils.task.getByList.getData(queryKey) ?? [];

      optimisticUpdate((prev) => prev.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_, __, context) => rollbackTo(context?.previous),
  });

  const setCurrent = trpc.task.setCurrent.useMutation({
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
  });

  const clearCurrent = trpc.task.clearCurrent.useMutation({
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
  });

  return {
    tasks: visible,
    isLoadingTasks: enabled && isFetching && visible.length === 0,

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