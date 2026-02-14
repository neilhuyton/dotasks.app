// src/hooks/useHomePage.ts
import { useEffect, useState } from "react";
import { trpc } from "@/trpc";
import { useTodoStore } from "@/store/todoStore";
import { useAuthStore } from "@/store/authStore";
import { v4 as uuidv4 } from "uuid";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../server/trpc"; // adjust path if needed

type RouterOutput = inferRouterOutputs<AppRouter>;

type Task = RouterOutput["task"]["getByList"][number];
type List = RouterOutput["list"]["getAll"][number];

const listsEqual = (a: List[], b: List[]) =>
  a.length === b.length && a.every((x, i) => x.id === b[i]?.id);

const tasksEqual = (a: Task[], b: Task[]) =>
  a.length === b.length &&
  a.every((x, i) => x.id === b[i]?.id && x.isCompleted === b[i]?.isCompleted);

export function useHomePage() {
  const { activeListId, initializeActiveList } = useTodoStore();
  const { isLoggedIn: isAuth, userId } = useAuthStore();

  const utils = trpc.useUtils();

  // ─── Lists ────────────────────────────────────────────────
  const { data: serverLists = [], isLoading: listsLoading } =
    trpc.list.getAll.useQuery(undefined, {
      enabled: isAuth,
      staleTime: 300_000,
    });

  const [optimisticLists, setOptimisticLists] = useState<List[]>([]);

  useEffect(() => {
    setOptimisticLists((prev) =>
      listsEqual(prev, serverLists) ? prev : serverLists,
    );
  }, [serverLists]);

  // Auto-select first list (once)
  const [hasSelected, setHasSelected] = useState(false);

  useEffect(() => {
    if (hasSelected || optimisticLists.length === 0) return;
    initializeActiveList(optimisticLists.map((l) => l.id));
    setHasSelected(true);
  }, [optimisticLists, hasSelected, initializeActiveList]);

  // ─── Tasks ────────────────────────────────────────────────
  const { data: serverTasks = [] } = trpc.task.getByList.useQuery(
    { listId: activeListId! },
    { enabled: !!activeListId && isAuth, staleTime: 60_000 },
  );

  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);

  useEffect(() => {
    setOptimisticTasks((prev) =>
      tasksEqual(prev, serverTasks) ? prev : serverTasks,
    );
  }, [serverTasks]);

  // ─── Mutations ────────────────────────────────────────────
  const createList = trpc.list.create.useMutation({
    onMutate: async ({ title }) => {
      await utils.list.getAll.cancel();
      const prev = utils.list.getAll.getData() ?? [];

      const tempId = `temp-${uuidv4()}`;
      const temp: List = {
        id: tempId,
        title,
        userId: userId!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: null,
        color: null,
        icon: null,
        isArchived: false,
      };

      setOptimisticLists([...prev, temp]);
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) setOptimisticLists(ctx.prev);
    },
    onSuccess: (newList) => {
      utils.list.getAll.setData(
        undefined,
        (old) =>
          old?.map((l) => (l.id.startsWith("temp-") ? newList : l)) ?? [],
      );
      setHasSelected(false); // allow re-evaluation
    },
  });

  const createTask = trpc.task.create.useMutation({
    onMutate: async (input) => {
      if (!activeListId) return { prev: [] };

      await utils.task.getByList.cancel({ listId: activeListId });
      const prev = utils.task.getByList.getData({ listId: activeListId }) ?? [];

      const tempId = `temp-${uuidv4()}`;
      const temp: Task = {
        id: tempId,
        listId: input.listId,
        title: input.title,
        description: input.description ?? null,
        isCompleted: false,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null, // ← fixed
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
      if (!activeListId) return;
      utils.task.getByList.setData(
        { listId: activeListId },
        (old) =>
          old?.map((t) => (t.id.startsWith("temp-") ? newTask : t)) ?? [],
      );
    },
  });

  const toggleTask = trpc.task.toggle.useMutation({
    onMutate: async ({ id }) => {
      if (!activeListId) return { prev: [] };

      await utils.task.getByList.cancel({ listId: activeListId });
      const prev = utils.task.getByList.getData({ listId: activeListId }) ?? [];

      setOptimisticTasks((p) =>
        p.map((t) => (t.id === id ? { ...t, isCompleted: !t.isCompleted } : t)),
      );

      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) setOptimisticTasks(ctx.prev);
    },
    onSuccess: () => {
      if (activeListId) {
        utils.task.getByList.invalidate({ listId: activeListId });
      }
    },
  });

  const activeList = optimisticLists.find((l) => l.id === activeListId);

  return {
    // States
    isAuth,
    listsLoading,
    optimisticLists,
    optimisticTasks,
    activeList,
    activeListId,

    // Actions
    createList: createList.mutate,
    createListPending: createList.isPending,
    createTask: createTask.mutate,
    createTaskPending: createTask.isPending,
    toggleTask: toggleTask.mutate,
    toggleTaskPending: toggleTask.isPending,
  };
}
