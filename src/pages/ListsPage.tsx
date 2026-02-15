// src/pages/ListsPage.tsx

import { Loader2 } from "lucide-react";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import { Outlet } from "@tanstack/react-router";

import EmptyLists from "@/components/EmptyLists";
import ListsHeader from "@/components/lists/ListsHeader";
import ListsTable from "@/components/lists/ListsTable";

import { listsIndexRoute } from "@/router/routes";

export default function ListsPage() {
  const { userId } = useAuthStore();

  const { data: lists = [], isLoading } = trpc.list.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const navigate = listsIndexRoute.useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <EmptyLists
        createList={() => navigate({ to: "/lists/new" as string })}
        isPending={false}
      />
    );
  }

  return (
    <div className="space-y-8">
      <ListsHeader
        onNewList={() => navigate({ to: "/lists/new" as string })}
        isCreating={false}
      />

      <ListsTable
        lists={lists}
        onDelete={(id) =>
          navigate({
            to: "/lists/$listId/delete",
            params: { listId: id },
          })
        }
      />

      <Outlet />
    </div>
  );
}