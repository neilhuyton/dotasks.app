import { createFileRoute } from "@tanstack/react-router";
import { type QueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc, useTRPC } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskItem = RouterOutput["task"]["getByList"][number];
type Tasks = RouterOutput["task"]["getByList"];

function createOptimisticTask(
  input: { title: string; description?: string; listId: string },
  prevLength: number,
  userId: string,
): TaskItem {
  const now = new Date().toISOString();
  return {
    id: `temp-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description ?? null,
    listId: input.listId,
    userId,
    dueDate: null,
    priority: null,
    order: prevLength,
    isCompleted: false,
    isCurrent: false,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  } satisfies TaskItem;
}

export const Route = createFileRoute("/_authenticated/lists/$listId/tasks/new")(
  {
    loader: async ({
      context: { queryClient },
      params,
    }: {
      context: { queryClient: QueryClient };
      params: { listId: string };
    }) => {
      const { listId } = params;

      if (!listId) return {};

      await queryClient.ensureQueryData(
        trpc.list.getOne.queryOptions(
          { id: listId },
          { staleTime: 5 * 60 * 1000 },
        ),
      );

      await queryClient.ensureQueryData(
        trpc.task.getByList.queryOptions({ listId }, { staleTime: 30_000 }),
      );

      return {};
    },

    pendingComponent: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    ),
    pendingMs: 0,
    pendingMinMs: 300,

    component: NewTaskPage,
  },
);

function NewTaskPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();
  const trpcHook = useTRPC();
  const userId = useAuthStore((s) => s.user?.id);

  const [title, setTitle] = useState("");

  const tasksQueryKey = trpcHook.task.getByList.queryKey({ listId });
  const listOneQueryKey = trpcHook.list.getOne.queryKey({ id: listId });
  const listAllQueryKey = trpcHook.list.getAll.queryKey();

  const mutation = useMutation(
    trpcHook.task.create.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: tasksQueryKey });

        const prev = queryClient.getQueryData<Tasks>(tasksQueryKey) ?? [];
        const optimistic = createOptimisticTask(input, prev.length, userId!);

        queryClient.setQueryData<Tasks>(tasksQueryKey, [...prev, optimistic]);

        return { prev };
      },

      onError: (_, __, ctx) => {
        if (ctx?.prev) {
          queryClient.setQueryData(tasksQueryKey, ctx.prev);
        }
        showBanner({
          message: "Failed to create task. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: tasksQueryKey });
      },

      onSuccess: (newTask) => {
        queryClient.setQueryData<Tasks>(tasksQueryKey, (old = []) =>
          old.map((t) => (t.id.startsWith("temp-") ? { ...t, ...newTask } : t)),
        );

        queryClient.invalidateQueries({
          queryKey: listOneQueryKey,
          exact: true,
        });
        queryClient.invalidateQueries({
          queryKey: listAllQueryKey,
          exact: true,
        });

        showBanner({
          message: "Task created successfully.",
          variant: "success",
          duration: 3000,
        });

        navigate({
          to: "/lists/$listId",
          params: { listId },
          replace: true,
        });
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    mutation.mutate({
      title: trimmed,
      listId,
    });
  };

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  const isPending = mutation.isPending;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none",
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pt-20 pb-10 sm:px-8">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Cancel and return to list"
          onClick={handleCancel}
          disabled={isPending}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">
              New Task
            </h1>

            <form
              onSubmit={handleSubmit}
              data-testid="new-task-form"
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium block">
                    Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Buy groceries"
                    autoFocus
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
                <Button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="w-full sm:w-40"
                >
                  {isPending ? (
                    <>
                      Creating
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    </>
                  ) : (
                    "Create Task"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="w-full sm:w-32"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
