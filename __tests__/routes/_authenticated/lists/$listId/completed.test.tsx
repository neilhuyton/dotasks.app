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
import { server } from "../../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";

import { listGetOneDetailPagePreset } from "../../../../../__mocks__/handlers/lists";

import {
  taskGetByListOnlyCompleted,
  taskGetByListEmpty,
  taskGetByListLoading,
  resetMockTasks,
} from "../../../../../__mocks__/handlers/tasks";

describe("Completed Tasks Overlay (/_authenticated/lists/$listId/tasks/completed)", () => {
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
    server.use(taskGetByListOnlyCompleted);  // ← only completed tasks!

    resetMockTasks();

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

  const renderCompletedOverlay = async (listId = "list-abc-123") => {
    const history = createMemoryHistory({
      initialEntries: [`/lists/${listId}/tasks/completed`],
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
      screen.findByText("Completed Tasks", {}, { timeout: 4000 }).catch(() => null),
      screen.findByTestId("tasks-loading", {}, { timeout: 4000 }).catch(() => null),
      screen.findByText(/No completed tasks yet/i, {}, { timeout: 4000 }).catch(() => null),
    ]);

    if (
      !screen.queryByText("Completed Tasks") &&
      !screen.queryByTestId("tasks-loading") &&
      !screen.queryByText(/No completed tasks yet/i)
    ) {
      throw new Error("Completed overlay did not render expected content in time");
    }

    return { history };
  };

  // it("renders overlay title and back buttons", async () => {
  //   await renderCompletedOverlay();

  //   await screen.findByText("Completed Tasks");

  //   // Precise selectors
  //   expect(screen.getByRole("button", { name: "Back to list" })).toBeInTheDocument(); // top (aria-label)
  //   expect(screen.getByRole("button", { name: "Back to List" })).toBeInTheDocument(); // bottom (text)
  // });

  it("shows loading spinner while fetching tasks", async () => {
    server.use(taskGetByListLoading);
    await renderCompletedOverlay();
    await screen.findByTestId("tasks-loading", {}, { timeout: 3000 });
  });

  it("shows empty state when no completed tasks", async () => {
    server.use(taskGetByListEmpty);
    await renderCompletedOverlay();

    await screen.findByText(/No completed tasks yet/i);
    await screen.findByRole("button", { name: /Back to active tasks/i });
  });

  it("renders only completed tasks and correct count", async () => {
    await renderCompletedOverlay();

    await screen.findByText("Call client");
    await screen.findByText(/1 task/);

    expect(screen.queryByText("Finish report")).not.toBeInTheDocument();
  });

  it("navigates back via top back button", async () => {
    const { history } = await renderCompletedOverlay();

    const topBack = screen.getByRole("button", { name: "Back to list" });
    await user.click(topBack);

    expect(history.location.pathname).toBe("/lists/list-abc-123");
  });

  // it("navigates back via bottom back button", async () => {
  //   const { history } = await renderCompletedOverlay();

  //   const bottomBack = screen.getByRole("button", { name: "Back to List" });
  //   await user.click(bottomBack);

  //   expect(history.location.pathname).toBe("/lists/list-abc-123");
  // });

  it("opens more actions and shows edit for completed task", async () => {
    await renderCompletedOverlay();

    await screen.findByText("Call client");

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    expect(moreButtons).toHaveLength(1);

    await user.click(moreButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /edit/i })).toBeVisible();
    }, { timeout: 3000 });

    const editItem = screen.getByRole("menuitem", { name: /edit/i });
    expect(editItem.tagName).toBe("A");
    expect(editItem).toHaveAttribute(
      "href",
      expect.stringContaining("/lists/list-abc-123/tasks/t-real-2/edit"),
    );
  });

  it("navigates to delete confirmation for completed task", async () => {
    const { history } = await renderCompletedOverlay();

    await screen.findByText("Call client");

    const moreButtons = await screen.findAllByRole("button", {
      name: /more actions/i,
    });

    await user.click(moreButtons[0]);

    const deleteItem = await screen.findByRole("menuitem", { name: /delete/i });

    await user.click(deleteItem);

    await waitFor(() => {
      expect(history.location.pathname).toBe(
        "/lists/list-abc-123/tasks/t-real-2/delete",
      );
    }, { timeout: 1500 });
  });

  it.skip("removes task when unmarked as completed", async () => {
    // Skipped until toggle is accessible — add aria-label="Toggle complete" to TaskItem toggle
    // Then:
    // const toggle = await screen.findByRole("checkbox", { name: /complete/i }); // or whatever it is
    // await user.click(toggle);
    // await waitFor(() => expect(screen.queryByText("Call client")).not.toBeInTheDocument());
  });
});