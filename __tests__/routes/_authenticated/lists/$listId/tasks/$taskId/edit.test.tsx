// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/edit.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../../../../../../__mocks__/server";
import { renderWithProviders } from "../../../../../../utils/test-helpers";
import { trpcMsw } from "../../../../../../../__mocks__/trpcMsw";

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

import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../../../../../act-suppress";

suppressActWarnings();

describe("Edit Task Page (/_authenticated/lists/$listId/tasks/$taskId/edit)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";
  const ORIGINAL_TITLE = "Finish report";

  const user = userEvent.setup();

  beforeAll(() => {
    server.listen({
      onUnhandledRequest: (req) => {
        if (req.url.toString().includes("supabase.co/realtime")) return;
        console.warn(`[MSW] Unhandled ${req.method} ${req.url}`);
      },
    });
  });

  beforeEach(async () => {
    server.resetHandlers();
    resetMockLists();
    prepareDetailPageTestList();

    // Prevent MSW warnings + "Prisma user sync failed" logs
    server.use(
      trpcMsw.user.createOrSync.mutation(() => ({
        success: true,
        message: "User synced (mock)",
        user: { id: "test-user-123", email: "testuser@example.com" },
      })),
    );

    server.use(listGetAllHandler);
    server.use(listGetOneDetailPagePreset);
    server.use(taskGetByListSuccess);
    server.use(taskUpdateHandler);

    await useAuthStore.getState().initialize();
  });

  afterEach(async () => {
    server.resetHandlers();
    await useAuthStore.getState().signOut();
  });

  afterAll(() => server.close());

  async function renderEditTaskPage(suffix = Date.now().toString()) {
    const path = `/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/edit${suffix ? `?test=${suffix}` : ""}`;

    renderWithProviders({
      initialEntries: [path],
    });

    await screen.findByText("Edit Task", {}, { timeout: 5000 });

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

    expect(screen.getByText("Edit Task")).toBeInTheDocument();

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

    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

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
        expect(screen.queryByText("Edit Task")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
