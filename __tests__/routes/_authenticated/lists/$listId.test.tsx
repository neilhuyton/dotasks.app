// __tests__/routes/_authenticated/lists/$listId.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterEach,
  afterAll,
  beforeEach,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";

import {
  listLoadingHandler,
  getListNotFoundHandler,
  listGetOneDetailPagePreset,
} from "../../../../__mocks__/handlers/lists";

import {
  taskGetByListSuccess,
  taskGetByListLoading,
  taskDeleteSuccess,
} from "../../../../__mocks__/handlers/tasks";

describe("List Detail Route (/_authenticated/lists/$listId)", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    });

    server.resetHandlers();
    server.use(listGetOneDetailPagePreset);
    server.use(taskGetByListSuccess);

    vi.spyOn(console, "error").mockImplementation(() => {});
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
    vi.restoreAllMocks();
  });

  afterAll(() => server.close());

  const renderListDetail = async () => {
    const history = createMemoryHistory({
      initialEntries: [`/lists/list-abc-123`],
    });
    const router = createRouter({ routeTree, history });

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
    );

    // Give React Query / Router time to settle
    await waitFor(() => {}, { timeout: 800 });
    return { history };
  };

  it("renders list title and description when list is found", async () => {
    await renderListDetail();
    await screen.findByText("My Important Projects");
    await screen.findByText("Work-related stuff I must finish this month");
  });

  it("shows loading spinner while fetching list", async () => {
    server.use(listLoadingHandler);
    await renderListDetail();
    await screen.findByTestId("loading-spinner");
  });

  it("shows 'List not found' message when list does not exist", async () => {
    server.use(getListNotFoundHandler);
    await renderListDetail();
    await screen.findByText(/not found|don't have access/i);
  });

  it("renders 'Add Task' link with correct navigation target", async () => {
    const { history } = await renderListDetail();
    const link = await screen.findByRole("link", { name: /add task/i });
    expect(link).toHaveAttribute("href", `/lists/list-abc-123/tasks/new`);
    await user.click(link);
    expect(history.location.pathname).toBe(`/lists/list-abc-123/tasks/new`);
  });

  it("renders TaskList component with tasks", async () => {
    await renderListDetail();
    await screen.findByText("Finish report");
    await screen.findByText("Call client");
  });

  it("shows loading state for tasks", async () => {
    server.use(taskGetByListLoading);
    await renderListDetail();
    await screen.findByTestId("tasks-loading", {}, { timeout: 3000 });
    expect(
      screen.queryByText("No tasks in this list yet"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Finish report")).not.toBeInTheDocument();
  });

  it("triggers delete action with correct task ID when delete button is clicked", async () => {
    server.use(taskGetByListSuccess);
    server.use(taskDeleteSuccess);

    const { history } = await renderListDetail();

    // Wait for the task to appear
    await screen.findByText("Finish report");

    // Find delete button using the actual aria-label from TaskItem
    // Current aria-label = `Delete ${task.title}` → "Delete Finish report"
    const deleteButton = await screen.findByRole("button", {
      name: /delete finish report/i,
    });

    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveAttribute("title", "Delete task");

    // Click it
    await user.click(deleteButton);

    // Wait for navigation to the delete confirmation route
    await waitFor(
      () => {
        expect(history.location.pathname).toMatch(
          /\/lists\/list-abc-123\/tasks\/[^/]+\/delete$/,
        );
      },
      { timeout: 1500 },
    );
  });

  it("displays the Active Tasks counter with correct count", async () => {
    server.use(taskGetByListSuccess);
    await renderListDetail();

    const activeHeading = await screen.findByRole("heading", {
      level: 3,
      name: /Active/i,
    });

    expect(activeHeading).toBeInTheDocument();
    expect(activeHeading).toHaveTextContent("Active(1)");

    const match = activeHeading.textContent?.match(/\((\d+)\)/);
    expect(Number(match?.[1] ?? "0")).toBe(1);
  });
});
