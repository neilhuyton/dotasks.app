// DeleteListConfirmModal.tsx

import { Loader2 } from "lucide-react";

type Props = {
  isOpen: boolean;
  listId: string;
  onCancel: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
};

export default function DeleteListConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  isDeleting,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-3">Delete this list?</h3>
        <p className="text-gray-600 mb-6">
          This action cannot be undone. Tasks in this list will no longer be
          associated with any list.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2 border rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting ? "Deleting..." : "Delete List"}
          </button>
        </div>
      </div>
    </div>
  );
}
