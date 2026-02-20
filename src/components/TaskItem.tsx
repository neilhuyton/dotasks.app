// src/components/TaskItem.tsx

import { Star, Trash2, Pencil, Pin, PinOff } from "lucide-react";
import { type Task } from "@/hooks/useListTasks";
import { Link } from "@tanstack/react-router";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";

interface TaskItemProps {
  task: Task;
  toggleTask: (input: { id: string }) => void;
  isToggling: boolean;
  onDelete: (taskId: string) => void;
  isDeleting: boolean;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  isSettingCurrent: boolean;
  clearCurrentTask: (input: { listId: string }) => void;
  clearCurrentTaskPending: boolean;
  listId: string;
}

export function TaskItem({
  task,
  toggleTask,
  isToggling,
  onDelete,
  isDeleting,
  setCurrentTask,
  isSettingCurrent,
  clearCurrentTask,
  clearCurrentTaskPending,
  listId,
}: TaskItemProps) {
  const isPending = isSettingCurrent || clearCurrentTaskPending || isDeleting || isToggling;

  const utils = trpc.useUtils();

  const togglePinMutation = trpc.task.pinToggle.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await utils.task.getByList.cancel({ listId });

      // Snapshot previous value
      const previousTasks = utils.task.getByList.getData({ listId }) ?? [];

      // Optimistically flip isPinned
      utils.task.getByList.setData({ listId }, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, isPinned: !t.isPinned } : t))
      );

      return { previousTasks };
    },

    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        utils.task.getByList.setData({ listId }, context.previousTasks);
      }
    },

    onSettled: () => {
      // Refetch to sync with server
      utils.task.getByList.invalidate({ listId });
    },
  });

  const handleToggleCurrent = () => {
    if (task.isCompleted || isPending) return;

    if (task.isCurrent) {
      clearCurrentTask({ listId });
    } else {
      setCurrentTask({ id: task.id, listId });
    }
  };

  const handleTogglePin = () => {
    if (isPending) return;
    togglePinMutation.mutate({ id: task.id });
  };

  return (
    <Item
      variant="outline"
      size="default"
      className={cn(
        // Subtle background layer for depth
        "bg-card/80 dark:bg-muted/30",
        "transition-colors duration-150",
        task.isCompleted && "opacity-60 dark:opacity-50",
        task.isCurrent &&
          "bg-primary/10 border-primary/40 dark:bg-primary/15 shadow-sm",
        task.isPinned &&
          "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
        "hover:bg-muted/20 dark:hover:bg-muted/40",
      )}
    >
      <ItemMedia variant="icon" className="self-center">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => toggleTask({ id: task.id })}
          disabled={isToggling}
          className="translate-y-[2px] h-4 w-4"
        />
      </ItemMedia>

      <ItemContent className="min-w-0 py-0.5">
        <ItemTitle
          className={cn(
            "text-sm font-medium leading-snug",
            task.isCompleted && "line-through text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-1.5">
            {task.title}
            {task.isCurrent && (
              <Star className="inline h-3.5 w-3.5 text-primary fill-primary flex-shrink-0" />
            )}
          </div>
        </ItemTitle>

        {task.description && (
          <ItemDescription className="mt-0.5 text-sm text-muted-foreground leading-normal line-clamp-2">
            {task.description}
          </ItemDescription>
        )}
      </ItemContent>

      <ItemActions className="items-center gap-0.5">
        {/* Pin button – new */}
        <button
          type="button"
          onClick={handleTogglePin}
          disabled={togglePinMutation.isPending || isPending}
          className={cn(
            "rounded p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50/70 transition-colors",
            task.isPinned && "text-amber-600 hover:text-amber-700",
            (togglePinMutation.isPending || isPending) && "opacity-50 pointer-events-none",
          )}
          title={task.isPinned ? "Unpin task" : "Pin task to top"}
          aria-label={task.isPinned ? `Unpin ${task.title}` : `Pin ${task.title}`}
        >
          {task.isPinned ? (
            <Pin className="h-4 w-4 fill-amber-500 text-amber-600" />
          ) : (
            <PinOff className="h-4 w-4" />
          )}
        </button>

        {!task.isCompleted && (
          <button
            type="button"
            onClick={handleToggleCurrent}
            disabled={isPending}
            className={cn(
              "rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors",
              task.isCurrent && "text-primary hover:text-primary",
              isPending && "opacity-50 pointer-events-none",
            )}
            title={task.isCurrent ? "Clear current" : "Set as current"}
            aria-label={task.isCurrent ? "Clear current task" : "Set as current task"}
          >
            <Star className={cn("h-4 w-4", task.isCurrent && "fill-primary")} />
          </button>
        )}

        {/* Edit button */}
        <Link
          to="/lists/$listId/tasks/$taskId/edit"
          params={{ listId, taskId: task.id }}
          className={cn(
            "rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors",
            isDeleting && "opacity-60",
          )}
          title="Edit task"
          aria-label={`Edit task: ${task.title}`}
        >
          <Pencil className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={isDeleting}
          className={cn(
            "rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            isDeleting && "opacity-50 pointer-events-none",
          )}
          title="Delete task"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </ItemActions>
    </Item>
  );
}