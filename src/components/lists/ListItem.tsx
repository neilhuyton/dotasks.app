// src/components/lists/ListItem.tsx

import { Link } from "@tanstack/react-router";
import { ListActionsDropdown } from "./ListActionsDropdown";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react"; // ← add this import
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "server/trpc";

type RouterOutput = inferRouterOutputs<AppRouter>;
type ApiList = RouterOutput["list"]["getAll"][number];

interface ListItemProps {
  list: ApiList;
}

export function ListItem({ list }: ListItemProps) {
  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list.id }}
      className="block outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
    >
      <Item
        variant="outline"
        className={cn(
          "min-h-[52px]",
          "px-3 py-2",
          "transition-colors duration-150",
          "border hover:bg-muted/30 dark:hover:bg-muted/40",
          "cursor-pointer group", // ← added group for hover effects
          "bg-card/80 dark:bg-muted/30",
        )}
      >
        <div className="flex items-center justify-between w-full gap-3">
          <ItemContent className="min-w-0 flex-1 py-0.5">
            <div className="flex items-center gap-1.5">
              <ItemTitle className="text-sm font-medium leading-tight truncate">
                {list.title}
              </ItemTitle>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground/70",
                  "transition-transform duration-150",
                  "group-hover:translate-x-0.5 group-hover:text-muted-foreground/90",
                )}
                aria-hidden="true"
              />
            </div>

            {list.description && (
              <p className="mt-0.5 text-xs text-muted-foreground leading-tight line-clamp-1">
                {list.description}
              </p>
            )}
          </ItemContent>

          <div className="flex items-center shrink-0">
            <ListActionsDropdown list={list} />
          </div>
        </div>
      </Item>
    </Link>
  );
}
