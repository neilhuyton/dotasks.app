// src/pages/modals/DeleteListConfirmModalPage.tsx

import { useParams } from "@tanstack/react-router";
import DeleteListConfirmModal from "@/components/modals/DeleteListConfirmModal";
import { deleteListRoute } from "@/router/routes";

export default function DeleteListConfirmModalPage() {
  const { listId } = useParams({ from: deleteListRoute.id });

  return (
    <DeleteListConfirmModal
      isOpen={true}
      listId={listId}
    />
  );
}