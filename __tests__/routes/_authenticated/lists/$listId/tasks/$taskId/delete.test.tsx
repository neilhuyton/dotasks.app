// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/delete.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";

import { server } from "../../../../../../../__mocks__/server";
import {
  renderWithProviders,
  createTestQueryClient,
} from "../../../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneDetailPagePreset,
} from "../../../../../../../__mocks__/handlers/lists";

import {
  resetMockTasks,
  getMockTasks,
  taskGetByListSuccess,
  taskDeleteSuccess,
} from "../../../../../../../__mocks__/handlers/tasks";

import { trpcMsw } from "../../../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";
import { useAuthStore } from "@/shared/store/authStore";
import { http, HttpResponse } from "msw";

describe("Delete Task Confirmation Page (/_authenticated/lists/$listId/tasks/$taskId/delete)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";
  const TASK_TITLE = "Finish report";

  let queryClient: QueryClient;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });

    server.use(
      http.get("https://*.supabase.co/realtime/v1/websocket", () => {
        return new HttpResponse(null, { status: 400 });
      }),
    );
  });

  afterAll(() => server.close());

  beforeEach(() => {
    queryClient = createTestQueryClient();

    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    server.resetHandlers();
    resetMockLists();
    resetMockTasks();
    prepareDetailPageTestList();

    server.use(
      listGetAllHandler,
      listGetOneDetailPagePreset,
      taskGetByListSuccess,
      taskDeleteSuccess,
    );
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
    vi.restoreAllMocks();
  });

  async function renderDeleteTaskPage(
    listId = TEST_LIST_ID,
    taskId = TEST_TASK_ID,
    options: { waitForHeading?: boolean } = { waitForHeading: true },
  ) {
    const result = renderWithProviders({
      initialEntries: [`/lists/${listId}/tasks/${taskId}/delete`],
      queryClient,
    });

    if (options.waitForHeading) {
      await screen.findByRole(
        "heading",
        {
          name: new RegExp(`Delete "${TASK_TITLE}"\\?`, "i"),
        },
        { timeout: 1200 },
      );
    }

    return { ...result, queryClient };
  }

  it("renders confirmation heading, warning text, and action buttons", async () => {
    await renderDeleteTaskPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: new RegExp(`Delete "${TASK_TITLE}"\\?`, "i"),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/This action cannot be undone/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Task" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Cancel and return to list/i }),
    ).toBeInTheDocument();
  });

  it("deletes task optimistically and navigates on success", async () => {
    const { router } = await renderDeleteTaskPage();

    const navigateSpy = vi.spyOn(router, "navigate");

    await userEvent.click(screen.getByRole("button", { name: "Delete Task" }));

    await waitFor(
      () => {
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "/lists/$listId",
            params: { listId: TEST_LIST_ID },
            replace: true,
          }),
        );
      },
      { timeout: 1200 },
    );

    expect(getMockTasks().some((t) => t.id === TEST_TASK_ID)).toBe(false);
  });

  it("rolls back optimistic update on deletion error", async () => {
    server.use(
      trpcMsw.task.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Deletion failed",
        });
      }),
    );

    await renderDeleteTaskPage();

    const initialHasTask = getMockTasks().some((t) => t.id === TEST_TASK_ID);
    expect(initialHasTask).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Delete Task" }));

    await waitFor(
      () => {
        expect(getMockTasks().some((t) => t.id === TEST_TASK_ID)).toBe(true);
      },
      { timeout: 1200 },
    );

    expect(
      screen.getByRole("button", { name: "Delete Task" }),
    ).toBeInTheDocument();
  });

  it("navigates back to list on Cancel button click", async () => {
    const { router } = await renderDeleteTaskPage();

    const navigateSpy = vi.spyOn(router, "navigate");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      }),
    );
  });

  it("navigates back to list on back arrow click", async () => {
    const { router } = await renderDeleteTaskPage();

    const navigateSpy = vi.spyOn(router, "navigate");

    await userEvent.click(
      screen.getByRole("button", { name: "Cancel and return to list" }),
    );

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      }),
    );
  });

  it("renders generic title when task title is missing", async () => {
    server.use(
      trpcMsw.task.getByList.query(() => [
        {
          id: TEST_TASK_ID,
          title: "",
          description: null,
          listId: TEST_LIST_ID,
          dueDate: null,
          priority: null,
          order: 0,
          isCompleted: false,
          isCurrent: false,
          isPinned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
    );

    await renderDeleteTaskPage(TEST_LIST_ID, TEST_TASK_ID, {
      waitForHeading: false,
    });

    await screen.findByRole(
      "heading",
      {
        name: /Delete ""\?/i,
      },
      { timeout: 1200 },
    );

    expect(
      screen.getByRole("heading", { name: /Delete ""\?/i }),
    ).toBeInTheDocument();
  });
});
