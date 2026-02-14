import { AlertCircle } from "lucide-react";

type Task = {
  id: string;
  title: string;
  order: number,
  isCompleted: boolean;
};

type Props = {
  tasks: Task[];
  toggleTask: (input: { id: string }) => void;
  isToggling: boolean;
};

export default function TaskList({ tasks, toggleTask, isToggling }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
        No tasks yet — add one above
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-4 rounded-lg border bg-card p-4 transition-all ${
              isToggling && task.id.startsWith("temp-") ? "opacity-60" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={task.isCompleted}
              onChange={() => toggleTask({ id: task.id })}
              disabled={isToggling}
              className="h-6 w-6 cursor-pointer accent-primary"
            />
            <span
              className={`flex-1 text-lg ${task.isCompleted ? "line-through opacity-70" : ""}`}
            >
              {task.title}
            </span>
            {task.id.startsWith("temp-") && (
              <AlertCircle size={16} className="text-amber-500" />
            )}
          </div>
        ))}
    </div>
  );
}
