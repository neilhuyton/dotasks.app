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
  resetMockTasks,
  getMockTasks,
  taskPinToggleSuccess,
  delayedTaskPinToggle,
  taskPinToggleFailure,
  taskGetByListPinnedFirst,
  setTaskPinned,
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
    </trpc.Provider>
  );

  // Wait for ANY expected terminal state (success, loading, error)
  await Promise.race([
    screen.findByText("Finish report", {}, { timeout: 4000 }).catch(() => null),
    screen.findByTestId("list-loading", {}, { timeout: 4000 }).catch(() => null),
    screen.findByTestId("tasks-loading", {}, { timeout: 4000 }).catch(() => null),
    screen.findByTestId("list-not-found", {}, { timeout: 4000 }).catch(() => null),
  ]);

  // Optional: extra safety check - if none of the above appeared, fail loudly
  if (
    !screen.queryByText("Finish report") &&
    !screen.queryByTestId("list-loading") &&
    !screen.queryByTestId("tasks-loading") &&
    !screen.queryByTestId("list-not-found")
  ) {
    throw new Error(
      "List detail page did not render any expected content (tasks, loading spinner, or not-found message) within 4 seconds"
    );
  }

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
    server.use(taskDeleteSuccess);

    const { history } = await renderListDetail();

    await screen.findByText("Finish report");

    const deleteButton = await screen.findByRole("button", {
      name: "Delete Finish report",
    });

    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveAttribute("title", "Delete task");

    await user.click(deleteButton);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(
          "/lists/list-abc-123/tasks/t-real-1/delete"
        );
      },
      { timeout: 1500 },
    );
  });

  it("displays the Active Tasks counter with correct count", async () => {
    await renderListDetail();

    const activeHeading = await screen.findByRole("heading", {
      level: 3,
      name: /Active/i,
    });

    expect(activeHeading).toBeInTheDocument();
    expect(activeHeading).toHaveTextContent("Active(1)");
  });

  it("renders edit (pencil) button for each task", async () => {
    await renderListDetail();

    const editLinks = await screen.findAllByRole("link", {
      name: /edit task/i,
    });

    expect(editLinks).toHaveLength(2);

    expect(editLinks[0]).toHaveAttribute(
      "aria-label",
      "Edit task: Finish report"
    );
    expect(editLinks[0]).toHaveAttribute(
      "href",
      "/lists/list-abc-123/tasks/t-real-1/edit"
    );
  });

  it("navigates to task edit page when edit button is clicked", async () => {
    const { history } = await renderListDetail();

    await screen.findByText("Finish report");

    const editButton = await screen.findByRole("link", {
      name: "Edit task: Finish report",
    });

    expect(editButton).toBeInTheDocument();
    expect(editButton).toHaveAttribute("title", "Edit task");

    await user.click(editButton);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(
          "/lists/list-abc-123/tasks/t-real-1/edit"
        );
      },
      { timeout: 1000 },
    );
  });

  it("renders edit button even for completed tasks", async () => {
    await renderListDetail();

    const completedEditButton = await screen.findByRole("link", {
      name: "Edit task: Call client",
    });

    expect(completedEditButton).toBeInTheDocument();
    expect(completedEditButton).toHaveAttribute(
      "href",
      "/lists/list-abc-123/tasks/t-real-2/edit"
    );
  });

  // ────────────────────────────────────────────────
  // Task Pinning Tests – using named handlers only
  // ────────────────────────────────────────────────

  describe("Task Pinning", () => {
    beforeEach(() => {
      resetMockTasks(); // clean state for each pinning test
    });

    it("renders pin button for each task with correct initial icon (PinOff)", async () => {
      await renderListDetail();

      const pinButtons = await screen.findAllByRole("button", {
        name: /pin task to top|unpin task/i,
      });

      expect(pinButtons).toHaveLength(2);

      // Not pinned → "Pin task to top"
      expect(pinButtons[0]).toHaveAttribute("title", "Pin task to top");
    });

    it("shows visual highlight (amber background) when task is pinned", async () => {
      // Pin first task using helper
      setTaskPinned("t-real-1", true);

      await renderListDetail();

      const pinnedTask = await screen.findByText("Finish report");
      const taskItem = pinnedTask.closest("div"); // adjust selector if needed

      expect(taskItem).toHaveClass(/bg-amber-50\/60/);
      expect(taskItem).toHaveClass(/border-amber/);
    });

    it("optimistically toggles pin icon on click and calls mutation", async () => {
      server.use(taskPinToggleSuccess);

      await renderListDetail();

      const pinButton = await screen.findByRole("button", {
        name: "Pin task to top",
      });

      await user.click(pinButton);

      // Optimistic: filled pin icon appears
      await waitFor(() => {
        expect(pinButton.querySelector("svg.fill-amber-500")).toBeInTheDocument();
      });

      // Verify mock state updated by resolver
      await waitFor(() => {
        const tasks = getMockTasks();
        expect(tasks[0].isPinned).toBe(true);
      });
    });

    it("rolls back optimistic change when pin mutation fails", async () => {
      server.use(taskPinToggleFailure);  // ← failing handler

      await renderListDetail();

      const pinButton = await screen.findByRole("button", {
        name: "Pin task to top",
      });

      await user.click(pinButton);

      // Optimistic filled pin shows briefly
      await waitFor(() => {
        expect(pinButton.querySelector("svg.fill-amber-500")).toBeInTheDocument();
      });

      // After failure → rollback to PinOff
      await waitFor(
        () => {
          expect(pinButton.querySelector("svg:not(.fill-amber-500)")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("disables pin button during pending pin mutation", async () => {
      server.use(delayedTaskPinToggle);  // ← delayed handler for pending state

      await renderListDetail();

      const pinButton = await screen.findByRole("button", {
        name: "Pin task to top",
      });

      await user.click(pinButton);

      // During delay → disabled + opacity
      await waitFor(() => {
        expect(pinButton).toBeDisabled();
        expect(pinButton).toHaveClass(/opacity-50/);
      }, { timeout: 100 });

      // After delay ends → re-enabled
      await waitFor(() => {
        expect(pinButton).not.toBeDisabled();
      }, { timeout: 1000 });
    });

    it.only("pinned tasks appear first in the list (sorting)", async () => {
      server.use(taskGetByListPinnedFirst);  // ← pinned-first handler

      // Pin second task
      setTaskPinned("t-real-2", true);

      await renderListDetail();

      const taskTitles = await screen.findAllByText(/Finish report|Call client/);

      // Pinned ("Call client") should render first
      expect(taskTitles[1].textContent).toContain("Call client");
      expect(taskTitles[0].textContent).toContain("Finish report");
    });
  });
});