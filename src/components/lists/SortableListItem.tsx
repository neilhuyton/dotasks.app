// src/components/lists/SortableListItem.tsx

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListItem } from "./ListItem";
import { cn } from "@/lib/utils";
import type { List } from "@/hooks/useLists";

interface SortableListItemProps {
  list: List;
  isReordering: boolean;
}

export function SortableListItem({
  list,
  isReordering,
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    disabled: isReordering,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 0.18s ease",
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        isDragging && "shadow-xl ring-2 ring-primary/40 scale-[1.02] z-10",
      )}
      {...attributes}
      {...listeners}
    >
      <ListItem list={list} />
    </div>
  );
}
