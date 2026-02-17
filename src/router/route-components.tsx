// src/router/route-components.tsx

import { useParams } from "@tanstack/react-router";
import CreateListModal from "@/components/modals/CreateListModal";
import NewTaskModal from "@/components/modals/NewTaskModal";
import DeleteListConfirmModal from "@/components/modals/DeleteListConfirmModal";
import DeleteTaskConfirmModal from "@/components/modals/DeleteTaskConfirmModal";
import { listDetailRoute, deleteTaskRoute } from "./xxxxxroutes";

export function CreateListRoute() {
  return <CreateListModal isOpen={true} />;
}

export function NewTaskRoute() {
  const { listId } = useParams({ from: listDetailRoute.id });
  return <NewTaskModal isOpen={true} listId={listId} />;
}

export function DeleteListRoute() {
  const { listId } = useParams({ from: listDetailRoute.id });
  return <DeleteListConfirmModal isOpen={true} listId={listId} />;
}

export function DeleteTaskRoute() {
  const { taskId } = useParams({ from: deleteTaskRoute.id });
  return <DeleteTaskConfirmModal isOpen={true} taskId={taskId} />;
}
