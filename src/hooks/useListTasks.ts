// src/hooks/useListTasks.ts

import { useEffect, useState } from "react";
import { trpc } from "@/trpc";
import { v4 as uuidv4 } from "uuid";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Task = RouterOutput["task"]["getByList"][number];

const tasksEqual = (a: Task[], b: Task[]) =>
  a.length === b.length &&
  a.every((x, i) => x.id === b[i]?.id && x.isCompleted === b[i]?.isCompleted);

export function useListTasks(listId: string | null | undefined) {
  const utils = trpc.useUtils();

  const { data: serverTasks = [] } = trpc.task.getByList.useQuery(
    { listId: listId! },
    { enabled: !!listId, staleTime: 60_000 },
  );

  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);

  useEffect(() => {
    setOptimisticTasks((prev) =>
      tasksEqual(prev, serverTasks) ? prev : serverTasks,
    );
  }, [serverTasks]);

  const createTask = trpc.task.create.useMutation({
    onMutate: async (input) => {
      if (!listId) return { prev: [] };
      await utils.task.getByList.cancel({ listId });
      const prev = utils.task.getByList.getData({ listId }) ?? [];
      const tempId = `temp-${uuidv4()}`;
      const temp: Task = {
        id: tempId,
        listId,
        title: input.title,
        description: input.description ?? null,
        isCompleted: false,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
        priority: input.priority ?? null,
        order: input.order ?? prev.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setOptimisticTasks([...prev, temp]);
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) setOptimisticTasks(ctx.prev);
    },
    onSuccess: (newTask) => {
      if (!listId) return;
      utils.task.getByList.setData(
        { listId },
        (old) =>
          old?.map((t) => (t.id.startsWith("temp-") ? newTask : t)) ?? [],
      );
    },
  });

  const toggleTask = trpc.task.toggle.useMutation({
    onMutate: async ({ id }) => {
      if (!listId) return { prev: [] };
      await utils.task.getByList.cancel({ listId });
      const prev = utils.task.getByList.getData({ listId }) ?? [];
      setOptimisticTasks((p) =>
        p.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)),
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) setOptimisticTasks(ctx.prev);
    },
    onSuccess: () => {
      if (listId) utils.task.getByList.invalidate({ listId });
    },
  });

  return {
    optimisticTasks,
    createTask: createTask.mutate,
    createTaskPending: createTask.isPending,
    toggleTask: toggleTask.mutate,
    toggleTaskPending: toggleTask.isPending,
  };
}
