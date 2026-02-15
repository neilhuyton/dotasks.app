// src/pages/ListsPage.tsx

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/trpc';
import { useAuthStore } from '@/store/authStore';
import EmptyLists from '@/components/EmptyLists';
import { listsIndexRoute } from '@/router/routes';

import ListsHeader from '@/components/lists/ListsHeader';
import ListsTable from '@/components/lists/ListsTable';
import CreateListModal from '@/components/lists/CreateListModal';
import DeleteListConfirmModal from '@/components/lists/DeleteListConfirmModal';

export default function ListsPage() {
  const { userId } = useAuthStore();
  const utils = trpc.useUtils();

  const { data: lists = [], isLoading } = trpc.list.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const createList = trpc.list.create.useMutation({
    onMutate: async (input) => {
      await utils.list.getAll.cancel();
      const prev = utils.list.getAll.getData() ?? [];
      const optimistic = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        userId: userId!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
      };
      utils.list.getAll.setData(undefined, [...prev, optimistic]);
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) utils.list.getAll.setData(undefined, ctx.prev);
    },
    onSuccess: (newList) => {
      utils.list.getAll.setData(
        undefined,
        (old = []) => old.map((l) => (l.id.startsWith('temp-') ? newList : l)),
      );
    },
  });

  const deleteList = trpc.list.delete.useMutation({
    onMutate: async (input) => {
      await utils.list.getAll.cancel();
      const prev = utils.list.getAll.getData() ?? [];
      utils.list.getAll.setData(
        undefined,
        prev.filter((l) => l.id !== input.id),
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) utils.list.getAll.setData(undefined, ctx.prev);
    },
  });

  const search = listsIndexRoute.useSearch();
  const navigate = listsIndexRoute.useNavigate();

  const isCreateModalOpen = search.modal === 'new-list';

  const openCreateModal = () =>
    navigate({ search: (prev) => ({ ...prev, modal: 'new-list' }) });

  const closeModal = () =>
    navigate({
      search: (prev) => {
        const next = { ...prev };
        delete next.modal;
        delete next.taskId;
        return next;
      },
    });

  const [listToDelete, setListToDelete] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (lists.length === 0) {
    return <EmptyLists createList={(input) => createList.mutate(input)} isPending={createList.isPending} />;
  }

  return (
    <div className="space-y-8">
      <ListsHeader onNewList={openCreateModal} isCreating={createList.isPending} />

      <ListsTable
        lists={lists}
        onDelete={(id) => setListToDelete(id)}
      />

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={closeModal}
        onCreate={(data) =>
          createList.mutate(data, {
            onSuccess: () => {
              closeModal();
            },
          })
        }
        isPending={createList.isPending}
      />

      <DeleteListConfirmModal
        isOpen={!!listToDelete}
        listId={listToDelete ?? ''}
        onCancel={() => setListToDelete(null)}
        onConfirm={() =>
          deleteList.mutate(
            { id: listToDelete! },
            { onSuccess: () => setListToDelete(null) },
          )
        }
        isDeleting={deleteList.isPending}
      />
    </div>
  );
}