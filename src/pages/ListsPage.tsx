// src/pages/ListsPage.tsx

import { Link } from "@tanstack/react-router";
import { Plus, Loader2, X } from "lucide-react";
import { trpc } from "@/trpc";
import { useAuthStore } from "@/store/authStore";
import EmptyLists from "@/components/EmptyLists";
import { listDetailRoute } from "@/router/routes";
import { useState } from "react";

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
      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((l) => (l.id.startsWith("temp-") ? newList : l)),
      );
    },
  });

  // ── New list form state ──────────────────────────────────────────────
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const handleCreateNewList = () => {
    if (!newListTitle.trim()) return;
    createList.mutate({ title: newListTitle.trim() });
    setNewListTitle("");
    setShowNewListForm(false);
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
        createList={(input) => createList.mutate(input)}
        isPending={createList.isPending}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">My Lists</h1>

        {showNewListForm ? (
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <input
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="Enter list name..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateNewList();
                if (e.key === "Escape") setShowNewListForm(false);
              }}
              disabled={createList.isPending}
            />
            <button
              onClick={handleCreateNewList}
              disabled={createList.isPending || !newListTitle.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {createList.isPending ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowNewListForm(false)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setShowNewListForm(true);
              setNewListTitle("");
            }}
            disabled={createList.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-60 transition"
          >
            <Plus size={18} />
            New List
          </button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={listDetailRoute.to}
            params={{ listId: list.id }}
            className="group block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-700">
              {list.title}
            </h2>
            {list.description && (
              <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                {list.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
