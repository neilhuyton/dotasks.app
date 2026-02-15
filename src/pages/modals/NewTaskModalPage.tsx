// src/pages/modals/NewTaskModalPage.tsx

import { listDetailRoute } from "@/router/routes";
import NewTaskModal from "@/components/modals/NewTaskModal";
import { useListTasks } from "@/hooks/useListTasks";

export default function NewTaskModalPage() {
  const params = listDetailRoute.useParams();
  const { listId } = params;

  const navigate = listDetailRoute.useNavigate();

  const { createTask, createTaskPending } = useListTasks(listId);

  const handleCreate = (title: string) => {
    createTask(
      { title, listId: listId! },
      {
        onSuccess: () => {
          navigate({ to: listDetailRoute.fullPath, replace: true });
        },
        onError: (error) => {
          console.error("Create task failed:", error);
          // Optionally: show toast/notification here
        },
      },
    );
  };

  const handleClose = () => {
    navigate({ to: listDetailRoute.fullPath, replace: true });
  };

  return (
    <NewTaskModal
      isOpen={true}
      onClose={handleClose}
      onCreate={handleCreate}
      isPending={createTaskPending}
      listId={listId!}
    />
  );
}
