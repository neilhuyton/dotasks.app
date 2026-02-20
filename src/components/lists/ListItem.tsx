// src/components/lists/ListItem.tsx

import { Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ApiList = RouterOutput["list"]["getAll"][number];

export function ListItem({ list }: { list: ApiList }) {
  const navigate = useNavigate();

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();      // ← prevent outer link navigation
    e.stopPropagation();
    navigate({
      to: "/lists/$listId/edit",
      params: { listId: list.id },
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({
      to: "/lists/$listId/delete",
      params: { listId: list.id },
    });
  };

  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list.id }}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
    >
      <Item
        variant="outline"
        size="sm"
        className={cn(
          "group min-h-0 transition-colors duration-150",
          "border hover:bg-muted/30 dark:hover:bg-muted/40",
          "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 w-full">
          {list.icon && (
            <div className="shrink-0 text-sm opacity-70">{list.icon}</div>
          )}

          <ItemContent className="flex-1 min-w-0">
            <ItemTitle className="text-sm font-medium leading-none truncate">
              {list.title}
            </ItemTitle>
          </ItemContent>

          <ItemActions className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Edit – plain button + navigate */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-primary hover:bg-muted/80 p-0"
              onClick={handleEdit}
              title="Edit"
              aria-label={`Edit list: ${list.title}`}
            >
              <Pencil size={12} />
            </Button>

            {/* Delete – same pattern */}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-0"
              onClick={handleDelete}
              title="Delete"
              aria-label={`Delete list: ${list.title}`}
            >
              <Trash2 size={12} />
            </Button>
          </ItemActions>
        </div>
      </Item>
    </Link>
  );
}