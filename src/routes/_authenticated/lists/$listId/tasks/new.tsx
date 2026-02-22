// src/routes/_authenticated/lists/$listId/tasks/new.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lists/$listId/tasks/new")(
  {
    component: NewTaskPage,
  },
);

function NewTaskPage() {
  const { listId } = Route.useParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const navigate = Route.useNavigate();
  const utils = trpc.useUtils();

  const mutation = trpc.task.create.useMutation({
    onMutate: async (input) => {
      await utils.task.getByList.cancel({ listId });

      const previousTasks = utils.task.getByList.getData({ listId }) ?? [];

      const optimisticTask = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title,
        description: input.description ?? null,
        listId: input.listId,
        dueDate: null,
        priority: null,
        order: previousTasks.length,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      utils.task.getByList.setData({ listId }, [
        ...previousTasks,
        optimisticTask,
      ]);

      return { previousTasks };
    },

    onError: (err, _newTask, context) => {
      if (context?.previousTasks) {
        utils.task.getByList.setData({ listId }, context.previousTasks);
      }
      toast.error("Failed to create task");
      console.error("Failed to create task:", err);
    },

    onSettled: () => {
      utils.task.getByList.invalidate({ listId });
    },

    onSuccess: (createdTask) => {
      toast.success(`Task "${createdTask.title}" added`);
      navigate({
        to: "/lists/$listId",
        params: { listId },
        replace: true,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const desc = description.trim() || undefined;

    // Clear form immediately (optimistic UX)
    setTitle("");
    setDescription("");

    mutation.mutate({
      title: trimmedTitle,
      listId,
      description: desc,
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
        "fixed inset-0 z-9999 isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none",
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 z-10000"
          aria-label="Back to list"
          onClick={handleCancel}
          disabled={isPending}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="w-full max-w-lg space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">New Task</h1>

            <form
              onSubmit={handleSubmit}
              data-testid="new-task-form"
              aria-labelledby="new-task-heading"
              className="space-y-8"
              autoComplete="off"
            >
              <div className="space-y-6 text-left">
                <div className="space-y-3">
                  <label
                    htmlFor="task-title"
                    className="text-base font-medium block"
                  >
                    What needs to be done?{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="task-title"
                    name="task-title-new"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title..."
                    autoFocus
                    required
                    disabled={isPending}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-3">
                  <label
                    htmlFor="task-description"
                    className="text-base font-medium block"
                  >
                    Notes / Details (optional)
                  </label>
                  <Textarea
                    id="task-description"
                    name="task-description-new"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any notes, steps, links, or extra context..."
                    rows={5}
                    disabled={isPending}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-8">
                <Button
                  type="submit"
                  disabled={isPending || !title.trim()}
                  className="w-full sm:w-40"
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {isPending ? "Creating..." : "Create Task"}
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
