// src/features/tasks/components/TaskItem.tsx

import { cn } from "@/shared/lib/utils";
import { type Task } from "@/hooks/useListTasks";

import {
  Item,
  ItemContent,
  ItemTitle,
  ItemMedia,
} from "@/app/components/ui/item";
import { TaskCheckbox } from "@/app/components/ui/task-checkbox";
import { TaskActionsDropdown } from "./TaskActionsDropdown";



interface TaskItemProps {
  task: Task;
  toggleTask: (input: { id: string }) => void;
  isToggling: boolean;
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
  isToggling,
  onDelete,
  isDeleting,
  setCurrentTask,
  clearCurrentTask,
  isSettingCurrent,
  clearCurrentTaskPending,
  listId,
}: TaskItemProps) {
  const isPending =
    isSettingCurrent || clearCurrentTaskPending || isDeleting || isToggling;

  return (
    <Item
      variant="outline"
      className={cn(
        "px-3 py-2 min-h-[52px] cursor-grab active:cursor-grabbing",
        "select-none",
        "flex items-center gap-x-2",
        "bg-card/80 dark:bg-muted/30 transition-colors duration-150",
        task.isCompleted && "opacity-60 dark:opacity-50",
        task.isCurrent &&
          "bg-primary/10 border-primary/40 dark:bg-primary/15 shadow-sm",
        task.isPinned &&
          "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
        "hover:bg-muted/20 dark:hover:bg-muted/40",
      )}
    >
      <ItemMedia
        variant="icon"
        className="self-center p-0 m-0 border-none bg-transparent"
      >
        <TaskCheckbox
          checked={task.isCompleted}
          onCheckedChange={() => toggleTask({ id: task.id })}
          disabled={isToggling}
          className="cursor-pointer"
        />
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
