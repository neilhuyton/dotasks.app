import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpcMsw } from "../../../__mocks__/trpcMsw"
import { server } from "../../../__mocks__/server"
import { useTaskDelete } from "@/hooks/task/useTaskDelete"
import { TRPCError } from "@trpc/server"
import { TRPCProvider } from "@/trpc"
import { trpcClient } from "@/trpc"
import { trpc } from "@/trpc"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/../server/trpc"
import { suppressActWarnings } from "../../utils/act-suppress"

suppressActWarnings()

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number]

const mockShowBanner = vi.fn()

vi.mock("@steel-cut/steel-lib", async () => {
  const actual = await vi.importActual("@steel-cut/steel-lib")
  return {
    ...actual,
    useBannerStore: vi.fn(() => ({ show: mockShowBanner })),
  }
})

describe("useTaskDelete", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    server.resetHandlers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )

  it("does nothing when listId is missing", () => {
    const { result } = renderHook(() => useTaskDelete(null), { wrapper })

    expect(result.current.isDeleting).toBe(false)
    result.current.deleteTask("task-123")
    expect(mockShowBanner).not.toHaveBeenCalled()
  })

  it("optimistically removes task from cache", async () => {
    const listId = "list-abc"

    const initialTasks: Task[] = [
      {
        id: "t1",
        title: "Keep me",
        description: null,
        listId,
        userId: "user-123",
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
      {
        id: "t2",
        title: "Delete me",
        description: null,
        listId,
        userId: "user-123",
        order: 1,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), initialTasks)

    const { result } = renderHook(() => useTaskDelete(listId), { wrapper })

    await act(async () => {
      result.current.deleteTask("t2")
    })

    const tasks = queryClient.getQueryData<Task[]>(trpc.task.getByList.queryKey({ listId }))!
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe("t1")
  })

  it("rolls back on error and shows error banner", async () => {
    const listId = "list-abc"

    const initialTasks: Task[] = [
      {
        id: "t1",
        title: "Task One",
        description: null,
        listId,
        userId: "user-123",
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]

    server.use(
      trpcMsw.task.delete.mutation(() => {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      })
    )

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), initialTasks)

    const { result } = renderHook(() => useTaskDelete(listId), { wrapper })

    await act(async () => {
      result.current.deleteTask("t1")
    })

    const tasksAfter = queryClient.getQueryData<Task[]>(trpc.task.getByList.queryKey({ listId }))!
    expect(tasksAfter).toHaveLength(1)
    expect(tasksAfter[0].id).toBe("t1")

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to delete task",
        variant: "error",
        duration: 4000,
      })
    )
  })

  it("shows success banner on successful deletion", async () => {
    const listId = "list-abc"

    const initialTasks: Task[] = [
      {
        id: "t3",
        title: "To delete",
        description: null,
        listId,
        userId: "user-123",
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      },
    ]

    server.use(
      trpcMsw.task.delete.mutation(async ({ input }) => ({
        id: input.id,
        userId: "user-123",
        title: "To delete",
        description: null,
        listId,
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: new Date().toISOString(),
      }))
    )

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), initialTasks)

    const { result } = renderHook(() => useTaskDelete(listId), { wrapper })

    await act(async () => {
      result.current.deleteTask("t3")
    })

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Task deleted",
        variant: "success",
        duration: 3000,
      })
    )
  })

  it("calls onSuccess callback when provided", async () => {
    const listId = "list-abc"
    const onSuccessCb = vi.fn()

    server.use(
      trpcMsw.task.delete.mutation(async () => ({
        id: "t4",
        userId: "user-123",
        title: "Some task",
        description: null,
        listId: "list-abc",
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: new Date().toISOString(),
      }))
    )

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), [])

    const { result } = renderHook(() => useTaskDelete(listId), { wrapper })

    await act(async () => {
      result.current.deleteTask("t4", { onSuccess: onSuccessCb })
    })

    expect(onSuccessCb).toHaveBeenCalledTimes(1)
  })

  it("sets isDeleting to true during mutation and false after", async () => {
    const listId = "list-abc"
    let mutationResolve!: () => void

    server.use(
      trpcMsw.task.delete.mutation(async () => {
        return new Promise((resolve) => {
          mutationResolve = () =>
            resolve({
              id: "t5",
              userId: "user-123",
              title: "Delayed delete",
              description: null,
              listId: "list-abc",
              order: 0,
              isCompleted: false,
              isCurrent: false,
              isPinned: false,
              dueDate: null,
              priority: null,
              createdAt: "2026-03-01T00:00:00Z",
              updatedAt: new Date().toISOString(),
            })
        })
      })
    )

    const { result } = renderHook(() => useTaskDelete(listId), { wrapper })

    expect(result.current.isDeleting).toBe(false)

    await act(async () => {
      result.current.deleteTask("t5")
    })

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(true)
    })

    await act(async () => {
      mutationResolve()
    })

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(false)
    })
  })
})