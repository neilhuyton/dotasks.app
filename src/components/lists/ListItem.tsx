// src/components/lists/ListItem.tsx

import { Link } from "@tanstack/react-router";
import { ListActionsDropdown } from "./ListActionsDropdown";
import {
  Item,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
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
        size="sm"
        className={cn(
          "min-h-0 transition-colors duration-150",
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

          {/* Always visible ⋯ button – same as TaskActionsDropdown */}
          <div className="flex items-center gap-0.5">
            <ListActionsDropdown list={list} />
          </div>
        </div>
      </Item>
    </Link>
  );
}