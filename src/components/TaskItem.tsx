// src/components/TaskItem.tsx
import { Star, Trash2 } from "lucide-react";
import { type Task } from "@/hooks/useListTasks";

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
  const isPending = isSettingCurrent || clearCurrentTaskPending;

  const handleToggleCurrent = () => {
    if (task.isCompleted || isPending) return;

    if (task.isCurrent) {
      clearCurrentTask({ listId });
    } else {
      setCurrentTask({ id: task.id, listId });
    }
  };

  return (
    <Item
      variant="outline"
      size="default"
      className={cn(
        // Subtle background layer for depth (common in dark mode lists/cards)
        "bg-card/80 dark:bg-muted/30", // ← key: slight transparency or muted overlay
        "transition-colors duration-150",
        task.isCompleted && "opacity-60 dark:opacity-50",
        task.isCurrent &&
          "bg-primary/10 border-primary/40 dark:bg-primary/15 shadow-sm",
        "hover:bg-muted/20 dark:hover:bg-muted/40", // gentle hover lift
      )}
    >
      <ItemMedia variant="icon" className="self-center">
        <Checkbox
          checked={task.isCompleted}
          onCheckedChange={() => toggleTask({ id: task.id })}
          disabled={isToggling}
          className="translate-y-[2px] h-4 w-4" // match small checkbox size
        />
      </ItemMedia>

      <ItemContent className="min-w-0 py-0.5">
        <ItemTitle
          className={cn(
            "text-sm font-medium leading-snug", // ← key: text-sm + leading-snug
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
          >
            <Star className={cn("h-4 w-4", task.isCurrent && "fill-primary")} />
          </button>
        )}

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
