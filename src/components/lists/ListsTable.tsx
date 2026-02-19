// src/components/lists/ListsTable.tsx

import { Link, linkOptions } from "@tanstack/react-router";
import { Pencil, Trash2, Pin, PinOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { trpc } from "@/trpc";
import { Button } from "@/components/ui/button"; // assuming shadcn/ui Button
import { cn } from "@/lib/utils"; // assuming you have this utility

export default function ListsTable() {
  const { userId } = useAuthStore();

  const {
    data: lists = [],
    isLoading,
    error,
  } = trpc.list.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const utils = trpc.useUtils();

  const togglePinMutation = trpc.list.pin.useMutation({
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await utils.list.getAll.cancel();

      // Snapshot previous value
      const previousLists = utils.list.getAll.getData() ?? [];

      // Optimistically update
      utils.list.getAll.setData(undefined, (old = []) =>
        old.map((list) =>
          list.id === id ? { ...list, isPinned: !list.isPinned } : list
        )
      );

      return { previousLists };
    },

    onError: (err, newValue, context) => {
      // Rollback on error
      if (context?.previousLists) {
        utils.list.getAll.setData(undefined, context.previousLists);
      }
      console.error("Failed to toggle pin:", err);
    },

    onSettled: () => {
      // Refetch to be sure (also catches server-side changes)
      utils.list.getAll.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
        <div className="text-red-600 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Failed to load your lists
        </h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          We encountered an error while trying to fetch your lists. Please try
          again later.
        </p>
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-6 text-xl font-medium text-gray-900">No lists yet</h3>
        <p className="mt-3 text-gray-600 max-w-md mx-auto">
          Create your first list to organize tasks, groceries, ideas, or
          anything else.
        </p>
      </div>
    );
  }

  // Actual table with pin button
  return (
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
                className={cn(
                  "hover:bg-gray-50 transition-colors group",
                  list.isPinned && "bg-indigo-50/40 hover:bg-indigo-50/60"
                )}
              >
                <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                  {/* Pin toggle button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-gray-400 hover:text-amber-600 -ml-2",
                      togglePinMutation.isPending && "opacity-50 cursor-wait"
                    )}
                    onClick={() => togglePinMutation.mutate({ id: list.id })}
                    disabled={togglePinMutation.isPending}
                    title={list.isPinned ? "Unpin list" : "Pin list to top"}
                    aria-label={list.isPinned ? `Unpin ${list.title}` : `Pin ${list.title}`}
                  >
                    {list.isPinned ? (
                      <Pin className="h-5 w-5 fill-amber-500 text-amber-600" />
                    ) : (
                      <PinOff className="h-5 w-5" />
                    )}
                  </Button>

                  <Link
                    {...linkOptions({
                      to: "/lists/$listId",
                      params: { listId: list.id },
                    })}
                    className="text-lg font-medium text-gray-900 hover:text-blue-700 transition-colors"
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
                  <Link
                    to="/lists/$listId/edit"
                    params={{ listId: list.id }}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 mr-2"
                    title="Edit list"
                    aria-label={`Edit list: ${list.title}`}
                  >
                    <Pencil size={18} />
                  </Link>

                  <Link
                    to="/lists/$listId/delete"
                    params={{ listId: list.id }}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                    title="Delete list"
                    aria-label={`Delete list: ${list.title}`}
                  >
                    <Trash2 size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}