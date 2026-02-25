// src/components/lists/SortableListsTable.tsx

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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

import type { List } from "@/hooks/useLists";
import { SortableListItem } from "./SortableListItem";

interface SortableListsTableProps {
  lists: List[];
  updateListOrder: (updates: { id: string; order: number }[]) => void;
  isReordering: boolean;
}

export function SortableListsTable({
  lists,
  updateListOrder,
  isReordering,
}: SortableListsTableProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 300, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lists.findIndex((l) => l.id === active.id);
    const newIndex = lists.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newLists = arrayMove(lists, oldIndex, newIndex);

    const updates = newLists.map((list, idx) => ({
      id: list.id,
      order: idx,
    }));

    updateListOrder(updates);
  }

  if (lists.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">No lists yet</p>
        <p className="mt-2 text-sm">
          Create your first list to start organizing tasks.
        </p>
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
        items={lists.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2">
          {lists.map((list) => (
            <SortableListItem
              key={list.id}
              list={list}
              isReordering={isReordering}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
