import { useState } from 'react';
import { Plus } from 'lucide-react';

type Props = {
  createTask: (input: { listId: string; title: string; order: number }) => void;
  isPending: boolean;
  listId: string;
  taskCount: number;
};

export default function TaskCreation({ createTask, isPending, listId, taskCount }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createTask({ listId, title: title.trim(), order: taskCount });
    setTitle('');
    setShowForm(false);
  };

  return (
    <div className="mb-10">
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded border px-4 py-3 text-lg focus:ring-2 focus:ring-primary"
            autoFocus
            disabled={isPending}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium disabled:opacity-60"
            >
              {isPending ? 'Adding…' : 'Add Task'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle('');
              }}
              className="px-6 py-3 border rounded-lg hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-5 text-lg font-medium text-primary hover:border-primary/60 hover:bg-primary/10 transition-colors"
        >
          <Plus size={20} />
          Add new task
        </button>
      )}
    </div>
  );
}