// src/pages/ListDetailPage.tsx

import { listDetailRoute } from "@/router/routes";
import { trpc } from "@/trpc";
import { Loader2 } from "lucide-react";
import TaskCreation from "@/components/TaskCreation";
import TaskList from "@/components/TaskList";
import { useListTasks } from "@/hooks/useListTasks";

export default function ListDetailPage() {
  const params = listDetailRoute.useParams();
  const listId = params.listId;

  const { data: list, isLoading: listLoading } = trpc.list.getOne.useQuery(
    { id: listId },
    { enabled: !!listId },
  );

  const {
    optimisticTasks,
    createTask,
    createTaskPending,
    toggleTask,
    toggleTaskPending,
  } = useListTasks(listId);

  if (listLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="rounded-lg bg-red-50 p-8 text-center text-red-800">
        List not found or you don't have access.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{list.title}</h1>
        {list.description && (
          <p className="mt-3 text-lg text-gray-600">{list.description}</p>
        )}
      </div>

      <TaskCreation
        listId={listId}
        createTask={createTask}
        isPending={createTaskPending}
        taskCount={optimisticTasks.length}
      />

      <TaskList
        tasks={optimisticTasks}
        toggleTask={toggleTask}
        isToggling={toggleTaskPending}
      />
    </div>
  );
}
