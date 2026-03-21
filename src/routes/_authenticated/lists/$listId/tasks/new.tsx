import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";
import { useBannerStore } from "@steel-cut/steel-lib";
import { useTaskCreate } from "@/hooks/task/useTaskCreate";

export const Route = createFileRoute("/_authenticated/lists/$listId/tasks/new")(
  {
    loader: async ({ context: { queryClient }, params }) => {
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
  const { show: showBanner } = useBannerStore();

  const { createTask, createTaskPending } = useTaskCreate(listId);

  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    createTask({ title: trimmed, listId }, () => {
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
    });
  };

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  const isPending = createTaskPending;

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
