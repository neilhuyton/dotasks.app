// __tests__/routes/_authenticated/lists/$listId/tasks/completed.test.tsx

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
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../../__mocks__/server";
import { renderWithTrpcRouter } from "../../../../utils/test-helpers";

import { listGetOneDetailPagePreset } from "../../../../../__mocks__/handlers/lists";

import {
  taskGetByListOnlyCompleted,
  taskGetByListEmpty,
  taskGetByListLoading,
  resetMockTasks,
} from "../../../../../__mocks__/handlers/tasks";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../act-suppress";

suppressActWarnings();

describe("Completed Tasks Page (/_authenticated/lists/$listId/tasks/completed)", () => {
  const TEST_LIST_ID = "list-abc-123";

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    server.resetHandlers();
    server.use(listGetOneDetailPagePreset);
    server.use(taskGetByListOnlyCompleted); // ← only completed tasks!

    resetMockTasks();

    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
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

  const renderCompletedPage = async (listId = TEST_LIST_ID) => {
    const { history } = renderWithTrpcRouter({
      initialPath: `/lists/${listId}/tasks/completed`,
      routeTree,
    });

    // Wait for one of the expected states (title, loading, or empty)
    await Promise.race([
      screen
        .findByText("Completed Tasks", {}, { timeout: 4000 })
        .catch(() => null),
      screen
        .findByTestId("tasks-loading", {}, { timeout: 4000 })
        .catch(() => null),
      screen
        .findByText(/No completed tasks yet/i, {}, { timeout: 4000 })
        .catch(() => null),
    ]);

    // Safety check to ensure something rendered
    if (
      !screen.queryByText("Completed Tasks") &&
      !screen.queryByTestId("tasks-loading") &&
      !screen.queryByText(/No completed tasks yet/i)
    ) {
      throw new Error(
        "Completed tasks page did not render expected content in time",
      );
    }

    return { history };
  };

  it("shows loading spinner while fetching tasks", async () => {
    server.use(taskGetByListLoading);

    await renderCompletedPage();

    await screen.findByTestId("tasks-loading", {}, { timeout: 3000 });
  });

  it("shows empty state when no completed tasks", async () => {
    server.use(taskGetByListEmpty);

    await renderCompletedPage();

    await screen.findByText(/No completed tasks yet/i);
    await screen.findByRole("button", { name: /Back to active tasks/i });
  });

  it("renders only completed tasks and correct count", async () => {
    await renderCompletedPage();

    await screen.findByText("Call client");
    await screen.findByText(/1 task/);

    expect(screen.queryByText("Finish report")).not.toBeInTheDocument();
  });

  it("navigates back via top back button", async () => {
    const { history } = await renderCompletedPage();

    const topBack = screen.getByRole("button", { name: "Back to list" });
    await userEvent.click(topBack);

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("opens more actions and shows edit for completed task", async () => {
    await renderCompletedPage();

    await screen.findByText("Call client");

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    expect(moreButtons).toHaveLength(1);

    await userEvent.click(moreButtons[0]);

    await waitFor(
      () => {
        expect(screen.getByRole("menuitem", { name: /edit/i })).toBeVisible();
      },
      { timeout: 3000 },
    );

    const editItem = screen.getByRole("menuitem", { name: /edit/i });
    expect(editItem.tagName).toBe("A");
    expect(editItem).toHaveAttribute(
      "href",
      expect.stringContaining(`/lists/${TEST_LIST_ID}/tasks/t-real-2/edit`),
    );
  });

  it("navigates to delete confirmation for completed task", async () => {
    const { history } = await renderCompletedPage();

    await screen.findByText("Call client");

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    await userEvent.click(moreButtons[0]);

    const deleteItem = await screen.findByRole("menuitem", { name: /delete/i });

    await userEvent.click(deleteItem);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(
          `/lists/${TEST_LIST_ID}/tasks/t-real-2/delete`,
        );
      },
      { timeout: 1500 },
    );
  });
});
