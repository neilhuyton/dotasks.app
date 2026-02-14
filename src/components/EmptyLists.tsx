// src/components/EmptyLists.tsx

import { useState } from "react";
import { Plus } from "lucide-react";

type Props = {
  createList: (input: { title: string }) => void;
  isPending: boolean;
};

export default function EmptyLists({ createList, isPending }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createList({ title: title.trim() });
    setTitle("");
    setShowForm(false);
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-4xl font-bold">Get Started</h1>
      <p className="text-xl text-muted-foreground max-w-md">
        Create your first list to start organizing tasks
      </p>

      {showForm ? (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="List name (Work, Shopping, Ideas...)"
            className="w-full rounded-lg border px-4 py-3 text-lg focus:ring-2 focus:ring-primary"
            autoFocus
            disabled={isPending}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium disabled:opacity-60"
            >
              {isPending ? "Creating…" : "Create List"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3 border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-3 px-8 py-4 text-xl font-medium bg-primary/10 text-primary rounded-xl hover:bg-primary/20"
        >
          <Plus size={24} />
          Create First List
        </button>
      )}
    </div>
  );
}
