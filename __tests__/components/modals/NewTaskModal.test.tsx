// __tests__/components/modals/NewTaskModal.test.tsx

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
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import "@testing-library/jest-dom";

import NewTaskModal from "@/components/modals/NewTaskModal";
import { server } from "@/../__mocks__/server";
import {
  resetMockTasks,
  taskGetByListHandler,
  taskCreateHandler,
  getMockTasks,
} from "../../../__mocks__/handlers/tasks";
import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";

// Shared mock navigate
const mockedNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockedNavigate,
  useParams: () => ({ listId: "test-list-id" }),
}));

const LIST_ID = "test-list-id";

describe("NewTaskModal", () => {
  let queryClient: QueryClient;

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const setup = async (isOpen = true) => {
    queryClient = createTestQueryClient();

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <NewTaskModal isOpen={isOpen} listId={LIST_ID} />
        </QueryClientProvider>
      </trpc.Provider>
    );

    if (isOpen) {
      await waitFor(() => {
        expect(screen.getByText("New Task")).toBeInTheDocument();
      });
    }
  };

  beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
  beforeEach(() => {
    resetMockTasks();
    mockedNavigate.mockClear();
    queryClient?.clear();
    vi.clearAllMocks();
    server.resetHandlers();
  });
  afterEach(() => {
    server.resetHandlers();
    queryClient?.clear();
  });
  afterAll(() => server.close());

  it("renders title, input, and buttons when open", async () => {
    server.use(taskGetByListHandler);
    await setup();
    expect(screen.getByText("New Task")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter task title...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Task/i })).toBeInTheDocument();
  });

  it("does not render when isOpen is false", async () => {
    await setup(false);
    expect(screen.queryByText("New Task")).not.toBeInTheDocument();
  });

  it("disables Create Task button when title is empty", async () => {
    server.use(taskGetByListHandler);
    await setup();
    expect(screen.getByRole("button", { name: /Create Task/i })).toBeDisabled();

    const input = screen.getByPlaceholderText("Enter task title...");
    await userEvent.type(input, "   ");
    expect(screen.getByRole("button", { name: /Create Task/i })).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, "Valid task");
    expect(screen.getByRole("button", { name: /Create Task/i })).not.toBeDisabled();
  });

  it("shows loading state during task creation", async () => {
    server.use(
      taskGetByListHandler,
      trpcMsw.task.create.mutation(async ({ input }) => {
        await new Promise((r) => setTimeout(r, 800));
        return {
          id: "new-task-1",
          title: input.title,
          description: null,
          listId: LIST_ID,
          dueDate: null,
          priority: null,
          order: 999,
          isCompleted: false,
          isCurrent: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    await setup();

    const input = screen.getByPlaceholderText("Enter task title...");
    await userEvent.clear(input);
    await userEvent.type(input, "Test loading");

    // Force submit with fireEvent
    const form = screen.getByTestId("new-task-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Creating.../i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it("creates task, applies optimistic update, navigates on success", async () => {
    server.use(taskGetByListHandler, taskCreateHandler);

    const initialLength = getMockTasks().length;

    await setup();

    const input = screen.getByPlaceholderText("Enter task title...");
    await userEvent.clear(input);
    await userEvent.type(input, "Buy eggs");

    // Force submit
    const form = screen.getByTestId("new-task-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(mockedNavigate).toHaveBeenCalledTimes(1);
        expect(mockedNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "/lists/$listId",
            params: { listId: LIST_ID },
            replace: true,
          })
        );
      },
      { timeout: 5000 }
    );

    await waitFor(
      () => {
        const tasks = getMockTasks();
        expect(tasks.length).toBeGreaterThan(initialLength);
        expect(tasks.some((t) => t.title === "Buy eggs")).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it("rolls back optimistic update on error", async () => {
    server.use(
      taskGetByListHandler,
      trpcMsw.task.create.mutation(() => {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom" });
      })
    );

    const initialLength = getMockTasks().length;

    await setup();

    const input = screen.getByPlaceholderText("Enter task title...");
    await userEvent.clear(input);
    await userEvent.type(input, "Fail task");

    const form = screen.getByTestId("new-task-form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(getMockTasks()).toHaveLength(initialLength);
    }, { timeout: 3000 });
  });

  it("navigates back on Cancel click", async () => {
    server.use(taskGetByListHandler);
    await setup();
    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockedNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: LIST_ID },
        replace: true,
      })
    );
  });

  it("navigates back on Close (X) click", async () => {
    server.use(taskGetByListHandler);
    await setup();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockedNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists/$listId",
        params: { listId: LIST_ID },
        replace: true,
      })
    );
  });

  it("does not submit when title is empty", async () => {
    server.use(taskGetByListHandler);

    const initialLength = getMockTasks().length;

    await setup();

    const form = screen.getByTestId("new-task-form");
    fireEvent.submit(form);

    await new Promise((r) => setTimeout(r, 300));

    expect(getMockTasks()).toHaveLength(initialLength);
    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});