// ListsTable.tsx

import { Link } from '@tanstack/react-router';
import { Trash2 } from 'lucide-react';
import { listDetailRoute } from '@/router/routes';
import type { RouterOutputs } from '@/trpc';

type TodoList = RouterOutputs['list']['getAll'][number];

interface ListsTableProps {
  lists: TodoList[];
  onDelete: (id: string) => void;
}

export default function ListsTable({ lists, onDelete }: ListsTableProps) {
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
                className="hover:bg-gray-50 transition-colors group"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={listDetailRoute.to}
                    params={{ listId: list.id }}
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
                  <button
                    onClick={() => onDelete(list.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
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
  );
}