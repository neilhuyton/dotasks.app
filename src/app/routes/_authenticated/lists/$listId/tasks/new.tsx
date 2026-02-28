// src/app/routes/_authenticated/lists/$listId/tasks/new.tsx

import { createFileRoute } from "@tanstack/react-router";
import { type QueryClient } from "@tanstack/react-query";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
// import { Textarea } from "@/app/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc, useTRPC } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { useAuthStore } from "@/shared/store/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskItem = RouterOutput["task"]["getByList"][number];
type Tasks = RouterOutput["task"]["getByList"];

function createOptimisticTask(
  input: { title: string; description?: string; listId: string },
  prevLength: number,
): TaskItem {
  const now = new Date().toISOString();
  return {
    id: `temp-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description ?? null,
    listId: input.listId,
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

      const { accessToken } = useAuthStore.getState();
      if (!accessToken || !listId) return {};

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

    errorComponent: ({ error }) => (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-muted-foreground">
        {error?.message?.toLowerCase().includes("not found")
          ? "List not found or you don't have access."
          : `Failed to load: ${error?.message || "Unknown error"}`}
      </div>
    ),

    component: NewTaskPage,
  },
);

function NewTaskPage() {
  const { listId } = Route.useParams();

  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();
  const trpc = useTRPC();

  const [title, setTitle] = useState("");
  // const [description, setDescription] = useState("");

  const tasksQueryKey = trpc.task.getByList.queryKey({ listId });

  const mutation = useMutation(
    trpc.task.create.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: tasksQueryKey });
        const prev = queryClient.getQueryData<Tasks>(tasksQueryKey) ?? [];
        const optimistic = createOptimisticTask(input, prev.length);
        queryClient.setQueryData(tasksQueryKey, [...prev, optimistic]);
        return { prev };
      },

      onError: (_, __, ctx) => {
        if (ctx?.prev) queryClient.setQueryData(tasksQueryKey, ctx.prev);
        showBanner({
          message: "Failed to create task.",
          variant: "error",
          duration: 4000,
        });
      },

      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: tasksQueryKey }),

      onSuccess: (newTask) => {
        queryClient.setQueryData<Tasks>(tasksQueryKey, (old = []) =>
          old.map((t) => (t.id.startsWith("temp-") ? { ...t, ...newTask } : t)),
        );
        showBanner({
          message: "Task created.",
          variant: "success",
          duration: 3000,
        });
        navigate({ to: "/lists/$listId", params: { listId }, replace: true });
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
      // description: description.trim() || undefined,
    });
  };

  const handleCancel = () => {
    navigate({ to: "/lists/$listId", params: { listId }, replace: true });
  };

  const isPending = mutation.isPending;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] isolate pointer-events-auto",
        "h-dvh w-dvw",
        "bg-background overscroll-none touch-none",
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pt-20 pb-10 sm:px-8">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 z-[10000]"
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
                    placeholder="Task title..."
                    autoFocus
                    required
                    disabled={isPending}
                  />
                </div>

                {/* <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium block"
                  >
                    Description (optional)
                  </label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details..."
                    rows={5}
                    disabled={isPending}
                  />
                </div> */}
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
