// src/components/lists/ListsTable.tsx

import { useAuthStore } from "@/store/authStore";
import { trpc } from "@/trpc";
import { ItemGroup } from "@/components/ui/item";
import { ListItem } from "./ListItem";

export default function ListsTable() {
  const { userId } = useAuthStore();

  const {
    data: lists = [],
    isLoading,
    error,
  } = trpc.list.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Failed to load lists.
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No lists yet.
      </div>
    );
  }

  return (
    <ItemGroup className="flex flex-col gap-2">
      {lists.map((list) => (
        <ListItem key={list.id} list={list} />
      ))}
    </ItemGroup>
  );
}