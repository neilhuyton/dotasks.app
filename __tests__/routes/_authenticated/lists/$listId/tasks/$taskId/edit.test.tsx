// __tests__/routes/_authenticated/lists/$listId/tasks/$taskId/edit.test.tsx

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";

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

import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../../../../../act-suppress";

suppressActWarnings();

describe("Edit Task Page (/_authenticated/lists/$listId/tasks/$taskId/edit)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const TEST_TASK_ID = "t-real-1";
  const ORIGINAL_TITLE = "Finish report";

  const user = userEvent.setup();

  let queryClient: QueryClient;

  beforeAll(() => {
    server.listen({
      onUnhandledRequest: (req) => {
        if (req.url.toString().includes("supabase.co/realtime")) return;
        console.warn(`[MSW] Unhandled ${req.method} ${req.url}`);
      },
    });
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    server.resetHandlers();
    resetMockLists();
    prepareDetailPageTestList();

    server.use(listGetAllHandler);
    server.use(listGetOneDetailPagePreset);
    server.use(taskGetByListSuccess);
    server.use(taskUpdateHandler);
  });

  afterEach(async () => {
    cleanup();
    await queryClient.clear();
    server.resetHandlers();

    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => server.close());

  async function renderEditTaskPage(suffix = Date.now().toString()) {
    const path = `/lists/${TEST_LIST_ID}/tasks/${TEST_TASK_ID}/edit${suffix ? `?test=${suffix}` : ""}`;

    renderWithProviders({
      initialEntries: [path],
      queryClient,
    });

    // Let router + queries settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    await screen.findByText("Edit Task", {}, { timeout: 5000 });

    const titleInput = await screen.findByRole("textbox", { name: /Task name/i });

    await waitFor(
      () => expect(titleInput).toHaveValue(ORIGINAL_TITLE),
      { timeout: 3000 },
    );

    return { titleInput };
  }

  it("renders page title, pre-filled inputs, and action buttons", async () => {
    await renderEditTaskPage();

    expect(screen.getByText("Edit Task")).toBeInTheDocument();

    const titleInput = screen.getByRole("textbox", { name: /Task name/i });
    expect(titleInput).toHaveValue(ORIGINAL_TITLE);

    expect(screen.getByRole("textbox", { name: /Description/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
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
    const updatedDesc = "New detailed description here";

    await renderEditTaskPage();

    const titleInput = screen.getByRole("textbox", { name: /Task name/i });
    const descInput = screen.getByRole("textbox", { name: /Description/i });

    await user.clear(titleInput);
    await user.type(titleInput, updatedTitle);

    await user.clear(descInput);
    await user.type(descInput, updatedDesc);

    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(
      () => {
        expect(screen.queryByText("Edit Task")).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});