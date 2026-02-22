// __tests__/routes/_authenticated/lists/$listId.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../__mocks__/server";

import { renderWithTrpcRouter } from "../../../utils/test-helpers";

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
} from "../../../../__mocks__/handlers/tasks";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../act-suppress";

suppressActWarnings();

describe("List Detail Route (/_authenticated/lists/$listId)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    server.resetHandlers();
    resetMockTasks();

    // Default: successful list + tasks
    server.use(listGetOneDetailPagePreset);
    server.use(taskGetByListSuccess);

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => server.close());

  // ────────────────────────────────────────────────
  // Flexible render helper
  // ────────────────────────────────────────────────
  async function renderListDetail(
    listId = "list-abc-123",
    options: { waitForSuccess?: boolean } = { waitForSuccess: true },
  ) {
    const result = renderWithTrpcRouter({
      initialPath: `/lists/${listId}`,
      routeTree,
    });

    if (options.waitForSuccess) {
      // Wait for success content (title) to confirm page loaded successfully
      await screen.findByText("My Important Projects", {}, { timeout: 5000 });
    } else {
      // For loading/error tests: give React Query / MSW a moment to start
      // processing without forcing success content
      await waitFor(() => {}, { timeout: 100 }); // minimal stabilization
    }

    return result;
  }

  // ────────────────────────────────────────────────
  // DRY Helpers
  // ────────────────────────────────────────────────

  async function openMoreMenuForFirstTask() {
    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });
    await userEvent.click(moreButtons[0]);
    return await screen.findByRole("menu"); // dropdown/menu
  }

  // ────────────────────────────────────────────────

  it("renders list title and description when list is found", async () => {
    await renderListDetail();

    await screen.findByText("My Important Projects");
    await screen.findByText("Work-related stuff I must finish this month");
  });

  it("shows loading spinner while fetching list", async () => {
    server.use(listLoadingHandler);

    await renderListDetail("list-abc-123", { waitForSuccess: false });

    // Wait for spinner (increased timeout for MSW delay)
    await screen.findByTestId("loading-spinner", {}, { timeout: 3000 });
  });

  it("shows 'List not found' message when list does not exist", async () => {
    server.use(getListNotFoundHandler);

    await renderListDetail("list-abc-123", { waitForSuccess: false });

    // Wait for error/not-found message
    await screen.findByText(
      /not found|don't have access/i,
      {},
      { timeout: 2000 },
    );
    // Alternative (more robust if you have test id):
    // await screen.findByTestId("list-not-found", {}, { timeout: 2000 });
  });

  it("renders Add Task FAB with correct navigation target", async () => {
    const { history } = await renderListDetail();

    const fab = await screen.findByTestId("fab-add-task");

    expect(fab.tagName.toLowerCase()).toBe("a");
    expect(fab).toHaveAttribute("href", "/lists/list-abc-123/tasks/new");

    expect(
      within(fab).getByText("Add new task", { selector: "span.sr-only" }),
    ).toBeInTheDocument();

    await userEvent.click(fab);

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

    await screen.findByTestId("tasks-loading");
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

    const menu = await openMoreMenuForFirstTask();

    const deleteItem = within(menu).getByRole("menuitem", { name: /delete/i });
    await userEvent.click(deleteItem);

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

    const menu = await openMoreMenuForFirstTask();

    expect(within(menu).getByRole("menuitem", { name: /edit/i })).toBeVisible();

    await userEvent.keyboard("{Escape}");

    // Second task (if exists)
    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });
    if (moreButtons.length > 1) {
      await userEvent.click(moreButtons[1]);
      await waitFor(
        () => {
          expect(screen.getByRole("menuitem", { name: /edit/i })).toBeVisible();
        },
        { timeout: 2000 },
      );
    }
  });
});
