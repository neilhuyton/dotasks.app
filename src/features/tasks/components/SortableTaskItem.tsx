// src/features/tasks/components/SortableTaskItem.tsx

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Task } from "@/hooks/useListTasks";
import { cn } from "@/shared/lib/utils";
import { TaskItem } from "./TaskItem";

interface SortableTaskItemProps {
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
  isReordering: boolean;
}

export function SortableTaskItem({
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
    disabled:
      isReordering ||
      pendingToggleIds.has(task.id) ||
      isDeleting ||
      isSettingCurrent ||
      task.isCompleted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition:
      transition ||
      "transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.18s ease",
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        isDragging && "shadow-2xl ring-2 ring-primary/50 z-50 scale-[1.02]",
        "transition-all duration-200",
      )}
      {...attributes}
      {...listeners}
    >
      <TaskItem
        task={task}
        toggleTask={toggleTask}
        pendingToggleIds={pendingToggleIds}
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