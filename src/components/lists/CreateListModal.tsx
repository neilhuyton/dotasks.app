// CreateListModal.tsx

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description?: string }) => void;
  isPending: boolean;
};

export default function CreateListModal({
  isOpen,
  onClose,
  onCreate,
  isPending,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
    setTitle("");
    setDescription("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Create New List</h2>
          <button
            onClick={onClose}
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
            onClick={onClose}
            className="px-5 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? "Creating..." : "Create List"}
          </button>
        </div>
      </div>
    </div>
  );
}
