// src/pages/ListDetailPage.tsx

import { listDetailRoute } from "@/router/routes";
import { trpc } from "@/trpc";
import { Loader2, Plus } from "lucide-react";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";
import NewTaskModal from "@/components/modals/NewTaskModal";
import DeleteTaskConfirmModal from "@/components/modals/DeleteTaskConfirmModal";
import { useState } from "react";

export default function ListDetailPage() {
  const params = listDetailRoute.useParams();
  const listId = params.listId; // string | undefined

  const search = listDetailRoute.useSearch();
  const navigate = listDetailRoute.useNavigate();

  const showNewTaskModal = search.modal === "new-task";

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId! },
    {
      enabled: !!listId,
      staleTime: 30000, // 30 seconds - reasonable default
    }
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
    setCurrentTask,
    setCurrentTaskPending,
    clearCurrentTask,
    clearCurrentTaskPending,
  } = useListTasks(listId);

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

  const handleCreateTask = (title: string) => {
    createTask(
      { title, listId: listId! },
      {
        onError: (error) => console.error("Create task failed:", error),
      }
    );
  };

  const confirmDelete = (taskId: string) => setTaskToDelete(taskId);
  const cancelDelete = () => setTaskToDelete(null);

  const handleDelete = () => {
    if (!taskToDelete || !listId) return;
    cancelDelete();

    deleteTask(
      { id: taskToDelete },
      {
        onError: (error) => console.error("Delete task failed:", error),
      }
    );
  };

  if (!listId) {
    return (
      <div className="rounded-lg bg-amber-50 p-8 text-center text-amber-800">
        Invalid list ID
      </div>
    );
  }

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
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {list.description && (
        <p className="text-lg text-muted-foreground">{list.description}</p>
      )}

      <NewTaskModal
        isOpen={showNewTaskModal}
        onClose={closeModal}
        onCreate={handleCreateTask}
        isPending={createTaskPending}
        listId={listId}
      />

      {isLoadingTasks ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <TaskList
            tasks={tasks}
            toggleTask={toggleTask}
            isToggling={toggleTaskPending}
            onDelete={confirmDelete}
            isDeleting={deleteTaskPending}
            setCurrentTask={setCurrentTask}
            isSettingCurrent={setCurrentTaskPending}
            clearCurrentTask={clearCurrentTask}
            clearCurrentTaskPending={clearCurrentTaskPending}
            listId={listId}
          />

          {createTaskPending && (
            <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Adding task...
            </div>
          )}

          {deleteTaskPending && (
            <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Removing task...
            </div>
          )}
        </>
      )}

      <DeleteTaskConfirmModal
        isOpen={!!taskToDelete}
        taskId={taskToDelete}
        onCancel={cancelDelete}
        onConfirm={handleDelete}
        isDeleting={deleteTaskPending}
      />
    </div>
  );
}