// __tests__/hooks/task/useTaskCreate.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpcMsw } from "../../../__mocks__/trpcMsw"
import { server } from "../../../__mocks__/server"
import { useTaskCreate } from "@/hooks/task/useTaskCreate"
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

describe("useTaskCreate", () => {
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

  it("does nothing and returns disabled state when listId or userId missing", () => {
    const { result } = renderHook(() => useTaskCreate(null), { wrapper })

    expect(result.current.createTaskPending).toBe(false)
    result.current.createTask({ title: "Test" })
    expect(mockShowBanner).not.toHaveBeenCalled()
  })

  it("optimistically adds task to list cache", async () => {
    const listId = "list-abc"

    const initialTasks: Task[] = [
      {
        id: "t1",
        title: "First",
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

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), initialTasks)

    const { result } = renderHook(() => useTaskCreate(listId), { wrapper })

    await act(async () => {
      result.current.createTask({ title: "New Task" })
    })

    const tasks = queryClient.getQueryData<Task[]>(trpc.task.getByList.queryKey({ listId }))!
    expect(tasks).toHaveLength(2)
    expect(tasks[1].id).toMatch(/^temp-/)
    expect(tasks[1].title).toBe("New Task")
    expect(tasks[1].order).toBe(1)
  })

  it("rolls back optimistic update on error and shows error banner", async () => {
    const listId = "list-abc"

    const initialTasks: Task[] = [
      {
        id: "t1",
        title: "Existing",
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
      trpcMsw.task.create.mutation(() => {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" })
      })
    )

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), initialTasks)

    const { result } = renderHook(() => useTaskCreate(listId), { wrapper })

    await act(async () => {
      result.current.createTask({ title: "Fail Task" })
    })

    const tasksAfter = queryClient.getQueryData<Task[]>(trpc.task.getByList.queryKey({ listId }))!
    expect(tasksAfter).toHaveLength(1)
    expect(tasksAfter[0].title).toBe("Existing")

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to create task",
        variant: "error",
        duration: 4000,
      })
    )
  })

  it("replaces temp id with real id on success and shows success banner", async () => {
    const listId = "list-abc"
    let mutationResolve!: () => void

    server.use(
      trpcMsw.task.create.mutation(async ({ input }) => {
        return new Promise((resolve) => {
          mutationResolve = () =>
            resolve({
              id: "real-t789",
              title: input.title,
              description: input.description ?? null,
              listId,
              userId: "user-123",
              order: 1,
              isCompleted: false,
              isCurrent: false,
              isPinned: false,
              dueDate: null,
              priority: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
        })
      })
    )

    queryClient.setQueryData(trpc.task.getByList.queryKey({ listId }), [])

    const { result } = renderHook(() => useTaskCreate(listId), { wrapper })

    await act(async () => {
      result.current.createTask({ title: "Success Task" })
    })

    let tasks = queryClient.getQueryData<Task[]>(trpc.task.getByList.queryKey({ listId }))!
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toMatch(/^temp-/)

    await act(async () => {
      mutationResolve()
    })

    await waitFor(() => {
      tasks = queryClient.getQueryData<Task[]>(trpc.task.getByList.queryKey({ listId }))!
      expect(tasks[0].id).toBe("real-t789")
    })

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Task added",
        variant: "success",
        duration: 3000,
      })
    )
  })

  it("calls onSuccess callback when provided", async () => {
    const listId = "list-abc"
    const onSuccessCb = vi.fn()
    let mutationResolve!: () => void

    server.use(
      trpcMsw.task.create.mutation(async () => {
        return new Promise((resolve) => {
          mutationResolve = () =>
            resolve({
              id: "real-t999",
              title: "Callback Task",
              description: null,
              listId,
              userId: "user-123",
              order: 0,
              isCompleted: false,
              isCurrent: false,
              isPinned: false,
              dueDate: null,
              priority: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
        })
      })
    )

    const { result } = renderHook(() => useTaskCreate(listId), { wrapper })

    await act(async () => {
      result.current.createTask({ title: "Callback" }, onSuccessCb)
    })

    await act(async () => {
      mutationResolve()
    })

    await waitFor(() => {
      expect(onSuccessCb).toHaveBeenCalledTimes(1)
    })
  })

  it("sets createTaskPending to true during mutation and false after", async () => {
    const listId = "list-abc"
    let mutationResolve!: () => void

    server.use(
      trpcMsw.task.create.mutation(async () => {
        return new Promise((resolve) => {
          mutationResolve = () =>
            resolve({
              id: "real-delay",
              title: "Delayed",
              description: null,
              listId,
              userId: "user-123",
              order: 0,
              isCompleted: false,
              isCurrent: false,
              isPinned: false,
              dueDate: null,
              priority: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
        })
      })
    )

    const { result } = renderHook(() => useTaskCreate(listId), { wrapper })

    expect(result.current.createTaskPending).toBe(false)

    await act(async () => {
      result.current.createTask({ title: "Pending" })
    })

    await waitFor(() => {
      expect(result.current.createTaskPending).toBe(true)
    })

    await act(async () => {
      mutationResolve()
    })

    await waitFor(() => {
      expect(result.current.createTaskPending).toBe(false)
    })
  })
})