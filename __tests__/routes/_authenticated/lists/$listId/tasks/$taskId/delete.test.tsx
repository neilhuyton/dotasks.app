// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/delete.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../../../../__mocks__/server";
import { renderWithTrpcRouter } from "../../../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneSuccessHandler,
} from "../../../../../../../__mocks__/handlers/lists";

import {
  resetMockTasks,
  getMockTasks,
  taskGetByListSuccess,
  taskDeleteSuccess,
  delayedTaskDeleteHandler,
} from "../../../../../../../__mocks__/handlers/tasks";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../../../act-suppress";
import { trpcMsw } from "../../../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";
import type { Task } from "@/types/task";

suppressActWarnings();

describe("Delete Task Confirmation Page (/_authenticated/lists/$listId/tasks/$taskId/delete)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";
  const TEST_TASK_TITLE = "Finish report";

  const user = userEvent.setup();

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
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

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);
    server.use(taskGetByListSuccess);
    server.use(taskDeleteSuccess);
  });

  afterEach(async () => {
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
    const { history } = renderWithTrpcRouter({
      initialPath: `/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/delete`,
      routeTree,
    });

    await screen.findByRole("heading", { name: /Delete/i });

    return { history };
  };

  it("renders confirmation message, task title, and buttons", async () => {
    await renderDeleteTaskPage();

    expect(
      screen.getByRole("heading", {
        name: new RegExp(`Delete "${TEST_TASK_TITLE}"\\?`, "i"),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/This action cannot be undone/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^Cancel$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete Task$/i })).toBeInTheDocument();
  });

  it("shows loading state during deletion", async () => {
    server.use(delayedTaskDeleteHandler);

    await renderDeleteTaskPage();

    const deleteBtn = screen.getByRole("button", { name: /^Delete Task$/i });

    const form = deleteBtn.closest("form")!;

    fireEvent.submit(form);

    await screen.findByText("Deleting...", {}, { timeout: 2000 });

    expect(deleteBtn).toBeDisabled();

    expect(screen.getByRole("button", { name: /^Cancel$/i })).toBeDisabled();
  });

  it("deletes task with optimistic update and navigates on success", async () => {
    const { history } = await renderDeleteTaskPage();

    const deleteBtn = screen.getByRole("button", { name: /^Delete Task$/i });

    const form = deleteBtn.closest("form")!;

    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 5000 },
    );

    const finalTasks = getMockTasks();
    expect(finalTasks.some(t => t.id === TEST_TASK_ID)).toBe(false);
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

    const { history } = await renderDeleteTaskPage();

    const deleteBtn = screen.getByRole("button", { name: /^Delete Task$/i });

    const form = deleteBtn.closest("form")!;

    fireEvent.submit(form);

    await waitFor(
      () => {
        const tasks = getMockTasks();
        expect(tasks.some(t => t.id === TEST_TASK_ID)).toBe(true);
      },
      { timeout: 3000 },
    );

    expect(history.location.pathname).not.toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("navigates back to list on Cancel button click", async () => {
    const { history } = await renderDeleteTaskPage();

    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("navigates back to list on Back (ArrowLeft) button click", async () => {
    const { history } = await renderDeleteTaskPage();

    await user.click(
      screen.getByRole("button", { name: "Cancel and return to list" }),
    );

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Task,
      ]),
    );

    await renderDeleteTaskPage();

    expect(
      screen.getByRole("heading", {
        name: /Delete ""\?/i,
      }),
    ).toBeInTheDocument();
  });
});