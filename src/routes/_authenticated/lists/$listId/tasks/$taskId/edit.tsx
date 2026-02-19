import { createFileRoute } from '@tanstack/react-router'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { trpc } from "@/trpc"
import { useState, useEffect } from "react"

export const Route = createFileRoute('/_authenticated/lists/$listId/tasks/$taskId/edit')({
  component: EditTaskPage,
})

function EditTaskPage() {
  const { listId, taskId } = Route.useParams()
  const navigate = Route.useNavigate()
  const utils = trpc.useUtils()

  const tasks = utils.task.getByList.getData({ listId }) ?? []
  const cachedTask = tasks.find(t => t.id === taskId)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set initial values once we have the cached task
  useEffect(() => {
    if (cachedTask) {
      setTitle(cachedTask.title ?? "")
      setDescription(cachedTask.description ?? "")
    }
  }, [cachedTask])

  if (!cachedTask) {
    return <div>Task not found</div>
  }

  const mutation = trpc.task.update.useMutation({
    onMutate: async (variables) => {
      await utils.task.getByList.cancel({ listId })

      const previousTasks = utils.task.getByList.getData({ listId }) ?? []

      utils.task.getByList.setData({ listId }, (old = []) =>
        old.map(task =>
          task.id === taskId
            ? {
                ...task,
                title: variables.title ?? task.title,
                description: variables.description ?? task.description ?? null,
              }
            : task
        )
      )

      return { previousTasks }
    },

    onError: (err, _variables, context) => {
      if (context?.previousTasks) {
        utils.task.getByList.setData({ listId }, context.previousTasks)
      }
      console.error("Failed to update task:", err)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      return
    }

    setIsSubmitting(true)

    mutation.mutate(
      {
        id: taskId,
        title: trimmedTitle,
        description: description.trim() || undefined,
      },
      {
        onSettled: () => {
          setIsSubmitting(false)
        },
      }
    )
  }

  const handleCancel = () => {
    navigate({
      to: "/lists/$listId",
      params: { listId },
      replace: true,
    })
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-9999 isolate pointer-events-auto",
        "h-dvh w-dvw max-h-none max-w-none",
        "m-0 p-0 left-0 top-0 right-0 bottom-0 translate-x-0 translate-y-0",
        "rounded-none border-0 shadow-none",
        "bg-background overscroll-none touch-none"
      )}
    >
      <div className="relative flex min-h-full flex-col px-6 pb-20 pt-20">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-4 top-6 z-10000"
          aria-label="Back to list"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-1 flex-col">
          <h1 className="text-3xl font-bold tracking-tight mb-8">
            Edit Task
          </h1>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 max-w-lg mx-auto w-full"
            data-testid="edit-task-form"
          >
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Task name <span className="text-destructive">*</span>
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Finish quarterly report"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description (optional)
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={5}
                disabled={isSubmitting}
              />
            </div>

            <div className="mt-auto flex flex-col gap-4 sm:flex-row sm:justify-center w-full max-w-sm mx-auto pb-10">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-32"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="w-full sm:w-40"
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}