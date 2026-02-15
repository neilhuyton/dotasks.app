// ListsHeader.tsx

import { Plus } from "lucide-react";

type Props = {
  onNewList: () => void;
  isCreating: boolean;
};

export default function ListsHeader({ onNewList, isCreating }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-3xl font-bold tracking-tight">My Lists</h1>
      <button
        onClick={onNewList}
        disabled={isCreating}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-60 transition"
      >
        <Plus size={18} />
        New List
      </button>
    </div>
  );
}
