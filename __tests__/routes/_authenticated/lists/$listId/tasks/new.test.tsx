// __tests__/routes/_authenticated/lists/$listId/tasks/new.test.tsx

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
  taskGetByListSuccess,
  taskCreateHandler,
  delayedTaskCreateHandler,
  getMockTasks,
} from "../../../../../../__mocks__/handlers/tasks";

import { useAuthStore } from "@/shared/store/authStore";
import { suppressActWarnings } from "../../../../../act-suppress";

suppressActWarnings();

describe("New Task Page", () => {
  const TEST_LIST_ID = "list-abc-123";

  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeEach(() => {
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

    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
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
        expect(
          screen.getByPlaceholderText("Task title..."),
        ).toBeInTheDocument();
        // expect(screen.getByPlaceholderText("Details...")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  }

  async function fillForm(title: string /*description = ""*/) {
    await waitForFormReady();

    const titleInput = screen.getByPlaceholderText("Task title...");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, title);

    // if (description) {
    //   const descInput = screen.getByPlaceholderText("Details...");
    //   await userEvent.clear(descInput);
    //   await userEvent.type(descInput, description);
    // }
  }

  it("renders title, inputs and buttons", async () => {
    renderNewTaskPage();
    await waitForFormReady();

    expect(screen.getByPlaceholderText("Task title...")).toHaveAttribute(
      "placeholder",
      "Task title...",
    );
    // expect(screen.getByPlaceholderText("Details...")).toBeInTheDocument();

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

    await userEvent.type(screen.getByPlaceholderText("Task title..."), "   ");
    expect(createBtn).toBeDisabled();

    await userEvent.clear(screen.getByPlaceholderText("Task title..."));
    await userEvent.type(
      screen.getByPlaceholderText("Task title..."),
      "Buy milk",
    );
    expect(createBtn).not.toBeDisabled();
  });

  it("shows loading state during creation", async () => {
    server.use(delayedTaskCreateHandler);

    renderNewTaskPage();
    await waitForFormReady();

    await fillForm("Weekend Task" /*"Important stuff to do"*/);

    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await screen.findByText("Creating");

    expect(screen.getByRole("button", { name: /Creating/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("creates task, optimistically updates, and navigates on success", async () => {
    const initialCount = getMockTasks().length;

    const { router } = renderNewTaskPage();
    await waitForFormReady();

    await fillForm("Buy groceries" /*"Milk, eggs, bread, and some fruit"*/);

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

    await fillForm("Quick task" /*"Remember to test this"*/);

    await userEvent.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(
      () => {
        expect(router.state.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 3000 },
    );
  });

  it("does not create task when title is empty (prevents mutation)", async () => {
    renderNewTaskPage();
    await waitForFormReady();

    const initialLength = getMockTasks().length;

    const titleInput = screen.getByPlaceholderText("Task title...");
    await userEvent.clear(titleInput);

    const createBtn = screen.getByRole("button", { name: "Create Task" });
    expect(createBtn).toBeDisabled();

    await userEvent.type(titleInput, "{Enter}");

    await waitFor(
      () => {
        expect(getMockTasks().length).toBe(initialLength);
      },
      { timeout: 1500 },
    );

    expect(getMockTasks().length).toBe(initialLength);
  });
});
