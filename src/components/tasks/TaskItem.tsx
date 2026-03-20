import { cn } from "@/lib/utils";
import { type Task } from "@/hooks/useListTasks";

import { Item, ItemContent, ItemTitle, ItemMedia } from "@/components/ui/item";
import { TaskCheckbox } from "@/components/ui/task-checkbox";
import { TaskActionsDropdown } from "./TaskActionsDropdown";
import { Loader2 } from "lucide-react";

interface TaskItemProps {
  task: Task;
  toggleTask: (input: { id: string }) => void;
  pendingToggleIds: Set<string>;
  onDelete: (taskId: string) => void;
  isDeleting: boolean;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  clearCurrentTask: (input: { listId: string }) => void;
  isSettingCurrent: boolean;
  clearCurrentTaskPending: boolean;
  listId: string;
}

export function TaskItem({
  task,
  toggleTask,
  pendingToggleIds,
  onDelete,
  isDeleting,
  setCurrentTask,
  clearCurrentTask,
  isSettingCurrent,
  clearCurrentTaskPending,
  listId,
}: TaskItemProps) {
  const isThisTaskToggling = pendingToggleIds.has(task.id);

  const isPending =
    isSettingCurrent ||
    clearCurrentTaskPending ||
    isDeleting ||
    isThisTaskToggling;

  return (
    <Item
      variant="outline"
      className={cn(
        "min-h-[56px]",
        "px-3 py-3",
        "cursor-grab active:cursor-grabbing",
        "select-none",
        "flex items-center gap-x-2",
        "bg-card/80 dark:bg-muted/30 transition-colors duration-150",
        task.isCompleted && "opacity-60 dark:opacity-50",
        task.isCurrent &&
          "bg-primary/10 border-primary/40 dark:bg-primary/15 shadow-sm",
        task.isPinned &&
          "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
        "hover:bg-muted/20 dark:hover:bg-muted/40",
        isThisTaskToggling && "opacity-75",
      )}
    >
      <ItemMedia
        variant="icon"
        className="self-center p-0 m-0 border-none bg-transparent relative"
      >
        <TaskCheckbox
          checked={task.isCompleted}
          onCheckedChange={() => {
            if (!isThisTaskToggling) {
              toggleTask({ id: task.id });
            }
          }}
          disabled={
            isThisTaskToggling ||
            isDeleting ||
            isSettingCurrent ||
            clearCurrentTaskPending
          }
          className="cursor-pointer"
        />

        {isThisTaskToggling && (
          <Loader2 className="absolute -left-6 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </ItemMedia>

      <ItemContent className="min-w-0 py-0 flex-1">
        <ItemTitle
          className={cn(
            "text-sm font-medium leading-tight",
            task.isCompleted && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </ItemTitle>
      </ItemContent>

      <TaskActionsDropdown
        task={task}
        listId={listId}
        isPending={isPending}
        isDeleting={isDeleting}
        onDelete={onDelete}
        setCurrentTask={setCurrentTask}
        clearCurrentTask={clearCurrentTask}
      />
    </Item>
  );
}
