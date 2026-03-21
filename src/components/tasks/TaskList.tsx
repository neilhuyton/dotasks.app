import { Link } from "@tanstack/react-router";
import { SortableTaskList } from "./SortableTaskList";
import type { AppRouter } from "server/trpc";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutput = inferRouterOutputs<AppRouter>;
type Task = RouterOutput["task"]["getByList"][number];

interface TaskListProps {
  tasks: Task[];
  toggleTask: (input: { id: string }) => void;
  pendingToggleIds: Set<string>;
  onDelete: (taskId: string) => void;
  isDeleting: boolean;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  isSettingCurrent: boolean;
  clearCurrentTask: (input: { listId: string }) => void;
  clearCurrentTaskPending: boolean;
  listId: string;
  updateTaskOrder: (updates: { id: string; order: number }[]) => void;
  isReordering: boolean;
}

export default function TaskList({
  tasks,
  toggleTask,
  pendingToggleIds,
  onDelete,
  isDeleting,
  setCurrentTask,
  isSettingCurrent,
  clearCurrentTask,
  clearCurrentTaskPending,
  listId,
  updateTaskOrder,
  isReordering,
}: TaskListProps) {
  const activeTasks = tasks.filter((t) => !t.isCompleted);
  const completedCount = tasks.length - activeTasks.length;

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 italic">
        No tasks in this list yet. Add one!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeTasks.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              Active ({activeTasks.length})
            </h3>

            {completedCount > 0 && (
              <Link
                to="/lists/$listId/tasks/completed"
                params={{ listId }}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Completed ({completedCount}) <span aria-hidden>→</span>
              </Link>
            )}
          </div>

          <SortableTaskList
            tasks={tasks}
            toggleTask={toggleTask}
            pendingToggleIds={pendingToggleIds}
            onDelete={onDelete}
            isDeleting={isDeleting}
            setCurrentTask={setCurrentTask}
            isSettingCurrent={isSettingCurrent}
            clearCurrentTask={clearCurrentTask}
            clearCurrentTaskPending={clearCurrentTaskPending}
            listId={listId}
            updateTaskOrder={updateTaskOrder}
            isReordering={isReordering}
          />
        </section>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">All tasks are completed!</p>
          {completedCount > 0 && (
            <Link
              to="/lists/$listId/tasks/completed"
              params={{ listId }}
              className="mt-4 inline-block text-primary hover:underline"
            >
              View completed tasks →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
