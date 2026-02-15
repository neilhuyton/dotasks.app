// src/pages/ListDetailPage.tsx

import { listDetailRoute } from "@/router/routes";
import { trpc } from "@/trpc";
import { Loader2, Plus } from "lucide-react";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";
import DeleteTaskConfirmModal from "@/components/modals/DeleteTaskConfirmModal";
import { useState } from "react";
import { Link, Outlet } from "@tanstack/react-router";

export default function ListDetailPage() {
  const params = listDetailRoute.useParams();
  const { listId } = params;

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    { enabled: !!listId },
  );

  const {
    tasks,
    isLoadingTasks,
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

  const confirmDelete = (taskId: string) => setTaskToDelete(taskId);
  const cancelDelete = () => setTaskToDelete(null);

  const handleDelete = () => {
    if (!taskToDelete || !listId) return;
    deleteTask(
      { id: taskToDelete },
      {
        onError: (error) => console.error("Delete failed:", error),
        onSuccess: () => {
          cancelDelete();
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

        <Link
          to={`/lists/${listId}/tasks/new` as string}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Add Task
        </Link>
      </div>

      {list.description && (
        <p className="text-lg text-muted-foreground">{list.description}</p>
      )}

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
            listId={listId!}
          />

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

      <Outlet />
    </div>
  );
}