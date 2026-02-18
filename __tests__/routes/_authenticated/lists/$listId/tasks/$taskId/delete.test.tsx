// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/delete.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../../../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { trpcMsw } from "../../../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";
import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneSuccessHandler,
} from "../../../../../../../__mocks__/handlers/lists";
import {
  resetMockTasks,
  taskGetByListSuccess,
  taskDeleteSuccess,
  delayedTaskDeleteHandler,
} from "../../../../../../../__mocks__/handlers/tasks";
import type { Task } from "@/types/task";

describe("Delete Task Confirmation Page (/_authenticated/lists/$listId/tasks/$taskId/delete)", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";

  let history: ReturnType<typeof createMemoryHistory>;

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    server.resetHandlers();
    resetMockLists();
    resetMockTasks();
    prepareDetailPageTestList();

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);
    server.use(taskGetByListSuccess);
    server.use(taskDeleteSuccess);

    history = createMemoryHistory({
      initialEntries: [`/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/delete`],
    });
  });

  afterEach(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => server.close());

  const renderDeleteTaskPage = async () => {
    const router = createRouter({ routeTree, history });
    const navigateSpy = vi.spyOn(router, "navigate");

    render(
      <trpc.Provider
        client={trpc.createClient({ links: [httpLink({ url: "/trpc" })] })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    await screen.findByRole("heading", { name: /Delete Task/i });

    return { navigateSpy };
  };

  it("renders confirmation message and buttons", async () => {
    await renderDeleteTaskPage();

    expect(
      await screen.findByRole("heading", { name: "Delete Task?" })
    ).toBeInTheDocument();

    // Fixed: use findByText with partial match (waits for it)
    expect(
      await screen.findByText(/This action cannot be undone/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Task" })).toBeInTheDocument();
  });

  it("shows loading state during deletion", async () => {
    server.use(delayedTaskDeleteHandler);

    await renderDeleteTaskPage();

    fireEvent.click(screen.getByRole("button", { name: /^Delete Task$/ }));

    await screen.findByText("Deleting...");

    const deleteButton = screen.getByRole("button", { name: "Deleting..." });
    expect(deleteButton).toBeDisabled();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("deletes task with optimistic update and navigates on success", async () => {
    const { navigateSpy } = await renderDeleteTaskPage();

    let cachedTasks = queryClient.getQueryData<Task[]>([
      ["task", "getByList"],
      { input: { listId: TEST_LIST_ID }, type: "query" },
    ]);
    expect(cachedTasks?.some((t) => t.id === TEST_TASK_ID)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^Delete Task$/ }));

    await waitFor(
      () => {
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "/lists/$listId",
            params: { listId: TEST_LIST_ID },
            replace: true,
          })
        );
      },
      { timeout: 3000 }
    );

    cachedTasks = queryClient.getQueryData<Task[]>([
      ["task", "getByList"],
      { input: { listId: TEST_LIST_ID }, type: "query" },
    ]);
    expect(cachedTasks?.some((t) => t.id === TEST_TASK_ID)).toBe(false);
  });

  it("rolls back optimistic update on deletion error", async () => {
    server.use(
      trpcMsw.task.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Deletion failed",
        });
      })
    );

    const { navigateSpy } = await renderDeleteTaskPage();

    let cachedTasks = queryClient.getQueryData<Task[]>([
      ["task", "getByList"],
      { input: { listId: TEST_LIST_ID }, type: "query" },
    ]);
    expect(cachedTasks?.some((t) => t.id === TEST_TASK_ID)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^Delete Task$/ }));

    await waitFor(
      () => {
        cachedTasks = queryClient.getQueryData<Task[]>([
          ["task", "getByList"],
          { input: { listId: TEST_LIST_ID }, type: "query" },
        ]);
        expect(cachedTasks?.some((t) => t.id === TEST_TASK_ID)).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("navigates back to list on Cancel button click", async () => {
    const { navigateSpy } = await renderDeleteTaskPage();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      })
    );
  });

  it("navigates back to list on Back (ArrowLeft) button click", async () => {
    const { navigateSpy } = await renderDeleteTaskPage();

    await user.click(screen.getByRole("button", { name: "Back to list" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      })
    );
  });
});