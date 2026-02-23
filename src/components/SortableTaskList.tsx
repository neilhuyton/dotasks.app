// src/components/SortableTaskList.tsx

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
  isToggling: boolean;
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
  isToggling,
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
        distance: 5, // small movement threshold for desktop
      },
    }),
    useSensor(TouchSensor, {
      // Key change for mobile: delay allows scrolling before drag starts
      activationConstraint: {
        delay: 250,     // 250 ms hold → good balance (180–300 ms range)
        tolerance: 5,   // small finger movement allowed during delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTasks = tasks.filter((t) => !t.isCompleted);

    const oldIndex = activeTasks.findIndex((t) => t.id === active.id);
    const newIndex = activeTasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newActiveTasks = arrayMove(activeTasks, oldIndex, newIndex);

    const updates = newActiveTasks.map((task, idx) => ({
      id: task.id,
      order: idx,
    }));

    updateTaskOrder(updates);
  }

  const activeTasks = tasks.filter((t) => !t.isCompleted);

  if (activeTasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">All tasks are completed! 🎉</p>
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
          className="space-y-3 transition-all duration-200 ease-out will-change-transform"
          style={{ minHeight: "200px" }}
        >
          {activeTasks.map((task) => (
            <SortableTaskItem
              key={task.id}
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
              isReordering={isReordering}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}