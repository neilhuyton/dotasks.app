// __tests__/components/modals/DeleteTaskConfirmModal.test.tsx

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
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import "@testing-library/jest-dom";

import DeleteTaskConfirmModal from "@/components/modals/DeleteTaskConfirmModal";
import { server } from "@/../__mocks__/server";
import {
  resetMockTasks,
  taskGetByListSuccess,
  delayedTaskDeleteHandler,
  getMockTasks,
} from "../../../__mocks__/handlers/tasks";
import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../../../__mocks__/trpcMsw";

// Declare at top level (so vi.mock can reference it)
const mockedNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockedNavigate,
  useParams: () => ({ listId: "test-list-id" }),
}));

describe("DeleteTaskConfirmModal", () => {
  let queryClient: QueryClient;

  const DEFAULT_TASK_ID = "t-real-1"; // Exists in mockTasks

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const setup = async (taskId = DEFAULT_TASK_ID, isOpen = true) => {
    queryClient = createTestQueryClient();

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <DeleteTaskConfirmModal isOpen={isOpen} taskId={taskId} />
        </QueryClientProvider>
      </trpc.Provider>
    );

    if (isOpen) {
      await waitFor(
        () => {
          expect(screen.queryByText("Delete Task?", { exact: false })).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    }
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });
  });

  beforeEach(() => {
    resetMockTasks();
    mockedNavigate.mockReset();
    mockedNavigate.mockClear();
    if (queryClient) queryClient.clear();
    vi.clearAllMocks();
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
    if (queryClient) queryClient.clear();
  });

  afterAll(() => {
    server.close();
  });

  it("renders title, description, and buttons when open", async () => {
    server.use(taskGetByListSuccess);

    await setup();

    expect(screen.getByText("Delete Task?", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete Task/i })).toBeInTheDocument();
  });

  it("shows loading state and disables buttons during deletion", async () => {
    server.use(taskGetByListSuccess, delayedTaskDeleteHandler);

    await setup();

    const deleteButton = screen.getByRole("button", { name: /Delete Task/i });

    await userEvent.click(deleteButton);

    await waitFor(
      () => {
        expect(deleteButton).toHaveTextContent("Deleting...");
        expect(deleteButton).toBeDisabled();
        expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
      },
      { timeout: 5000 }
    );
  });

  it("navigates back to list detail on successful deletion", async () => {
    server.use(taskGetByListSuccess, delayedTaskDeleteHandler);

    await setup(DEFAULT_TASK_ID);

    // Confirm task exists in mock data before deletion attempt
    expect(getMockTasks().some((t) => t.id === DEFAULT_TASK_ID)).toBe(true);
    expect(getMockTasks()).toHaveLength(2); // initial state

    const deleteButton = screen.getByRole("button", { name: /Delete Task/i });
    await userEvent.click(deleteButton);

    await waitFor(
      () => {
        expect(mockedNavigate).toHaveBeenCalledTimes(1);
        expect(mockedNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "..",
            replace: true,
          })
        );
      },
      { timeout: 5000 }
    );

    // Verify task was removed (optimistic update + successful mutation)
    await waitFor(() => {
      expect(getMockTasks().some((t) => t.id === DEFAULT_TASK_ID)).toBe(false);
      expect(getMockTasks()).toHaveLength(1);
    });
  });

  it("navigates back to list detail on Cancel click", async () => {
    server.use(taskGetByListSuccess);

    await setup();

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });

    await userEvent.click(cancelButton);

    await waitFor(
      () => {
        expect(mockedNavigate).toHaveBeenCalledTimes(1);
        expect(mockedNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "..",
            replace: true,
          })
        );
      },
      { timeout: 3000 }
    );
  });

  it("navigates back to list detail on Close (X) click", async () => {
    server.use(taskGetByListSuccess);

    await setup();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(
      () => {
        expect(mockedNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "..",
            replace: true,
          })
        );
      },
      { timeout: 3000 }
    );
  });

  it("handles deletion failure gracefully (resets UI)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    server.use(
      taskGetByListSuccess,
      trpcMsw.task.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete task",
        });
      })
    );

    await setup();

    const deleteButton = screen.getByRole("button", { name: /Delete Task/i });

    await userEvent.click(deleteButton);

    await waitFor(
      () => {
        expect(deleteButton).toHaveTextContent("Delete Task");
        expect(deleteButton).not.toBeDisabled();
        expect(screen.getByRole("button", { name: /Cancel/i })).not.toBeDisabled();
      },
      { timeout: 5000 }
    );

    consoleSpy.mockRestore();
  });

  it("does not render when isOpen is false", async () => {
    server.use(taskGetByListSuccess);

    await setup(DEFAULT_TASK_ID, false);

    expect(screen.queryByText("Delete Task?", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render when taskId is empty", () => {
    render(
      <trpc.Provider
        client={trpc.createClient({ links: [httpLink({ url: "/trpc" })] })}
        queryClient={new QueryClient()}
      >
        <QueryClientProvider client={new QueryClient()}>
          <DeleteTaskConfirmModal isOpen={true} taskId="" />
        </QueryClientProvider>
      </trpc.Provider>
    );

    expect(screen.queryByText("Delete Task?", { exact: false })).not.toBeInTheDocument();
  });
});