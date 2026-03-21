import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";
import { RouteError } from "@steel-cut/steel-lib";
import { useQuery } from "@tanstack/react-query";
import { useTaskDelete } from "@/hooks/task/useTaskDelete";

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

  errorComponent: ({ error, reset }) => (
    <RouteError
      error={error}
      reset={reset}
      title="Failed to load task for deletion"
      backLabel="Back to List"
    />
  ),

  component: DeleteTaskConfirmPage,
});

function DeleteTaskConfirmPage() {
  const { listId, taskId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { deleteTask, isDeleting } = useTaskDelete(listId);

  const queryInput = { listId: listId ?? "" };

  const { data: tasks = [], isPending: isTasksPending } = useQuery(
    trpc.task.getByList.queryOptions(queryInput, {
      staleTime: 5 * 60 * 1000,
      enabled: !!listId,
    }),
  );

  const task = tasks.find((t) => t.id === taskId);
  const taskTitle = task?.title ?? "this task";

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId) return;

    deleteTask(taskId, {
      onSuccess: () => {
        navigate({
          to: "/lists/$listId",
          params: { listId },
          replace: true,
        });
      },
    });
  };

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

  // Hide "not found" during deletion — optimistic removal means task disappears from cache
  if (!task && !isDeleting) {
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
          disabled={isDeleting}
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
              onSubmit={handleDelete}
              className="space-y-8"
              data-testid="delete-confirm-form"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isDeleting}
                  className="w-full sm:w-44"
                  data-testid="delete-confirm-button"
                >
                  {isDeleting && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isDeleting ? "Deleting..." : "Delete Task"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isDeleting}
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