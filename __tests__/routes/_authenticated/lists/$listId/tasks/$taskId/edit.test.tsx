import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../../../../__mocks__/server";
import { renderWithProviders } from "../../../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneDetailPagePreset,
} from "../../../../../../../__mocks__/handlers/lists";

import {
  taskGetByListSuccess,
  taskUpdateHandler,
  delayedTaskUpdateHandler,
} from "../../../../../../../__mocks__/handlers/tasks";

import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../../../utils/act-suppress";

suppressActWarnings();

describe("Edit Task Page (/_authenticated/lists/$listId/tasks/$taskId/edit)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";
  const ORIGINAL_TITLE = "Finish report";

  const user = userEvent.setup();

  beforeEach(async () => {
    server.resetHandlers();
    resetMockLists();
    prepareDetailPageTestList();

    server.use(
      listGetAllHandler,
      listGetOneDetailPagePreset,
      taskGetByListSuccess,
      taskUpdateHandler,
    );

    const mockUser = {
      id: "test-user-123",
      email: "testuser@example.com",
      role: "authenticated",
      aud: "authenticated",
      app_metadata: {},
      user_metadata: {},
      identities: [],
      created_at: new Date().toISOString(),
    };

    useAuthStore.setState({
      session: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      },
      user: mockUser,
      loading: false,
      error: null,
      isInitialized: true,
    });
  });

  afterEach(async () => {
    server.resetHandlers();
    useAuthStore.setState(useAuthStore.getInitialState());
  });

  async function renderEditTaskPage(suffix = Date.now().toString()) {
    const path = `/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/edit${suffix ? `?test=${suffix}` : ""}`;

    renderWithProviders({
      initialEntries: [path],
    });

    await screen.findByTestId("edit-task-form", {}, { timeout: 5000 });

    const titleInput = await screen.findByRole("textbox", {
      name: /Task name/i,
    });

    await waitFor(() => expect(titleInput).toHaveValue(ORIGINAL_TITLE), {
      timeout: 3000,
    });

    return { titleInput };
  }

  it("renders page title, pre-filled inputs, and action buttons", async () => {
    await renderEditTaskPage();

    expect(screen.getByTestId("edit-task-form")).toBeInTheDocument();

    const titleInput = screen.getByRole("textbox", { name: /Task name/i });
    expect(titleInput).toHaveValue(ORIGINAL_TITLE);

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save Changes/i }),
    ).toBeInTheDocument();
  });

  it("shows validation error when submitting with empty title", async () => {
    const { titleInput } = await renderEditTaskPage();

    await user.clear(titleInput);
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(
      () => {
        expect(screen.getByText("Task name is required")).toBeInTheDocument();
      },
      { timeout: 2500 },
    );
  });

  it("shows loading state during task update", async () => {
    server.use(delayedTaskUpdateHandler);

    const { titleInput } = await renderEditTaskPage();

    await user.clear(titleInput);
    await user.type(titleInput, "Updated report");

    const saveButton = screen.getByRole("button", { name: /Save Changes/i });
    await user.click(saveButton);

    await screen.findByText("Saving...", {}, { timeout: 2500 });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("updates task successfully (optimistic update + navigation)", async () => {
    const updatedTitle = "Updated Finish report";

    await renderEditTaskPage();

    const titleInput = screen.getByRole("textbox", { name: /Task name/i });

    await user.clear(titleInput);
    await user.type(titleInput, updatedTitle);

    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(
      () => {
        expect(screen.queryByTestId("edit-task-form")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
