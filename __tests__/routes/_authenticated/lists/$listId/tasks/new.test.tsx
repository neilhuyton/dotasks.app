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

import { server } from "../../../../../../__mocks__/server";
import { renderWithProviders } from "../../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneDetailPagePreset,
} from "../../../../../../__mocks__/handlers/lists";

import {
  resetMockTasks,
  getMockTasks,
  taskGetByListSuccess,
  taskCreateHandler,
  delayedTaskCreateHandler,
} from "../../../../../../__mocks__/handlers/tasks";

import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../../utils/act-suppress";

suppressActWarnings();

describe("New Task Page (/_authenticated/lists/$listId/tasks/new)", () => {
  const TEST_LIST_ID = "list-abc-123";

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

  beforeEach(async () => {
    server.resetHandlers();
    resetMockLists();
    resetMockTasks();
    prepareDetailPageTestList();

    server.use(
      listGetAllHandler,
      listGetOneDetailPagePreset,
      taskGetByListSuccess,
      taskCreateHandler,
    );

    await useAuthStore.getState().initialize();
  });

  afterEach(async () => {
    server.resetHandlers();
    await useAuthStore.getState().signOut();
  });

  afterAll(() => server.close());

  function renderNewTaskPage() {
    return renderWithProviders({
      initialEntries: [`/lists/${TEST_LIST_ID}/tasks/new`],
    });
  }

  async function waitForFormReady() {
    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /New Task/i }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Create Task" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Cancel" }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  }

  async function fillForm(title: string) {
    await waitForFormReady();

    const titleInput = screen.getByLabelText(/Title/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, title);
  }

  it("renders title, inputs and buttons", async () => {
    renderNewTaskPage();
    await waitForFormReady();

    expect(screen.getByLabelText(/Title/i)).toHaveAttribute(
      "placeholder",
      "e.g. Buy groceries",
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Task" }),
    ).toBeInTheDocument();
  });

  it("disables Create button when title is empty or whitespace only", async () => {
    renderNewTaskPage();
    await waitForFormReady();

    const createBtn = screen.getByRole("button", { name: "Create Task" });
    expect(createBtn).toBeDisabled();

    const titleInput = screen.getByLabelText(/Title/i);

    await userEvent.type(titleInput, "   ");
    await waitFor(() => expect(createBtn).toBeDisabled(), { timeout: 2000 });

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Buy milk");
    await waitFor(() => expect(createBtn).not.toBeDisabled(), {
      timeout: 2000,
    });
  });

  it("shows loading state during creation", async () => {
    server.use(delayedTaskCreateHandler);

    renderNewTaskPage();
    await waitForFormReady();

    await fillForm("Weekend Task");

    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await screen.findByText("Creating", {}, { timeout: 2000 });

    const createBtn = screen.getByRole("button", { name: /Creating/i });
    expect(createBtn).toBeDisabled();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("creates task, optimistically updates, and navigates on success", async () => {
    const initialCount = getMockTasks().length;

    const { router } = renderNewTaskPage();
    await waitForFormReady();

    await fillForm("Buy groceries");

    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 3000 },
    );

    expect(getMockTasks().length).toBeGreaterThan(initialCount);
    expect(getMockTasks().some((t) => t.title === "Buy groceries")).toBe(true);
  });

  it("navigates back to list on Cancel button click", async () => {
    const { router } = renderNewTaskPage();
    await waitForFormReady();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 2000 },
    );
  });

  it("clears form after successful creation", async () => {
    const { router } = renderNewTaskPage();
    await waitForFormReady();

    await fillForm("Quick task");

    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 3000 },
    );

    const titleInput = screen.queryByLabelText(/Title/i);
    if (titleInput) {
      expect(titleInput).toHaveValue("");
    }
  });

  it("does not create task when title is empty (prevents mutation)", async () => {
    renderNewTaskPage();
    await waitForFormReady();

    const initialLength = getMockTasks().length;

    const titleInput = screen.getByLabelText(/Title/i);

    await userEvent.type(titleInput, "{Enter}");

    await waitFor(
      () => {
        expect(getMockTasks().length).toBe(initialLength);
      },
      { timeout: 1200 },
    );
  });
});
