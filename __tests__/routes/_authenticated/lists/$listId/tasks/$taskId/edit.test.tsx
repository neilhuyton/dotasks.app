// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/edit.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router"
import { trpc } from "@/trpc"
import { httpLink } from "@trpc/client"
import { server } from "../../../../../../../__mocks__/server"
import { routeTree } from "@/routeTree.gen"
import { useAuthStore } from "@/store/authStore"
import { trpcMsw } from "../../../../../../../__mocks__/trpcMsw"
import { TRPCError } from "@trpc/server"
import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneSuccessHandler,
} from "../../../../../../../__mocks__/handlers/lists"
import {
  resetMockTasks,
  taskGetByListSuccess,
  getMockTasks,
  taskUpdateHandler,
  delayedTaskUpdateHandler,
} from "../../../../../../../__mocks__/handlers/tasks"

describe("Edit Task Page (/_authenticated/lists/$listId/tasks/$taskId/edit)", () => {
  let queryClient: QueryClient
  const user = userEvent.setup()

  const TEST_LIST_ID = "list-abc-123"
  const TEST_TASK_ID = "t-real-1"
  const ORIGINAL_TITLE = "Finish report"

  let history: ReturnType<typeof createMemoryHistory>

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    })

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    })

    server.resetHandlers()
    resetMockLists()
    resetMockTasks()
    prepareDetailPageTestList()

    server.use(listGetAllHandler)
    server.use(listGetOneSuccessHandler)
    server.use(taskGetByListSuccess)

    history = createMemoryHistory({
      initialEntries: [`/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/edit`],
    })
  })

  afterEach(async () => {
    await queryClient.cancelQueries()
    queryClient.clear()
    server.resetHandlers()
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    })
  })

  afterAll(() => server.close())

  const renderEditTaskPage = async () => {
    const router = createRouter({ routeTree, history })
    const navigateSpy = vi.spyOn(router, "navigate")

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "http://localhost:8888/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>,
    )

    await screen.findByText("Edit Task")
    await screen.findByDisplayValue(ORIGINAL_TITLE)

    return { navigateSpy }
  }

  it("renders page title, inputs, and buttons", async () => {
    await renderEditTaskPage()

    expect(screen.getByText("Edit Task")).toBeInTheDocument()

    expect(screen.getByLabelText(/Task name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e.g. Finish quarterly report/i)).toBeInTheDocument()

    expect(screen.getByLabelText(/Description \(optional\)/i)).toBeInTheDocument()

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument()
  })

  it("disables Save Changes button when title is empty or whitespace", async () => {
    await renderEditTaskPage()

    const saveButton = screen.getByRole("button", { name: /Save Changes/i })

    // Form starts with a valid title → button is enabled
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })

    const titleInput = screen.getByLabelText(/Task name/i)

    await user.clear(titleInput)
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })

    await user.type(titleInput, "   ")
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })

    await user.clear(titleInput)
    await user.type(titleInput, "Valid updated title")
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it("shows loading state during task update", async () => {
    server.use(delayedTaskUpdateHandler)

    await renderEditTaskPage()

    const titleInput = screen.getByLabelText(/Task name/i)
    await user.clear(titleInput)
    await user.type(titleInput, "Updated report")

    const form = screen.getByTestId("edit-task-form")
    fireEvent.submit(form)

    await screen.findByText("Saving...")
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it("updates task with optimistic update and navigates on success", async () => {
    server.use(taskUpdateHandler)

    const { navigateSpy } = await renderEditTaskPage()

    const titleInput = screen.getByLabelText(/Task name/i)
    const descInput = screen.getByLabelText(/Description/i)

    await user.clear(titleInput)
    await user.type(titleInput, "Updated Finish report")

    await user.clear(descInput)
    await user.type(descInput, "New detailed description here")

    const form = screen.getByTestId("edit-task-form")
    fireEvent.submit(form)

    await waitFor(
      () => {
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "/lists/$listId",
            params: { listId: TEST_LIST_ID },
            replace: true,
          })
        )
      },
      { timeout: 5000 },
    )

    const updatedTasks = getMockTasks()
    const updated = updatedTasks.find(t => t.id === TEST_TASK_ID)
    expect(updated?.title).toBe("Updated Finish report")
    expect(updated?.description).toBe("New detailed description here")
  })

  it("rolls back optimistic update on update error", async () => {
    server.use(
      trpcMsw.task.update.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Update failed",
        })
      })
    )

    const { navigateSpy } = await renderEditTaskPage()

    await user.clear(screen.getByLabelText(/Task name/i))
    await user.type(screen.getByLabelText(/Task name/i), "Will fail")

    const form = screen.getByTestId("edit-task-form")
    fireEvent.submit(form)

    await waitFor(
      () => {
        const tasks = getMockTasks()
        const updated = tasks.find(t => t.id === TEST_TASK_ID)
        expect(updated?.title).toBe(ORIGINAL_TITLE)
      },
      { timeout: 3000 },
    )

    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it("navigates back to list on Cancel button click", async () => {
    const { navigateSpy } = await renderEditTaskPage()
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      })
    )
  })

  it("navigates back on Back (ArrowLeft) button click", async () => {
    const { navigateSpy } = await renderEditTaskPage()
    await user.click(screen.getByRole("button", { name: "Back to list" }))
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      })
    )
  })

  it("does not submit when title is empty (prevents mutation)", async () => {
    await renderEditTaskPage()

    const titleInput = screen.getByLabelText(/Task name/i)
    await user.clear(titleInput)

    const saveButton = screen.getByRole("button", { name: /Save Changes/i })
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })

    const form = screen.getByTestId("edit-task-form")
    fireEvent.submit(form)

    await waitFor(
      () => {
        const tasks = getMockTasks()
        const task = tasks.find(t => t.id === TEST_TASK_ID)
        expect(task?.title).toBe(ORIGINAL_TITLE)
      },
      { timeout: 1500 },
    )

    expect(screen.getByText("Title is required")).toBeInTheDocument()
  })
})