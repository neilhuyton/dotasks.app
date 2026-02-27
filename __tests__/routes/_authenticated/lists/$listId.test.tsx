import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../__mocks__/server";
import { renderWithProviders } from "../../../utils/test-helpers";

import {
  getListNotFoundHandler,
  listGetOneDetailPagePreset,
} from "../../../../__mocks__/handlers/lists";

import {
  taskGetByListSuccess,
  taskGetByListLoading,
  taskDeleteSuccess,
  resetMockTasks,
} from "../../../../__mocks__/handlers/tasks";

import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../../act-suppress";

suppressActWarnings();

describe("List Detail Route (/_authenticated/lists/$listId)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
  afterAll(() => server.close());

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    server.resetHandlers();
    resetMockTasks();

    server.use(listGetOneDetailPagePreset);
    server.use(taskGetByListSuccess);
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

  async function renderListDetail(
    listId = "list-abc-123",
    options: { waitForSuccess?: boolean } = { waitForSuccess: true },
  ) {
    const result = renderWithProviders({
      initialEntries: [`/lists/${listId}`],
    });

    if (options.waitForSuccess) {
      await screen.findByText("My Important Projects", {}, { timeout: 4000 });
    } else {
      await new Promise((r) => setTimeout(r, 100));
    }

    return result;
  }

  async function openMoreMenuForFirstTask() {
    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });
    await userEvent.click(moreButtons[0]);
    return await screen.findByRole("menu");
  }

  it("renders list title and description when list is found", async () => {
    await renderListDetail();

    await screen.findByText("My Important Projects");
    await screen.findByText("Work-related stuff I must finish this month");
  });

  it("shows 'List not found' message when list does not exist", async () => {
    server.use(getListNotFoundHandler);

    await renderListDetail("list-abc-123", { waitForSuccess: false });

    await screen.findByText(
      /not found|don't have access/i,
      {},
      { timeout: 3000 },
    );
  });

  it("renders Add Task FAB with correct navigation target", async () => {
    const { router } = await renderListDetail();

    const fab = await screen.findByTestId("fab-add-task");

    expect(fab.tagName.toLowerCase()).toBe("a");
    expect(fab).toHaveAttribute("href", "/lists/list-abc-123/tasks/new");

    expect(
      within(fab).getByText("Add new task", { selector: "span.sr-only" }),
    ).toBeInTheDocument();

    await userEvent.click(fab);

    expect(router.state.location.pathname).toBe(
      "/lists/list-abc-123/tasks/new",
    );
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

    const { router } = await renderListDetail();

    await screen.findByText("Finish report");

    const menu = await openMoreMenuForFirstTask();

    const deleteItem = within(menu).getByRole("menuitem", { name: /delete/i });
    await userEvent.click(deleteItem);

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(
          "/lists/list-abc-123/tasks/t-real-1/delete",
        );
      },
      { timeout: 2000 },
    );
  });

  it("renders edit (pencil) button for each task", async () => {
    await renderListDetail();

    const menu = await openMoreMenuForFirstTask();

    expect(within(menu).getByRole("menuitem", { name: /edit/i })).toBeVisible();

    await userEvent.keyboard("{Escape}");

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
