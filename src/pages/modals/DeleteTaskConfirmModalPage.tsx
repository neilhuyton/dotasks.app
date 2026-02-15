// src/pages/modals/DeleteTaskConfirmModalPage.tsx

import { useParams } from "@tanstack/react-router";
import DeleteTaskConfirmModal from "@/components/modals/DeleteTaskConfirmModal";
import { deleteTaskRoute } from "@/router/routes";

export default function DeleteTaskConfirmModalPage() {
  const { taskId } = useParams({ from: deleteTaskRoute.id });

  return (
    <DeleteTaskConfirmModal
      isOpen={true}
      taskId={taskId}
    />
  );
}