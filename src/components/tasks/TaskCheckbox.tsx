// src/components/tasks/TaskCheckbox.tsx
import { Checkbox } from "@/components/ui/checkbox";
import { ItemMedia } from "@/components/ui/item";
import { type Task } from "@/hooks/useListTasks";

interface TaskCheckboxProps {
  task: Task;
  toggleTask: (input: { id: string }) => void;
  isToggling: boolean;
}

export function TaskCheckbox({
  task,
  toggleTask,
  isToggling,
}: TaskCheckboxProps) {
  return (
    <ItemMedia
      variant="icon"
      className="self-center p-0 m-0 border-none bg-transparent"
    >
      <Checkbox
        checked={task.isCompleted}
        onCheckedChange={() => toggleTask({ id: task.id })}
        disabled={isToggling}
        className="h-5 w-5 border-border/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
      />
    </ItemMedia>
  );
}
