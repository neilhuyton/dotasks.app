import { useState } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import { Outlet } from "@tanstack/react-router";

import EmptyLists from "@/components/EmptyLists";
import ListsHeader from "@/components/lists/ListsHeader";
import ListsTable from "@/components/lists/ListsTable";
import DeleteListConfirmModal from "@/components/modals/DeleteListConfirmModal";

import { listsIndexRoute } from "@/router/routes";

export default function ListsPage() {
  const { userId } = useAuthStore();

  const { data: lists = [], isLoading } = trpc.list.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const utils = trpc.useUtils();

  const navigate = listsIndexRoute.useNavigate();

  const [listToDelete, setListToDelete] = useState<string | null>(null);

  const deleteMutation = trpc.list.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.list.getAll.cancel();
      const previousLists = utils.list.getAll.getData();
      utils.list.getAll.setData(undefined, (old = []) =>
        old.filter((list) => list.id !== id)
      );
      return { previousLists };
    },
    onError: (err, _newList, context) => {
      if (context?.previousLists) {
        utils.list.getAll.setData(undefined, context.previousLists);
      }
      console.error("Failed to delete list:", err);
      // add toast here later: toast.error("Could not delete list")
    },
    onSettled: () => {
      utils.list.getAll.invalidate();
    },
    onSuccess: () => {
      setListToDelete(null);
      // Optional: toast.success("List deleted")
    },
  });

  const handleConfirmDelete = () => {
    if (listToDelete) {
      deleteMutation.mutate({ id: listToDelete });
    }
  };

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
        onDelete={(id) => setListToDelete(id)}
      />

      <DeleteListConfirmModal
        isOpen={!!listToDelete}
        listId={listToDelete ?? ""}
        onCancel={() => setListToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
}