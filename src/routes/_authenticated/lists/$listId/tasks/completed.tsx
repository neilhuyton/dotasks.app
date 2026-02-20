// src/routes/_authenticated/lists/$listId/tasks/completed.tsx

import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/TaskItem";
import { useListTasks } from "@/hooks/useListTasks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authenticated/lists/$listId/tasks/completed",
)({
  component: CompletedTasksOverlay,
});

function CompletedTasksOverlay() {
  const { listId } = Route.useParams();
  const navigate = Route.useNavigate();

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

  const completedTasks = tasks.filter((t) => t.isCompleted);

  const handleBack = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    });
  };

  if (isLoadingTasks) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none overflow-y-auto",
      )}
    >
      <div className="relative flex min-h-full flex-col px-5 pb-28 pt-16 md:px-8 md:pb-32">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 z-10"
          onClick={handleBack}
          aria-label="Back to list"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        {/* Header */}
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
          <div className="space-y-3 pb-16">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
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
            ))}
          </div>
        )}
      </div>

      {/* Bottom back button (visible when scrolled) */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-10 pointer-events-none">
        <Button
          variant="secondary"
          size="lg"
          className="pointer-events-auto shadow-xl rounded-full px-10"
          onClick={handleBack}
        >
          Back to List
        </Button>
      </div>
    </div>
  );
}
