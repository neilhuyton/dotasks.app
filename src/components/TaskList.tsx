// src/components/TaskList.tsx

import { type Task } from '@/hooks/useListTasks';
import { TaskItem } from '@/components/TaskItem';

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
  const completedTasks = tasks.filter((t) => t.isCompleted);

  return (
    <div className="space-y-8">

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            Active
            <span className="text-sm font-normal text-gray-500">
              ({activeTasks.length})   {/* ← Added space here */}
            </span>
          </h3>
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
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-600 mb-3 flex items-center gap-2">
            Completed
            <span className="text-sm font-normal text-gray-500">
              ({completedTasks.length})   {/* ← Added space here too */}
            </span>
          </h3>
          <div className="space-y-3">
            {completedTasks.map((task) => (
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
        </div>
      )}
    </div>
  );
}