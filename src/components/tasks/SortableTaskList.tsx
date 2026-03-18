import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import type { Task } from "@/hooks/useListTasks";
import { SortableTaskItem } from "@/components/tasks/SortableTaskItem";

interface SortableTaskListProps {
  tasks: Task[];
  toggleTask: (input: { id: string }) => void;
  pendingToggleIds: Set<string>;
  onDelete: (taskId: string) => void;
  isDeleting: boolean;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  clearCurrentTask: (input: { listId: string }) => void;
  isSettingCurrent: boolean;
  clearCurrentTaskPending: boolean;
  listId: string;
  updateTaskOrder: (updates: { id: string; order: number }[]) => void;
  isReordering: boolean;
}

export function SortableTaskList({
  tasks,
  toggleTask,
  pendingToggleIds,
  onDelete,
  isDeleting,
  setCurrentTask,
  clearCurrentTask,
  isSettingCurrent,
  clearCurrentTaskPending,
  listId,
  updateTaskOrder,
  isReordering,
}: SortableTaskListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 350,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTasks = tasks.filter((t) => !t.isCompleted);

    const oldIndex = activeTasks.findIndex((t) => t.id === active.id);
    const newIndex = activeTasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newActiveTasks = arrayMove(activeTasks, oldIndex, newIndex);

    const draggedId = active.id as string;

    let prevOrder: number | null = null;
    let nextOrder: number | null = null;

    const draggedNewIdx = newActiveTasks.findIndex((t) => t.id === draggedId);

    if (draggedNewIdx > 0) {
      prevOrder = newActiveTasks[draggedNewIdx - 1].order;
    }
    if (draggedNewIdx < newActiveTasks.length - 1) {
      nextOrder = newActiveTasks[draggedNewIdx + 1].order;
    }

    let newOrder: number;
    if (prevOrder === null && nextOrder === null) {
      newOrder = 0;
    } else if (prevOrder === null) {
      newOrder = nextOrder! - 1000;
    } else if (nextOrder === null) {
      newOrder = prevOrder + 1000;
    } else {
      newOrder = (prevOrder + nextOrder) / 2;
    }

    const updates = [{ id: draggedId, order: newOrder }];

    updateTaskOrder(updates);
  }

  const activeTasks = tasks.filter((t) => !t.isCompleted);

  if (activeTasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">All tasks are completed!</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis]}
    >
      <SortableContext
        items={activeTasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="space-y-2 transition-all duration-200 ease-out will-change-transform"
          style={{ minHeight: "200px" }}
        >
          {activeTasks.map((task) => (
            <SortableTaskItem
              key={task.id}
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
              isReordering={isReordering}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
