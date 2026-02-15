// src/pages/ListDetailPage.tsx

import { listDetailRoute } from "@/router/routes";
import { deleteListRoute } from "@/router/routes";
import { deleteTaskRoute } from "@/router/routes";          
import { trpc } from "@/trpc";
import { Loader2, Plus } from "lucide-react";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";
import { useMatch } from "@tanstack/react-router"; 
import { Link, Outlet } from "@tanstack/react-router";

export default function ListDetailPage() {
  const params = listDetailRoute.useParams();
  const { listId } = params;

  const navigate = listDetailRoute.useNavigate();

  const isDeleteModalActive = !!useMatch({
    from: deleteListRoute.id,
    shouldThrow: false,
  });

  // Optional: also skip if task delete modal is open
  const isTaskDeleteModalActive = !!useMatch({
    from: deleteTaskRoute.id,
    shouldThrow: false,
  });

  const isAnyModalActive = isDeleteModalActive || isTaskDeleteModalActive;

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    {
      enabled: !!listId && !isAnyModalActive,
      staleTime: 1000 * 60 * 5,
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
  } = useListTasks(listId);

  if (listLoading && !isAnyModalActive) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!list && !isAnyModalActive) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center text-red-800">
        List not found or you don't have access.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{list?.title}</h1>

        <Link
          to={`/lists/${listId}/tasks/new` as string}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Add Task
        </Link>
      </div>

      {list?.description && (
        <p className="text-lg text-muted-foreground">{list.description}</p>
      )}

      {isLoadingTasks ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
          listId={listId!}
        />
      )}

      <Outlet />
    </div>
  );
}