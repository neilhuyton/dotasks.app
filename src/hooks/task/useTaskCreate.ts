import { useMutation, useQueryClient } from "@tanstack/react-query"
import { trpc } from "@/trpc"
import { useBannerStore } from "@steel-cut/steel-lib"
import { useAuthStore } from "@/store/authStore"

import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/../server/trpc"

type RouterOutput = inferRouterOutputs<AppRouter>
type Task = RouterOutput["task"]["getByList"][number]

function createOptimisticTask(
  input: { title: string; description?: string },
  prevLength: number,
  listId: string,
  userId: string,
): Task {
  const now = new Date().toISOString()
  return {
    id: `temp-${crypto.randomUUID()}`,
    title: input.title,
    description: input.description ?? null,
    listId,
    userId,
    order: prevLength,
    isCompleted: false,
    isCurrent: false,
    isPinned: false,
    dueDate: null,
    priority: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function useTaskCreate(listId: string | null | undefined) {
  const queryClient = useQueryClient()
  const { show: showBanner } = useBannerStore()

  const queryKey = listId ? trpc.task.getByList.queryKey({ listId }) : null
  const listOneQueryKey = listId ? trpc.list.getOne.queryKey({ id: listId }) : null
  const listAllQueryKey = trpc.list.getAll.queryKey()

  const mutation = useMutation(
    trpc.task.create.mutationOptions({
      onMutate: async (input: { title: string; description?: string }) => {
        if (!listId || !queryKey) return { previous: [] as Task[] }

        const userId = useAuthStore.getState().user?.id ?? "user-123"

        await queryClient.cancelQueries({ queryKey })

        const previous = queryClient.getQueryData<Task[]>(queryKey) ?? []

        const optimistic = createOptimisticTask(input, previous.length, listId, userId)

        queryClient.setQueryData<Task[]>(queryKey, [...previous, optimistic])

        return { previous, tempId: optimistic.id }
      },

      onError: (_, __, context) => {
        if (context?.previous && queryKey) {
          queryClient.setQueryData(queryKey, context.previous)
        }
        showBanner({
          message: "Failed to create task",
          variant: "error",
          duration: 4000,
        })
      },

      onSuccess: (created, __, context) => {
        if (!queryKey || !context?.tempId) return

        queryClient.setQueryData<Task[]>(queryKey, (old = []) =>
          old.map(task =>
            task.id === context.tempId
              ? {
                  ...task,
                  id: created.id,
                  title: created.title,
                  description: created.description,
                  order: created.order ?? task.order,
                  createdAt: created.createdAt,
                  updatedAt: created.updatedAt,
                }
              : task,
          ),
        )

        showBanner({
          message: "Task added",
          variant: "success",
          duration: 3000,
        })
      },

      onSettled: () => {
        if (queryKey) queryClient.invalidateQueries({ queryKey })
        if (listOneQueryKey) {
          queryClient.invalidateQueries({ queryKey: listOneQueryKey, exact: true })
        }
        queryClient.invalidateQueries({ queryKey: listAllQueryKey, exact: true })
      },
    }),
  )

  return {
    createTask: (
      input: { title: string; description?: string },
      onSuccess?: () => void,
    ) => {
      if (!listId) return
      mutation.mutate({ ...input, listId }, { onSuccess: () => onSuccess?.() })
    },

    createTaskPending: mutation.isPending,
  }
}