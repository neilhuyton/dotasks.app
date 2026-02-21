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
      <div className="space-y-3 min-h-[50vh] flex flex-col justify-start">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/30 rounded animate-pulse" />
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
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">No lists yet</p>
        <p className="mt-2 text-sm">
          Create your first list to start organizing tasks.
        </p>
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
