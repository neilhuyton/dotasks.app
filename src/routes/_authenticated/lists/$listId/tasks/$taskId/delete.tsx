// src/routes/_authenticated/lists/$listId/tasks/$taskId/delete.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc";
import { useState, useEffect } from "react";

export const Route = createFileRoute('/_authenticated/lists/$listId/tasks/$taskId/delete')({
  component: DeleteTaskConfirmPage,
})

function DeleteTaskConfirmPage() {
  const { listId, taskId } = Route.useParams()

  const navigate = Route.useNavigate()
  const utils = trpc.useUtils()

  const tasks = utils.task.getByList.getData({ listId }) ?? []
  const cachedTask = tasks.find(t => t.id === taskId)

  // ALL hooks go here, unconditionally
  const [title, setTitle] = useState<string | null>(null)

  useEffect(() => {
    if (cachedTask && title === null) {
      setTitle(cachedTask.title ?? "this task")
    }
  }, [cachedTask, title])  // note: title in deps to prevent re-run after set

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

  // Only now do conditional render — hooks are already called
  if (title === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none",
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20 sm:px-8">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 sm:left-6 sm:top-8 z-[10000]"
          aria-label="Cancel and return to list"
          onClick={handleCancel}
          disabled={mutation.isPending}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-10">
            <div className="text-center space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Delete "{title}"?
              </h1>
              <p className="text-muted-foreground text-lg">
                This action cannot be undone.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-4 pt-8 justify-center">
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={mutation.isPending}
                  className="w-full sm:w-32"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}