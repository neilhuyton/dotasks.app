// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/edit.test.tsx

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
  taskGetByListSuccess,
  getMockTasks,
  taskUpdateHandler,
  delayedTaskUpdateHandler,
} from "../../../../../../../__mocks__/handlers/tasks";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../../../act-suppress";
import { trpcMsw } from "../../../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

suppressActWarnings();

describe("Edit Task Page (/_authenticated/lists/$listId/tasks/$taskId/edit)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";
  const ORIGINAL_TITLE = "Finish report";

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
    server.use(taskUpdateHandler);
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

  const renderEditTaskPage = async () => {
    const { history } = renderWithTrpcRouter({
      initialPath: `/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/edit`,
      routeTree,
    });

    // Wait for page to load
    await screen.findByText("Edit Task");
    await screen.findByDisplayValue(ORIGINAL_TITLE);

    return { history };
  };

  it("renders page title, inputs, and buttons", async () => {
    await renderEditTaskPage();

    expect(screen.getByText("Edit Task")).toBeInTheDocument();

    expect(screen.getByLabelText(/Task name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e.g. Finish quarterly report/i),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Description \(optional\)/i),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Changes/i }),
    ).toBeInTheDocument();
  });

  it("disables Save Changes button when title is empty or whitespace", async () => {
    await renderEditTaskPage();

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    expect(saveButton).not.toBeDisabled();

    const titleInput = screen.getByLabelText(/Task name/i);

    await user.clear(titleInput);
    await waitFor(() => expect(saveButton).toBeDisabled());

    await user.type(titleInput, "   ");
    await waitFor(() => expect(saveButton).toBeDisabled());

    await user.clear(titleInput);
    await user.type(titleInput, "Valid updated title");
    await waitFor(() => expect(saveButton).not.toBeDisabled());
  });

  it("shows loading state during task update", async () => {
    server.use(delayedTaskUpdateHandler);

    await renderEditTaskPage();

    const titleInput = screen.getByLabelText(/Task name/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Updated report");

    const form = screen.getByTestId("edit-task-form");
    fireEvent.submit(form);

    await screen.findByText("Saving...");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("updates task with optimistic update and navigates on success", async () => {
    server.use(taskUpdateHandler);

    const { history } = await renderEditTaskPage();

    const titleInput = screen.getByLabelText(/Task name/i);
    const descInput = screen.getByLabelText(/Description/i);

    await user.clear(titleInput);
    await user.type(titleInput, "Updated Finish report");

    await user.clear(descInput);
    await user.type(descInput, "New detailed description here");

    const form = screen.getByTestId("edit-task-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 5000 },
    );

    const updatedTasks = getMockTasks();
    const updated = updatedTasks.find((t) => t.id === TEST_TASK_ID);
    expect(updated?.title).toBe("Updated Finish report");
    expect(updated?.description).toBe("New detailed description here");
  });

  it("rolls back optimistic update on update error", async () => {
    server.use(
      trpcMsw.task.update.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Update failed",
        });
      }),
    );

    const { history } = await renderEditTaskPage();

    await user.clear(screen.getByLabelText(/Task name/i));
    await user.type(screen.getByLabelText(/Task name/i), "Will fail");

    const form = screen.getByTestId("edit-task-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        const tasks = getMockTasks();
        const updated = tasks.find((t) => t.id === TEST_TASK_ID);
        expect(updated?.title).toBe(ORIGINAL_TITLE);
      },
      { timeout: 3000 },
    );

    expect(history.location.pathname).not.toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("navigates back to list on Cancel button click", async () => {
    const { history } = await renderEditTaskPage();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("navigates back on Back (ArrowLeft) button click", async () => {
    const { history } = await renderEditTaskPage();

    await user.click(
      screen.getByRole("button", { name: "Cancel and return to task list" }),
    );

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
  });

  it.todo(
    "does not submit when title is empty (prevents mutation)",
    async () => {
      resetMockTasks();
      const initialTasks = getMockTasks();
      const initialTask = initialTasks.find((t) => t.id === TEST_TASK_ID);
      expect(initialTask?.title, "Mock data not reset before test").toBe(
        ORIGINAL_TITLE,
      );

      const { history } = await renderEditTaskPage();

      const titleInput = screen.getByLabelText(/Task name/i);
      const saveButton = screen.getByRole("button", { name: /Save Changes/i });

      // 1. Clear and force RHF / React to process it
      await user.clear(titleInput);

      // 2. Wait until input is truly empty AND button is disabled
      await waitFor(
        () => {
          expect(titleInput).toHaveValue("");
          expect(saveButton).toBeDisabled();
        },
        { timeout: 2000 },
      );

      // 3. Try to submit via click (should do nothing because disabled)
      await user.click(saveButton);

      // 4. Also try programmatic submit on the form (common hidden cause)
      const form = screen.getByTestId("edit-task-form");
      fireEvent.submit(form);

      // 5. Give generous time for any pending optimistic update to apply if it wrongly fired
      await new Promise((r) => setTimeout(r, 1500));

      // 6. Assert final state
      const taskAfter = getMockTasks().find((t) => t.id === TEST_TASK_ID);
      expect(taskAfter?.title).toBe(ORIGINAL_TITLE);
      expect(history.location.pathname).not.toBe(`/lists/${TEST_LIST_ID}`);
    },
  );
});