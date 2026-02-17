// src/routes/_authenticated/lists/$listId/tasks/new.tsx

import { createFileRoute } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "radix-ui";
import { trpc } from "@/trpc";

export const Route = createFileRoute('/_authenticated/lists/$listId/tasks/new')({
  component: NewTaskModalRoute,
})

function NewTaskModalRoute() {
  const { listId } = Route.useParams()  // type-safe from parent dynamic route

  const [title, setTitle] = useState("");

  const navigate = Route.useNavigate();
  const utils = trpc.useUtils();

  const mutation = trpc.task.create.useMutation({
    onMutate: async (input) => {
      await utils.task.getByList.cancel({ listId });

      const previousTasks = utils.task.getByList.getData({ listId }) ?? [];

      const optimisticTask = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title,
        description: null,
        listId: input.listId,
        dueDate: null,
        priority: null,
        order: previousTasks.length, // or Math.max(...previousTasks.map(t => t.order ?? 0)) + 1
        isCompleted: false,
        isCurrent: false,
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
      console.error("Failed to create task:", err);
      // TODO: toast "Failed to create task"
    },

    onSettled: () => {
      utils.task.getByList.invalidate({ listId });
    },

    onSuccess: () => {
      navigate({
        to: "/lists/$listId",
        params: { listId },
        replace: true,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    mutation.mutate({
      title: title.trim(),
      listId,
      // Add description, dueDate, priority etc. here if your schema supports them
    });

    setTitle("");
  };

  const handleClose = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 z-50",
          "h-[100dvh] w-[100dvw] max-h-none max-w-none",
          "m-0 p-0 left-0 top-0 translate-x-0 translate-y-0",
          "rounded-none border-0 shadow-none",
          "bg-background",
          "overscroll-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:max-w-none",
        )}
      >
        <div className="flex h-full flex-col">
          <header className="relative px-6 pt-16 pb-8 shrink-0">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-6 z-10"
                aria-label="Close"
                onClick={handleClose}
              >
                <X className="h-[1.2rem] w-[1.2rem]" />
              </Button>
            </DialogClose>

            <DialogTitle className="text-3xl font-bold tracking-tight text-center">
              New Task
            </DialogTitle>

            <VisuallyHidden.Root>
              <DialogDescription>
                Form to create a new task in the current list.
              </DialogDescription>
            </VisuallyHidden.Root>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-lg">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label
                    htmlFor="task-title"
                    className="text-base font-medium block"
                  >
                    What needs to be done?
                  </label>
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter task title..."
                    autoFocus
                    required
                    disabled={mutation.isPending}
                    className="h-14 text-lg"
                  />
                </div>

                {/* Add more fields later if needed, e.g. description, dueDate, priority */}
                {/* <div className="space-y-3">
                  <label>Description (optional)</label>
                  <Textarea ... />
                </div> */}

                <DialogFooter className="flex-col sm:flex-row gap-4 pt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={mutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={mutation.isPending || !title.trim()}
                    className="w-full sm:w-auto"
                  >
                    {mutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {mutation.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}