// src/routes/_authenticated/lists/$listId/tasks/$taskId/delete.tsx

import { createFileRoute } from '@tanstack/react-router'
import DeleteTaskConfirmModal from '@/components/modals/DeleteTaskConfirmModal'

export const Route = createFileRoute('/_authenticated/lists/$listId/tasks/$taskId/delete')({  // ← remove /_authenticated/
  component: DeleteTaskRouteComponent,
})

function DeleteTaskRouteComponent() {
  const {  taskId } = Route.useParams()  // now typed as { listId: string; taskId: string }

  return <DeleteTaskConfirmModal isOpen={true} taskId={taskId} />  // added listId if your modal needs it
}