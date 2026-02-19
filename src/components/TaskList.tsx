// src/components/TaskList.tsx

import { Star } from 'lucide-react';
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
  const currentTask = tasks.find((t) => t.isCurrent);

  return (
    <div className="space-y-8">
      {/* Current task banner */}
      {currentTask && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <Star className="text-amber-600 fill-amber-400 mt-1" size={22} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-800 text-base">Currently working on</p>
            <p className="text-amber-900 truncate">{currentTask.title}</p>
            {currentTask.description && (
              <p className="text-sm text-amber-800/80 mt-1 line-clamp-2">
                {currentTask.description}
              </p>
            )}
          </div>
        </div>
      )}

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