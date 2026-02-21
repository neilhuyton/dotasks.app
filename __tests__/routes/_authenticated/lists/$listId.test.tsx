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
import { render, screen, waitFor, within } from "@testing-library/react";
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

    // Safe Radix cleanup
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "";
    document.body.style.position = "";
    document
      .querySelectorAll(
        '[data-radix-focus-guard], [data-aria-hidden], [aria-hidden="true"]',
      )
      .forEach((el) => el.remove());
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

    await Promise.race([
      screen
        .findByText("Finish report", {}, { timeout: 4000 })
        .catch(() => null),
      screen
        .findByTestId("list-loading", {}, { timeout: 4000 })
        .catch(() => null),
      screen
        .findByTestId("tasks-loading", {}, { timeout: 4000 })
        .catch(() => null),
      screen
        .findByTestId("list-not-found", {}, { timeout: 4000 })
        .catch(() => null),
    ]);

    if (
      !screen.queryByText("Finish report") &&
      !screen.queryByTestId("list-loading") &&
      !screen.queryByTestId("tasks-loading") &&
      !screen.queryByTestId("list-not-found")
    ) {
      throw new Error(
        "List detail page did not render any expected content within 4 seconds",
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

  it("renders Add Task FAB with correct navigation target", async () => {
    const { history } = await renderListDetail();

    const fab = await screen.findByTestId("fab-add-task");

    // Since Button asChild + Link renders <a> directly with href
    expect(fab.tagName.toLowerCase()).toBe("a");
    expect(fab).toHaveAttribute("href", "/lists/list-abc-123/tasks/new");

    // Confirm the sr-only label is present (good accessibility check)
    expect(within(fab).getByText("Add new task", { selector: "span.sr-only" })).toBeInTheDocument();

    await user.click(fab);

    expect(history.location.pathname).toBe("/lists/list-abc-123/tasks/new");
  });

  it("renders TaskList component with tasks", async () => {
    await renderListDetail();
    await screen.findByText("Finish report");
    expect(screen.queryByText("Call client")).not.toBeInTheDocument();
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

  it("displays the Active Tasks counter with correct count", async () => {
    await renderListDetail();
    const activeHeading = await screen.findByRole("heading", {
      level: 3,
      name: /Active/i,
    });
    expect(activeHeading).toHaveTextContent("Active (1)");
  });

  it("triggers delete action with correct task ID when delete button is clicked", async () => {
    server.use(taskDeleteSuccess);

    const { history } = await renderListDetail();

    await screen.findByText("Finish report");

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    await user.click(moreButtons[0]);

    const deleteItem = await screen.findByRole("menuitem", { name: /delete/i });

    await user.click(deleteItem);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(
          "/lists/list-abc-123/tasks/t-real-1/delete",
        );
      },
      { timeout: 1500 },
    );
  });

  it("renders edit (pencil) button for each task", async () => {
    await renderListDetail();

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    // First task
    await user.click(moreButtons[0]);
    await waitFor(
      () => {
        expect(screen.getByRole("menuitem", { name: /edit/i })).toBeVisible();
      },
      { timeout: 3000 },
    );

    await user.keyboard("{Escape}");
    await waitFor(
      () => {
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    // Second task (assuming there are at least two active tasks now)
    await user.click(moreButtons[1]);
    await waitFor(
      () => {
        expect(screen.getByRole("menuitem", { name: /edit/i })).toBeVisible();
      },
      { timeout: 3000 },
    );
  });

  // ────────────────────────────────────────────────────────────────
  // This test is no longer valid on the main list page.
  // Completed tasks (and their edit buttons) are now only visible
  // on the /tasks/completed overlay route.
  // Move this test to a new file if you want to keep coverage.
  // ────────────────────────────────────────────────────────────────
  it.skip("renders edit button even for completed tasks", async () => {
    // Intentionally skipped – completed tasks moved to separate route
  });

  describe("Task Pinning", () => {
    beforeEach(() => {
      resetMockTasks();
    });

    it("renders pin button for each task with correct initial icon (PinOff)", async () => {
      await renderListDetail();

      const moreButtons = await screen.findAllByRole("button", {
        name: /more actions/i,
      });

      await user.click(moreButtons[0]);

      const pinItem = await screen.findByRole("menuitem", {
        name: /pin to top/i,
      });

      expect(pinItem).toBeInTheDocument();
      expect(pinItem.querySelector("svg.fill-*")).not.toBeInTheDocument();
    });

    it("shows visual highlight (amber background) when task is pinned", async () => {
      setTaskPinned("t-real-1", true);
      await renderListDetail();

      const pinnedTitle = await screen.findByText("Finish report");

      const taskItem = pinnedTitle.closest(
        '[class*="min-h-[44px]"], [class*="px-2\\.5 py-1\\.5"], [class*="bg-card"]',
      );

      if (!taskItem)
        throw new Error("Pinned task item not found with expected classes");

      expect(taskItem).toHaveClass(/bg-amber-50\/60/);
      expect(taskItem).toHaveClass(/border-amber/);
    });

    it("optimistically toggles pin icon on click and calls mutation", async () => {
      server.use(taskPinToggleSuccess);

      await renderListDetail();

      const moreButtons = await screen.findAllByRole("button", {
        name: /more actions/i,
      });
      await user.click(moreButtons[0]);

      const pinItem = await screen.findByRole("menuitem", {
        name: "Pin to top",
      });
      await user.click(pinItem);

      // Close the dropdown menu so the task item is fully visible for assertion
      await user.keyboard("{Escape}");

      await waitFor(
        () => {
          const taskTitle = screen.getByText("Finish report");
          const taskItem = taskTitle.closest(
            '[class*="min-h-[44px]"], [class*="px-2\\.5 py-1\\.5"], [class*="bg-card"]',
          );
          if (!taskItem) throw new Error("Task item container not found");
          expect(taskItem).toHaveClass(/bg-amber-50\/60|amber/);
        },
        { timeout: 3000 },
      );
    });

    it("rolls back optimistic change when pin mutation fails", async () => {
      server.use(taskPinToggleFailure);

      await renderListDetail();

      const moreButtons = await screen.findAllByRole("button", {
        name: /more actions/i,
      });
      await user.click(moreButtons[0]);

      const pinItem = await screen.findByRole("menuitem", {
        name: "Pin to top",
      });
      await user.click(pinItem);

      // Close the dropdown menu
      await user.keyboard("{Escape}");

      // Optimistic update: amber background should appear
      await waitFor(
        () => {
          const taskTitle = screen.getByText("Finish report");
          const taskItem = taskTitle.closest(
            '[class*="min-h-[44px]"], [class*="px-2\\.5 py-1\\.5"], [class*="bg-card"]',
          );
          if (!taskItem) throw new Error("Task item container not found");
          expect(taskItem).toHaveClass(/bg-amber-50\/60|amber/);
        },
        { timeout: 3000 },
      );

      // After error propagation and rollback: amber background should disappear
      await waitFor(
        () => {
          const taskTitle = screen.getByText("Finish report");
          const taskItem = taskTitle.closest(
            '[class*="min-h-[44px]"], [class*="px-2\\.5 py-1\\.5"], [class*="bg-card"]',
          );
          if (!taskItem) throw new Error("Task item container not found");
          expect(taskItem).not.toHaveClass(/bg-amber-50\/60|amber/);
        },
        { timeout: 5000 },
      );
    }, 15000);

    it("disables more actions button while pin toggle mutation is pending", async () => {
      server.use(delayedTaskPinToggle);

      await renderListDetail();

      const moreActionsButtons = await screen.findAllByRole("button", {
        name: /more actions/i,
      });
      const triggerButton = moreActionsButtons[0];

      expect(triggerButton).not.toBeDisabled();

      await user.click(triggerButton);

      const pinItem = await screen.findByTestId(
        "pin-toggle-menu-item",
        undefined,
        {
          timeout: 6000,
        },
      );

      await waitFor(() => expect(pinItem).toBeVisible(), { timeout: 2000 });

      await user.click(pinItem);

      await waitFor(() => expect(triggerButton).toBeDisabled(), {
        timeout: 8000,
        interval: 100,
      });

      await waitFor(() => expect(triggerButton).not.toBeDisabled(), {
        timeout: 12000,
        interval: 150,
      });

      // Optional: confirm final pinned state via UI after mutation completes
      await user.keyboard("{Escape}");

      await waitFor(
        () => {
          const taskTitle = screen.getByText("Finish report");
          const taskItem = taskTitle.closest(
            '[class*="min-h-[44px]"], [class*="px-2\\.5 py-1\\.5"], [class*="bg-card"]',
          );
          if (!taskItem) throw new Error("Task item container not found");
          expect(taskItem).toHaveClass(/bg-amber-50\/60|amber/);
        },
        { timeout: 5000 },
      );
    }, 30000);

    it.skip("pinned tasks appear first in the list (sorting)", async () => {
      server.use(taskGetByListPinnedFirst);
      setTaskPinned("t-real-2", true);

      await renderListDetail();

      const titles = await screen.findAllByText(/Finish report|Call client/);
      expect(titles[0].textContent).toContain("Call client");
      expect(titles[1].textContent).toContain("Finish report");
    });
  });
});