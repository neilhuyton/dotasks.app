// src/components/tasks/TaskActionsDropdown.tsx

import {
  Star,
  Trash2,
  Pencil,
  // Pin,
  // PinOff,
  MoreHorizontal,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
// import { trpc } from "@/trpc";
import { type Task } from "@/hooks/useListTasks";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TaskActionsDropdownProps {
  task: Task;
  listId: string;
  isPending: boolean;
  isDeleting: boolean;
  onDelete: (taskId: string) => void;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  clearCurrentTask: (input: { listId: string }) => void;
}

export function TaskActionsDropdown({
  task,
  listId,
  isPending,
  isDeleting,
  onDelete,
  setCurrentTask,
  clearCurrentTask,
}: TaskActionsDropdownProps) {
  // const utils = trpc.useUtils();

  // const togglePinMutation = trpc.task.pinToggle.useMutation({
  //   onMutate: async ({ id }) => {
  //     const input = { listId };

  //     await utils.task.getByList.cancel(input);

  //     const previous = utils.task.getByList.getData(input) ?? [];

  //     utils.task.getByList.setData(input, (old = []) => {
  //       const next = old.map((t) =>
  //         t.id === id ? { ...t, isPinned: !t.isPinned } : t,
  //       );
  //       return next;
  //     });

  //     return { previous };
  //   },

  //   onError: (_, __, ctx) => {
  //     const input = { listId };
  //     if (ctx?.previous) {
  //       utils.task.getByList.setData(input, ctx.previous);
  //     }
  //   },

  //   onSettled: () => {
  //     const input = { listId };
  //     utils.task.getByList.invalidate(input);
  //   },
  // });

  const handleToggleCurrent = () => {
    if (task.isCompleted || isPending) return;
    if (task.isCurrent) {
      clearCurrentTask({ listId });
    } else {
      setCurrentTask({ id: task.id, listId });
    }
  };

  // const handleTogglePin = () => {
  //   if (isPending) return;
  //   togglePinMutation.mutate({ id: task.id });
  // };

  return (
    <div className="flex items-center gap-0.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/70"
            // Removed disabled here — always allow opening the menu
            title="More actions"
            aria-label={`More actions for task: ${task.title}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[180px]">
          {/* <DropdownMenuItem
            onClick={handleTogglePin}
            disabled={togglePinMutation.isPending || isPending}
            className={cn(
              "cursor-pointer",
              task.isPinned &&
                "text-amber-600 focus:bg-amber-50/50 focus:text-amber-700",
            )}
            data-testid="pin-toggle-menu-item"
          >
            {task.isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" /> Unpin
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" /> Pin to top
              </>
            )}
          </DropdownMenuItem> */}

          {!task.isCompleted && (
            <DropdownMenuItem
              onClick={handleToggleCurrent}
              disabled={isPending}  // ← disable action during pending
              className={cn(
                "cursor-pointer",
                task.isCurrent &&
                  "text-primary focus:bg-primary/10 focus:text-primary",
              )}
            >
              <Star
                className={cn(
                  "mr-2 h-4 w-4",
                  task.isCurrent && "fill-primary text-primary",
                )}
              />
              {task.isCurrent ? "Clear current" : "Set as current"}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild disabled={isDeleting || isPending}>
            <Link
              to="/lists/$listId/tasks/$taskId/edit"
              params={{ listId, taskId: task.id }}
              className={cn(
                "flex items-center cursor-pointer",
                (isDeleting || isPending) && "opacity-50 pointer-events-none",
              )}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onDelete(task.id)}
            disabled={isDeleting || isPending}  // ← disable during pending
            className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}