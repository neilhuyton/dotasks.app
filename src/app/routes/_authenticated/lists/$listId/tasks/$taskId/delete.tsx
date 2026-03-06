// src/app/routes/_authenticated/lists/$listId/tasks/$taskId/delete.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/app/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";
import { useBannerStore } from "@/shared/store/bannerStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute(
  "/_authenticated/lists/$listId/tasks/$taskId/delete",
)({
  loader: async ({ context: { queryClient }, params }) => {
    const { listId, taskId } = params;

    if (!listId || !taskId) return {};

    await queryClient.ensureQueryData(
      trpc.task.getByList.queryOptions(
        { listId },
        { staleTime: 5 * 60 * 1000 },
      ),
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

  errorComponent: ({ error }) => {
    const message = error?.message?.toLowerCase() ?? "";
    const isNotFound = message.includes("not found");

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6 text-center text-muted-foreground">
        {isNotFound
          ? "Task or list not found or you don't have access."
          : `Failed to load task: ${error?.message || "Unknown error"}`}
      </div>
    );
  },

  component: DeleteTaskConfirmPage,
});

function DeleteTaskConfirmPage() {
  const { listId, taskId } = Route.useParams();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { show: showBanner } = useBannerStore();

  const queryInput = { listId: listId ?? "" };
  const queryKey = trpc.task.getByList.queryKey(queryInput);

  const { data: tasks = [], isPending: isTasksPending } = useQuery(
    trpc.task.getByList.queryOptions(queryInput, {
      staleTime: 5 * 60 * 1000,
      enabled: !!listId,
    }),
  );

  const task = tasks.find((t) => t.id === taskId);

  const deleteMutation = useMutation(
    trpc.task.delete.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });
        return {
          previousTasks: queryClient.getQueryData<typeof tasks>(queryKey),
        };
      },

      onError: (_, __, context) => {
        if (context?.previousTasks) {
          queryClient.setQueryData(queryKey, context.previousTasks);
        }
        showBanner({
          message: "Failed to delete task. Please try again.",
          variant: "error",
          duration: 4000,
        });
      },

      onSuccess: () => {
        queryClient.setQueryData<typeof tasks>(queryKey, (old = []) =>
          old.filter((t) => t.id !== taskId),
        );

        showBanner({
          message: "Task deleted successfully.",
          variant: "success",
          duration: 3000,
        });

        navigate({
          to: "/lists/$listId",
          params: { listId },
          replace: true,
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }),
  );

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  const isPending = deleteMutation.isPending;
  const taskTitle = task?.title ?? "this task";

  if (!listId || !taskId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        No list or task ID provided.
      </div>
    );
  }

  if (isTasksPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Task not found or you don't have access.
      </div>
    );
  }

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
            <div className="text-center space-y-4">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Delete "{taskTitle}"?
              </h1>
              <p className="text-lg text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                deleteMutation.mutate({ id: taskId });
              }}
              className="space-y-8"
              data-testid="delete-confirm-form"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isPending}
                  className="w-full sm:w-44"
                  data-testid="delete-confirm-button"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isPending ? "Deleting..." : "Delete Task"}
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
