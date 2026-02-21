// src/routes/_authenticated/lists/$listId.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";
import { trpc } from "@/trpc";
import { Outlet } from "@tanstack/react-router";
import { FabButton } from "@/components/FabButton";

export const Route = createFileRoute("/_authenticated/lists/$listId")({
  component: ListDetail,
});

function ListDetail() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    {
      enabled: !!listId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  );

  const {
    tasks,
    isLoadingTasks,
    toggleTask,
    toggleTaskPending,
    deleteTaskPending,
    setCurrentTask,
    setCurrentTaskPending,
    clearCurrentTask,
    clearCurrentTaskPending,
    updateTaskOrder,          // ← added
    isReordering,             // ← added
  } = useListTasks(listId);

  if (listLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center"
        data-testid="list-loading"
      >
        <Loader2
          className="h-12 w-12 animate-spin text-blue-600"
          data-testid="loading-spinner"
        />
      </div>
    );
  }

  if (!list) {
    return (
      <div
        className="rounded-lg bg-red-50 p-8 text-center text-red-800"
        data-testid="list-not-found"
      >
        List not found or you don't have access.
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-24 md:pb-28">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{list?.title}</h1>
      </div>

      {list?.description && (
        <p className="text-lg text-muted-foreground">{list.description}</p>
      )}

      {isLoadingTasks ? (
        <div
          className="flex min-h-[40vh] items-center justify-center"
          data-testid="tasks-loading"
        >
          <Loader2
            className="h-10 w-10 animate-spin text-primary"
            data-testid="tasks-spinner"
          />
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          toggleTask={toggleTask}
          isToggling={toggleTaskPending}
          onDelete={(taskId) =>
            navigate({
              to: "/lists/$listId/tasks/$taskId/delete",
              params: { listId, taskId },
            })
          }
          isDeleting={deleteTaskPending}
          setCurrentTask={setCurrentTask}
          isSettingCurrent={setCurrentTaskPending}
          clearCurrentTask={clearCurrentTask}
          clearCurrentTaskPending={clearCurrentTaskPending}
          listId={listId}
          updateTaskOrder={updateTaskOrder}      // ← added
          isReordering={isReordering}            // ← added
        />
      )}

      <FabButton
        to="/lists/$listId/tasks/new"
        params={{ listId }}
        label="Add new task"
        testId="fab-add-task"
      />

      <Outlet />
    </div>
  );
}