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
import { TRPCError } from "@trpc/server";

import { server } from "../../../../../__mocks__/server";
import { renderWithProviders } from "../../../../utils/test-helpers";

import { listGetOneDetailPagePreset } from "../../../../../__mocks__/handlers/lists";
import { trpcMsw } from "../../../../../__mocks__/trpcMsw";

import { useAuthStore } from "@/shared/store/authStore";
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

    // Default: one completed task
    server.use(
      trpcMsw.task.getByList.query(({ input }) => {
        if (input.listId !== TEST_LIST_ID) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "List not found",
          });
        }
        return [
          {
            id: "t-real-2",
            title: "Call client",
            description: null,
            order: 1,
            isPinned: false,
            isCompleted: true,
            dueDate: null,
            priority: null,
            listId: TEST_LIST_ID,
            isCurrent: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }),
    );

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

  async function renderCompletedPage(
    listId = TEST_LIST_ID,
    options: { waitForContent?: boolean } = { waitForContent: true },
  ) {
    const result = renderWithProviders({
      initialEntries: [`/lists/${listId}/tasks/completed`],
    });

    if (options.waitForContent) {
      await waitFor(
        () =>
          screen.queryByText("Completed Tasks") ||
          screen.queryByTestId("tasks-loading") ||
          screen.queryByText(/No completed tasks yet/i),
        { timeout: 4000 },
      );
    }

    return result;
  }

  it("shows loading spinner while fetching tasks", async () => {
    server.use(
      trpcMsw.task.getByList.query(() => {
        return new Promise((resolve) => setTimeout(() => resolve([]), 150));
      }),
    );

    await renderCompletedPage();

    await screen.findByTestId("tasks-loading", {}, { timeout: 3000 });
  });

  it("shows empty state when no completed tasks", async () => {
    server.use(
      trpcMsw.task.getByList.query(({ input }) => {
        if (input.listId !== TEST_LIST_ID) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "List not found",
          });
        }
        return [];
      }),
    );

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
    await renderCompletedPage();

    const topBack = await screen.findByRole("button", { name: "Back to list" });
    await userEvent.click(topBack);

    await waitFor(() => {
      expect(screen.queryByText("Completed Tasks")).not.toBeInTheDocument();
    });
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
    await renderCompletedPage();

    await screen.findByText("Call client");

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    await userEvent.click(moreButtons[0]);

    const deleteItem = await screen.findByRole("menuitem", { name: /delete/i });

    await userEvent.click(deleteItem);

    await waitFor(
      () => {
        expect(
          screen.queryByRole("menuitem", { name: /delete/i }),
        ).not.toBeInTheDocument();
      },
      { timeout: 1500 },
    );
  });
});