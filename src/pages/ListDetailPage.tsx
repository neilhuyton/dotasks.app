// src/pages/ListDetailPage.tsx
import { listDetailRoute } from '@/router/routes';
import { trpc } from '@/trpc';
import { Loader2, Plus, X } from 'lucide-react';
import TaskList from '@/components/TaskList';
import { useListTasks } from '@/hooks/useListTasks';
import { useState } from 'react';

export default function ListDetailPage() {
  const params = listDetailRoute.useParams();
  const listId = params.listId;

  const search = listDetailRoute.useSearch();
  const navigate = listDetailRoute.useNavigate();

  const showNewTaskModal = search.modal === 'new-task';

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    { enabled: !!listId }
  );

  const {
    optimisticTasks,
    createTask,
    createTaskPending,
    toggleTask,
    toggleTaskPending,
  } = useListTasks(listId);

  const openNewTaskModal = () =>
    navigate({
      search: (prev) => ({
        ...(prev ?? {}),
        modal: 'new-task' as const,
      }),
    });

  const closeModal = () =>
    navigate({
      search: (prev) => {
        const next = { ...(prev ?? {}) };
        delete next.modal;
        delete next.taskId;
        return next;
      },
    });

  // Controlled form state (minimal: just title for now)
  const [title, setTitle] = useState('');
  // Optional: add more state for description, dueDate, priority, etc.
  // const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return; // basic client-side validation

    createTask(
      {
        title: title.trim(),
        listId,
        // description: description.trim() || undefined,
        // dueDate: ..., priority: ..., etc.
      },
      {
        onSuccess: () => {
          setTitle(''); // reset form
          // setDescription(''); // if you add more fields
          closeModal(); // close modal after success
        },
        // onError: (err) => { toast.error(...); } // optional
      }
    );
  };

  if (listLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center text-red-800">
        List not found or you don't have access.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{list.title}</h1>

        <button
          onClick={openNewTaskModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {list.description && (
        <p className="text-lg text-gray-600">{list.description}</p>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Task</h2>
              <button onClick={closeModal}>
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title (required)"
                className="w-full border rounded px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                required
              />

              {/* Add more fields here when ready */}
              {/* <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full border rounded px-4 py-2 mb-4 min-h-[80px]"
              /> */}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskPending || !title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60 flex items-center gap-2"
                >
                  {createTaskPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {createTaskPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TaskList
        tasks={optimisticTasks}
        toggleTask={toggleTask}
        isToggling={toggleTaskPending}
      />
    </div>
  );
}