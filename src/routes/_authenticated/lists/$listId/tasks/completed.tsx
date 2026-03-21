import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskRead } from "@/hooks/task/useTaskRead";
import { useTaskToggle } from "@/hooks/task/useTaskToggle";
import { useTaskCurrent } from "@/hooks/task/useTaskCurrent";
import { useTaskDelete } from "@/hooks/task/useTaskDelete";
import { cn } from "@/lib/utils";
import { TaskItem } from "@/features/tasks/TaskItem";

export const Route = createFileRoute(
  "/_authenticated/lists/$listId/tasks/completed",
)({
  component: CompletedTasksPage,
});

function CompletedTasksPage() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

  const { tasks, isLoadingTasks } = useTaskRead(listId);

  const { toggleTask, pendingToggleIds } = useTaskToggle(listId);

  const {
    setCurrentTask,
    setCurrentTaskPending,
    clearCurrentTask,
    clearCurrentTaskPending,
  } = useTaskCurrent(listId);

  const { isDeleting } = useTaskDelete(listId);

  const completedTasks = tasks
    .filter((t) => t.isCompleted)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  const handleBack = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  if (isLoadingTasks) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
        data-testid="tasks-loading"
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background",
        "flex flex-col min-h-full",
        "overflow-y-auto overscroll-none",
      )}
    >
      <div className="relative flex-1 px-4 sm:px-6 lg:px-8 pb-28 pt-16 mx-auto w-full max-w-3xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-10 sm:left-6 lg:left-8"
          onClick={handleBack}
          aria-label="Back to list"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Completed Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {completedTasks.length} task{completedTasks.length !== 1 ? "s" : ""}
          </p>
        </div>

        {completedTasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center">
            <div className="max-w-md space-y-6">
              <p className="text-lg text-muted-foreground">
                No completed tasks yet.
              </p>
              <Button variant="outline" onClick={handleBack}>
                Back to active tasks
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                toggleTask={toggleTask}
                pendingToggleIds={pendingToggleIds}
                onDelete={(taskId) =>
                  navigate({
                    to: "/lists/$listId/tasks/$taskId/delete",
                    params: { listId, taskId },
                  })
                }
                isDeleting={isDeleting}
                setCurrentTask={setCurrentTask}
                isSettingCurrent={setCurrentTaskPending}
                clearCurrentTask={clearCurrentTask}
                clearCurrentTaskPending={clearCurrentTaskPending}
                listId={listId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
