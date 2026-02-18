// src/routes/_authenticated/lists/$listId/tasks/$taskId/delete.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";

export const Route = createFileRoute('/_authenticated/lists/$listId/tasks/$taskId/delete')({
  component: DeleteTaskConfirmPage,
})

function DeleteTaskConfirmPage() {
  const { listId, taskId } = Route.useParams()

  const navigate = Route.useNavigate()
  const utils = trpc.useUtils()

  const mutation = trpc.task.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.task.getByList.cancel({ listId })

      const previousTasks = utils.task.getByList.getData({ listId }) ?? []

      utils.task.getByList.setData({ listId }, (old = []) =>
        old.filter((task) => task.id !== id)
      )

      return { previousTasks }
    },

    onError: (err, _vars, context) => {
      if (context?.previousTasks) {
        utils.task.getByList.setData({ listId }, context.previousTasks)
      }
      console.error("Failed to delete task:", err)
    },

    onSettled: () => {
      utils.task.getByList.invalidate({ listId })
    },

    onSuccess: () => {
      navigate({
        to: "/lists/$listId",
        params: { listId },
        replace: true,
      })
    },
  })

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ id: taskId })
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none"
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20">
        {/* Back button – top-left */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 z-[10000]"
          aria-label="Back to list"
          onClick={handleCancel}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Centered content */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="space-y-6 max-w-md">
            <h1 className="text-3xl font-bold tracking-tight">
              Delete Task?
            </h1>

            <p className="text-lg text-muted-foreground">
              This action cannot be undone..
            </p>
          </div>
        </div>

        {/* Buttons at bottom */}
        <form
          onSubmit={handleSubmit}
          className="mt-auto flex flex-col gap-4 sm:flex-row sm:justify-center w-full max-w-sm mx-auto pb-10"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={mutation.isPending}
            className="w-full sm:w-32"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="destructive"
            disabled={mutation.isPending}
            className="w-full sm:w-40"
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            {mutation.isPending ? "Deleting..." : "Delete Task"}
          </Button>
        </form>
      </div>
    </div>
  )
}