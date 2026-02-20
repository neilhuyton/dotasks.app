// src/routes/_authenticated/lists/$listId.tsx

import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";
import { trpc } from "@/trpc";
import { Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button"; // shadcn/ui Button

export const Route = createFileRoute("/_authenticated/lists/$listId")({
  component: ListDetail,
});

function ListDetail() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

  const isAnyModalActive = false; // ← replace with your modal logic if needed

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    {
      enabled: !!listId && !isAnyModalActive,
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
  } = useListTasks(listId);

  if (listLoading && !isAnyModalActive) {
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

  if (!list && !isAnyModalActive) {
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
    <div className="space-y-8 relative pb-24 md:pb-28"> {/* increased padding to accommodate higher FAB */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{list?.title}</h1>
        {/* Inline Add Task button removed – using FAB now */}
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
        />
      )}

      {/* Floating Action Button (FAB) - moved slightly right & higher */}
      <Button
        asChild
        size="lg"
        className="
          fixed bottom-24 right-4 z-50             
          rounded-full w-14 h-14 
          shadow-xl hover:shadow-2xl 
          transition-all duration-200 hover:scale-110
          bg-primary hover:bg-primary/90
          text-primary-foreground
          flex items-center justify-center
          md:bottom-28 md:right-10 md:w-16 md:h-16  
        "
        data-testid="fab-add-task"
      >
        <Link
          to="/lists/$listId/tasks/new"
          params={{ listId }}
        >
          <Plus className="h-7 w-7 md:h-8 md:w-8" />
          <span className="sr-only">Add new task</span>
        </Link>
      </Button>

      <Outlet />
    </div>
  );
}