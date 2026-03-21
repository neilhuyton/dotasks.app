import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ListItem } from "./ListItem";
import type { List } from "@/hooks/list/useListRead";
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
  transition:
    transition ||
    "transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.18s ease",
  opacity: isDragging ? 0.75 : 1,
};

  const content = (
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
      <ListItem list={list} isDragging={isDragging} />
    </div>
  );

  // Only wrap in Link when NOT dragging
  // (prevents navigation during drag + keeps ref stable)
  return isDragging ? content : (
    <Link
      to="/lists/$listId"
      params={{ listId: list.id }}
      className="block touch-manipulation"
    >
      {content}
    </Link>
  );
}