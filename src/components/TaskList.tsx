// src/components/TaskList.tsx

import { type Task } from "@/hooks/useListTasks";
import { TaskItem } from "@/components/TaskItem";
import { Link } from "@tanstack/react-router";

interface TaskListProps {
  tasks: Task[];
  toggleTask: (input: { id: string }) => void;
  isToggling: boolean;
  onDelete: (taskId: string) => void;
  isDeleting: boolean;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  isSettingCurrent: boolean;
  clearCurrentTask: (input: { listId: string }) => void;
  clearCurrentTaskPending: boolean;
  listId: string;
}

export default function TaskList({
  tasks,
  toggleTask,
  isToggling,
  onDelete,
  isDeleting,
  setCurrentTask,
  isSettingCurrent,
  clearCurrentTask,
  clearCurrentTaskPending,
  listId,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 italic">
        No tasks in this list yet. Add one!
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => !t.isCompleted);
  const completedCount = tasks.length - activeTasks.length;

  return (
    <div className="space-y-10">
      {activeTasks.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              Active
              <span className="text-sm font-normal text-gray-500">
                ({activeTasks.length})
              </span>
            </h3>

            {completedCount > 0 && (
              <Link
                to="/lists/$listId/tasks/completed"
                params={{ listId }}
                className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
              >
                Completed ({completedCount})<span aria-hidden>→</span>
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                toggleTask={toggleTask}
                isToggling={isToggling}
                onDelete={onDelete}
                isDeleting={isDeleting}
                setCurrentTask={setCurrentTask}
                isSettingCurrent={isSettingCurrent}
                clearCurrentTask={clearCurrentTask}
                clearCurrentTaskPending={clearCurrentTaskPending}
                listId={listId}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">All tasks are completed! 🎉</p>
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
