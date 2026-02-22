// __tests__/routes/_authenticated/lists/$listId/tasks/new.test.tsx

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

import { server } from "../../../../../../__mocks__/server";
import { renderWithTrpcRouter } from "../../../../../utils/test-helpers";

import {
  resetMockLists,
  prepareDetailPageTestList,
  listGetAllHandler,
  listGetOneSuccessHandler,
} from "../../../../../../__mocks__/handlers/lists";

import {
  resetMockTasks,
  taskGetByListSuccess,
  taskCreateHandler,
  delayedTaskCreateHandler,
  getMockTasks,
} from "../../../../../../__mocks__/handlers/tasks";

import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../../../act-suppress";

suppressActWarnings();

describe("New Task Page (/_authenticated/lists/$listId/tasks/new)", () => {
  const TEST_LIST_ID = "list-abc-123";
  const user = userEvent.setup(); // ← Restored here

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
    server.use(taskCreateHandler);
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

  const renderNewTaskPage = async () => {
    const { history } = renderWithTrpcRouter({
      initialPath: `/lists/${TEST_LIST_ID}/tasks/new`,
      routeTree,
    });

    // Wait for page heading to confirm load
    await screen.findByRole("heading", { name: /New Task/i });

    return { history };
  };

  it("renders title, description input, and buttons", async () => {
    await renderNewTaskPage();

    expect(
      screen.getByRole("heading", { name: "New Task" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter task title..."),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        /Add any notes, steps, links, or extra context.../i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Task" }),
    ).toBeInTheDocument();
  });

  it("disables submit button when title is empty (even if description filled)", async () => {
    await renderNewTaskPage();

    const createButton = screen.getByRole("button", { name: "Create Task" });
    expect(createButton).toBeDisabled();

    const descInput = screen.getByPlaceholderText(/Add any notes/i);
    await user.type(descInput, "Some very important notes here");

    expect(createButton).toBeDisabled();
  });

  it("enables submit button when title is filled", async () => {
    await renderNewTaskPage();

    const input = screen.getByPlaceholderText("Enter task title...");
    await user.type(input, "Buy milk");

    const createButton = screen.getByRole("button", { name: "Create Task" });
    expect(createButton).not.toBeDisabled();
  });

  it("shows loading state during task creation", async () => {
    server.use(delayedTaskCreateHandler);

    await renderNewTaskPage();

    const titleInput = screen.getByPlaceholderText("Enter task title...");
    await user.type(titleInput, "Test task");

    fireEvent.click(screen.getByRole("button", { name: /^Create Task$/ }));

    await screen.findByText("Creating...");

    const createButton = screen.getByRole("button", { name: "Creating..." });
    expect(createButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("navigates back to list on Cancel button click", async () => {
    const { history } = await renderNewTaskPage();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("navigates back to list on Back (ArrowLeft) button click", async () => {
    const { history } = await renderNewTaskPage();

    await user.click(screen.getByRole("button", { name: "Back to list" }));

    expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
  });

  it("creates task with title + description, optimistic update, and navigates on success", async () => {
    server.use(taskCreateHandler);

    const { history } = await renderNewTaskPage();

    const titleInput = screen.getByPlaceholderText("Enter task title...");
    const descInput = screen.getByPlaceholderText(/Add any notes/i);

    await user.type(titleInput, "Buy groceries");
    await user.type(descInput, "Milk, eggs, bread, and some fruit");

    fireEvent.click(screen.getByRole("button", { name: /^Create Task$/ }));

    await waitFor(
      () => {
        expect(history.location.pathname).toBe(`/lists/${TEST_LIST_ID}`);
      },
      { timeout: 4000 },
    );

    const finalTasks = getMockTasks();
    const created = finalTasks.find((t) => t.title === "Buy groceries");
    expect(created).toBeDefined();
    expect(created!.description).toBe("Milk, eggs, bread, and some fruit");
    expect(created!.id).not.toMatch(/^temp-/);
  });

  it("resets form after successful creation (title and description cleared)", async () => {
    await renderNewTaskPage();

    const titleInput = screen.getByPlaceholderText("Enter task title...");
    const descInput = screen.getByPlaceholderText(/Add any notes/i);

    await user.type(titleInput, "Quick task");
    await user.type(descInput, "Remember to test this");

    fireEvent.click(screen.getByRole("button", { name: /^Create Task$/ }));

    await waitFor(
      () => {
        expect(titleInput).toHaveValue("");
        expect(descInput).toHaveValue("");
      },
      { timeout: 2000 },
    );
  });

  it.skip("does not create task when title is empty (prevents mutation)", async () => {
    await renderNewTaskPage();

    resetMockTasks(); // extra safety

    const initialLength = getMockTasks().length;
    expect(initialLength, "Mock tasks not reset properly").toBe(2);

    const titleInput = screen.getByPlaceholderText("Enter task title...");
    await user.clear(titleInput); // force title empty

    const descInput = screen.getByPlaceholderText(/Add any notes/i);
    await user.type(descInput, "This should not be saved");

    const createButton = screen.getByRole("button", { name: "Create Task" });
    await waitFor(() => {
      expect(createButton).toBeDisabled();
    });

    const form = screen.getByTestId("new-task-form");
    fireEvent.submit(form);

    await new Promise((r) => setTimeout(r, 1200));

    const finalLength = getMockTasks().length;
    expect(finalLength).toBe(initialLength);
    expect(finalLength).toBe(2);
  });
});
