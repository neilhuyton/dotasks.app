// __tests__/routes/_authenticated/lists/$listId/tasks/new.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from "@tanstack/react-router";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
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
import { type Task } from "@/types/task";

describe("New Task Page (/_authenticated/lists/$listId/tasks/new)", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

  const TEST_LIST_ID = "list-abc-123";

  let history: ReturnType<typeof createMemoryHistory>;

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

  beforeEach(() => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    server.resetHandlers();
    resetMockLists();
    resetMockTasks();
    prepareDetailPageTestList();

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);
    server.use(taskGetByListSuccess);
    server.use(taskCreateHandler);

    history = createMemoryHistory({
      initialEntries: [`/lists/${TEST_LIST_ID}/tasks/new`],
    });
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
  });

  afterAll(() => server.close());

  const renderNewTaskPage = async () => {
    const router = createRouter({ routeTree, history });
    const navigateSpy = vi.spyOn(router, "navigate");

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

    await screen.findByRole("heading", { name: /New Task/i });

    return { navigateSpy };
  };

  it("renders title, description input, and buttons", async () => {
    await renderNewTaskPage();

    expect(screen.getByRole("heading", { name: "New Task" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter task title...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add any notes, steps, links, or extra context.../i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Task" })).toBeInTheDocument();
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
    const { navigateSpy } = await renderNewTaskPage();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      }),
    );
  });

  it("navigates back to list on Back (ArrowLeft) button click", async () => {
    const { navigateSpy } = await renderNewTaskPage();

    await user.click(screen.getByRole("button", { name: "Back to list" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: TEST_LIST_ID },
        replace: true,
      }),
    );
  });

  it("creates task with title + description, optimistic update, and navigates on success", async () => {
    server.use(taskCreateHandler);

    const { navigateSpy } = await renderNewTaskPage();

    const titleInput = screen.getByPlaceholderText("Enter task title...");
    const descInput = screen.getByPlaceholderText(/Add any notes/i);

    await user.type(titleInput, "Buy groceries");
    await user.type(descInput, "Milk, eggs, bread, and some fruit");

    fireEvent.click(screen.getByRole("button", { name: /^Create Task$/ }));

    // Check optimistic update (title + description present)
    await waitFor(
      () => {
        const cachedTasks = queryClient.getQueryData<Task[]>([
          ["task", "getByList"],
          { input: { listId: TEST_LIST_ID }, type: "query" },
        ]);

        expect(cachedTasks).toBeDefined();
        expect(cachedTasks!.length).toBeGreaterThan(2); // original 2 + 1 optimistic

        const optimistic = cachedTasks!.find((t) => t.title === "Buy groceries");
        expect(optimistic).toBeDefined();
        expect(optimistic!.description).toBe("Milk, eggs, bread, and some fruit");
        expect(optimistic!.id).toMatch(/^temp-/);
      },
      { timeout: 1500 },
    );

    // Wait for success + navigation
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
      { timeout: 4000 },
    );

    // After success: real task exists (no temp- id), description preserved
    const finalTasks = getMockTasks(); // from your mock storage
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

    await waitFor(() => {
      expect(titleInput).toHaveValue("");
      expect(descInput).toHaveValue("");
    });
  });

  it("does not create task when title is empty (prevents mutation)", async () => {
    await renderNewTaskPage();

    const initialTasks = getMockTasks().length;

    const descInput = screen.getByPlaceholderText(/Add any notes/i);
    await user.type(descInput, "This should not be saved");

    const createButton = screen.getByRole("button", { name: "Create Task" });
    expect(createButton).toBeDisabled();

    // Try programmatic submit anyway (edge case)
    const form = screen.getByRole("form");
    fireEvent.submit(form);

    // No new task added
    await new Promise((r) => setTimeout(r, 800));
    expect(getMockTasks().length).toBe(initialTasks);
  });
});