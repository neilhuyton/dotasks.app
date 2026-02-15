// src/pages/ListDetailPage.tsx

import { listDetailRoute } from "@/router/routes";
import { trpc } from "@/trpc";
import { Loader2, Plus, X } from "lucide-react";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";
import { useState } from "react";

export default function ListDetailPage() {
  const params = listDetailRoute.useParams();
  const { listId } = params;

  const search = listDetailRoute.useSearch();
  const navigate = listDetailRoute.useNavigate();

  const showNewTaskModal = search.modal === "new-task";

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    { enabled: !!listId },
  );

  const {
    tasks,
    isLoadingTasks,
    createTask,
    createTaskPending,
    toggleTask,
    toggleTaskPending,
    deleteTask,
    deleteTaskPending,
    setCurrentTask, // ← added
    setCurrentTaskPending, // ← added
    clearCurrentTask, // added
    clearCurrentTaskPending, // added
  } = useListTasks(listId);

  const [title, setTitle] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const openNewTaskModal = () =>
    navigate({
      search: (prev) => ({ ...(prev ?? {}), modal: "new-task" as const }),
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

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    closeModal();

    createTask(
      { title: title.trim(), listId: listId! },
      {
        onError: (error) => {
          console.error("Create failed:", error);
        },
      },
    );

    setTitle("");
  };

  const confirmDelete = (taskId: string) => setTaskToDelete(taskId);
  const cancelDelete = () => setTaskToDelete(null);

  const handleDelete = () => {
    if (!taskToDelete || !listId) return;

    cancelDelete();

    deleteTask(
      { id: taskToDelete },
      {
        onError: (error) => {
          console.error("Delete failed:", error);
        },
      },
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
              <button onClick={closeModal} aria-label="Close">
                <X size={24} className="text-gray-600 hover:text-gray-800" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title (required)"
                className="w-full border rounded px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                required
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tasks Section */}
      {isLoadingTasks ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <TaskList
            tasks={tasks}
            toggleTask={toggleTask}
            isToggling={toggleTaskPending}
            onDelete={confirmDelete}
            isDeleting={deleteTaskPending}
            setCurrentTask={setCurrentTask} // ← added
            isSettingCurrent={setCurrentTaskPending} // ← added
            clearCurrentTask={clearCurrentTask} // added
            clearCurrentTaskPending={clearCurrentTaskPending} // added
            listId={listId!} // ← added
          />

          {createTaskPending && (
            <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Adding task...
            </div>
          )}

          {deleteTaskPending && (
            <div className="flex items-center justify-center py-3 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Removing task...
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-3">Delete this task?</h3>
            <p className="text-gray-600 mb-6">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-5 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
