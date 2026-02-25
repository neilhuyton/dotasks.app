// src/components/lists/SortableListItem.tsx — full corrected file

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ListItem } from "./ListItem";
import type { List } from "@/hooks/useLists";
import { Link } from "@tanstack/react-router";

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
    opacity: isDragging ? 0.82 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md transition-all duration-200 ease-out",
        isDragging && "shadow-lg ring-2 ring-primary/40 scale-[1.015] z-10",
      )}
      {...attributes}
      {...listeners}
    >
      {isDragging ? (
        <div className="block touch-manipulation">
          <ListItem list={list} isDragging={isDragging} />
        </div>
      ) : (
        <Link
          to="/lists/$listId"
          params={{ listId: list.id }}
          className="block touch-manipulation"
        >
          <ListItem list={list} isDragging={isDragging} />
        </Link>
      )}
    </div>
  );
}
