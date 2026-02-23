// src/components/tasks/SortableTaskItem.tsx

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TaskItem } from "@/components/TaskItem";
import type { Task } from "@/hooks/useListTasks";
import { cn } from "@/lib/utils";

interface SortableTaskItemProps {
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
  isReordering: boolean;
}

export function SortableTaskItem({
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
  isReordering,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isReordering || isToggling || isDeleting || isSettingCurrent || task.isCompleted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ||
      "transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.18s ease",
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? 1.025 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        // IMPORTANT: NO touch-none / touch-action: none here or in parents
        isDragging && "shadow-2xl ring-2 ring-primary/40 z-50",
        "transition-all duration-200 rounded-lg border bg-card"
      )}
      {...attributes}
      {...listeners}
    >
      <TaskItem
        task={task}
        toggleTask={toggleTask}
        isToggling={isToggling}
        onDelete={onDelete}
        isDeleting={isDeleting}
        setCurrentTask={setCurrentTask}
        clearCurrentTask={clearCurrentTask}
        isSettingCurrent={isSettingCurrent}
        clearCurrentTaskPending={clearCurrentTaskPending}
        listId={listId}
      />
    </div>
  );
}