// src/pages/ListsPage.tsx
import { Link } from '@tanstack/react-router';
import { Plus, Loader2, X, Trash2 } from 'lucide-react';
import { trpc } from '@/trpc';
import { useAuthStore } from '@/store/authStore';
import EmptyLists from '@/components/EmptyLists';
import { listsIndexRoute, listDetailRoute } from '@/router/routes';
import { useState } from 'react';

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
    onSuccess: () => {
      // Optional: utils.list.getAll.invalidate();
    },
  });

  const search = listsIndexRoute.useSearch();
  const navigate = listsIndexRoute.useNavigate();

  const isNewListModalOpen = search.modal === 'new-list';

  const openNewListModal = () => {
    navigate({
      search: (prev) => ({
        ...(prev ?? {}),
        modal: 'new-list' as const,
      }),
    });
  };

  const closeModal = () => {
    navigate({
      search: (prev) => {
        const next = { ...(prev ?? {}) };
        delete next.modal;
        delete next.taskId;
        return next;
      },
    });
  };

  // Form state for create modal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateList = () => {
    if (!title.trim()) return;

    createList.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          closeModal();
        },
      },
    );
  };

  // Delete confirmation state
  const [listToDelete, setListToDelete] = useState<string | null>(null);

  const confirmDelete = (listId: string) => {
    setListToDelete(listId);
  };

  const handleDelete = () => {
    if (!listToDelete) return;

    deleteList.mutate(
      { id: listToDelete },
      {
        onSuccess: () => {
          setListToDelete(null);
          // toast.success("List deleted") // ← add if you have toast
        },
      },
    );
  };

  const cancelDelete = () => setListToDelete(null);

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
        createList={(input) => createList.mutate(input)}
        isPending={createList.isPending}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">My Lists</h1>

        <button
          onClick={openNewListModal}
          disabled={createList.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-60 transition"
        >
          <Plus size={18} />
          New List
        </button>
      </div>

      {/* Create New List Modal */}
      {isNewListModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create New List</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-800 rounded-full p-1 hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="List name (e.g. Work, Groceries, Ideas)"
              className="w-full border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
              required
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={createList.isPending || !title.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
              >
                {createList.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createList.isPending ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {listToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-3">Delete this list?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Tasks in this list will no longer be associated with any list.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-5 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteList.isPending}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
              >
                {deleteList.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleteList.isPending ? 'Deleting...' : 'Delete List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table / List view */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900"
                >
                  List Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-sm font-semibold text-gray-900 hidden md:table-cell"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-right text-sm font-semibold text-gray-900"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {lists.map((list) => (
                <tr
                  key={list.id}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={listDetailRoute.to}
                      params={{ listId: list.id }}
                      className="text-lg font-medium text-gray-900 hover:text-blue-700 transition"
                    >
                      {list.title}
                    </Link>
                  </td>

                  <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell max-w-md">
                    {list.description ? (
                      <div className="line-clamp-2">{list.description}</div>
                    ) : (
                      <span className="text-gray-400 italic">No description</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        confirmDelete(list.id);
                      }}
                      className="text-gray-400 hover:text-red-600 transition p-1 rounded hover:bg-red-50"
                      title="Delete list"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}