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
import { useUIStore } from "@/store/uiStore";

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
  const { setIsDragging } = useUIStore();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lists.findIndex((l) => l.id === active.id);
    const newIndex = lists.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newLists = arrayMove(lists, oldIndex, newIndex);

    const draggedId = active.id as string;

    let prevOrder: number | null = null;
    let nextOrder: number | null = null;

    const draggedNewIdx = newLists.findIndex((l) => l.id === draggedId);

    if (draggedNewIdx > 0) {
      prevOrder = newLists[draggedNewIdx - 1].order;
    }
    if (draggedNewIdx < newLists.length - 1) {
      nextOrder = newLists[draggedNewIdx + 1].order;
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

    updateListOrder(updates);
  }

  function handleDragStart() {
    setIsDragging(true);
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
      onDragStart={handleDragStart}
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
