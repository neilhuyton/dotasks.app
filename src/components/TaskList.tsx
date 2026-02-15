// src/components/TaskList.tsx

import { Trash2, Star } from 'lucide-react';
import { type Task } from '@/hooks/useListTasks';

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
      {/* Current task banner (quick reference) */}
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

      {/* Active Tasks – fixed order by due date */}
      {activeTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Active</h3>
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
              ({completedTasks.length})
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

function TaskItem({
  task,
  toggleTask,
  isToggling,
  onDelete,
  isDeleting,
  setCurrentTask,
  isSettingCurrent,
  clearCurrentTask,
  clearCurrentTaskPending,
  listId,
}: {
  task: Task;
  toggleTask: (input: { id: string }) => void;
  isToggling: boolean;
  onDelete: (taskId: string) => void;
  isDeleting: boolean;
  setCurrentTask: (input: { id: string; listId: string }) => void;
  isSettingCurrent: boolean;
  clearCurrentTask: (input: { listId: string }) => void;
  clearCurrentTaskPending: boolean;
  listId: string;
}) {
  const isPending = isSettingCurrent || clearCurrentTaskPending;

  const handleToggleCurrent = () => {
    if (task.isCompleted || isPending) return;

    if (task.isCurrent) {
      clearCurrentTask({ listId });
    } else {
      setCurrentTask({ id: task.id, listId });
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between gap-3
        px-4 py-3.5 bg-white border rounded-xl
        transition-colors duration-150 touch-manipulation
        ${task.isCompleted 
          ? 'opacity-70 bg-gray-50 border-gray-200' 
          : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'}
        ${task.isCurrent 
          ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-300/40' 
          : ''}
      `}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={() => toggleTask({ id: task.id })}
          disabled={isToggling}
          className="h-6 w-6 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={`
                font-medium text-base truncate
                ${task.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}
              `}
            >
              {task.title}
            </p>
            {task.isCurrent && (
              <Star size={18} className="text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!task.isCompleted && (
          <button
            onClick={handleToggleCurrent}
            disabled={isPending}
            className={`
              p-2.5 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center
              ${task.isCurrent 
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 active:bg-amber-200' 
                : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50 active:bg-amber-100 active:text-amber-700'}
              transition-colors touch-manipulation
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
            title={task.isCurrent ? "Clear current task" : "Set as current task"}
            aria-label={task.isCurrent ? `Clear current status` : `Set as current`}
          >
            <Star 
              size={20} 
              className={task.isCurrent ? "fill-current" : ""}
            />
          </button>
        )}

        <button
          onClick={() => onDelete(task.id)}
          disabled={isDeleting}
          className={`
            p-2.5 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center
            text-gray-500 hover:text-red-600 hover:bg-red-50
            active:bg-red-100 active:text-red-700
            transition-colors touch-manipulation
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title="Delete task"
          aria-label={`Delete task: ${task.title}`}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}