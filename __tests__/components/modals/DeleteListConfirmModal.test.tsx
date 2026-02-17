// __tests__/components/modals/DeleteListConfirmModal.test.tsx

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

import DeleteListConfirmModal from "@/components/modals/DeleteListConfirmModal";
import { server } from "@/../__mocks__/server";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../act-suppress";
import { useNavigate } from "@tanstack/react-router";
import { TRPCError } from "@trpc/server";

import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { deleteListResolver } from "../../../__mocks__/handlers/lists";

suppressActWarnings();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe("DeleteListConfirmModal", () => {
  let queryClient: QueryClient;

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const setup = async (listId = "l1", listTitle?: string) => {
    queryClient = createTestQueryClient();
    useAuthStore.setState({ userId: "test-user-id" });

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <DeleteListConfirmModal
            isOpen={true}
            listId={listId}
            listTitle={listTitle}
          />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    // Wait for dialog title (using role + flexible name matcher)
    await waitFor(
      () => {
        expect(
          screen.getByRole("heading", { name: /Delete List/i }),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });
  });

  beforeEach(() => {
    if (queryClient) queryClient.clear();
    vi.clearAllMocks();
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.setState({ userId: null });
    if (queryClient) queryClient.clear();
  });

  afterAll(() => {
    server.close();
  });

  it("renders title, description, and buttons when open", async () => {
    await setup();
    expect(screen.getByText("Delete List?")).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Delete List/i }),
    ).toBeInTheDocument();
  });

  it("shows loading state and disables button during deletion", async () => {
    // Use a simple delayed success handler for this test
server.use(
  trpcMsw.list.delete.mutation(async (ctx) => {
    await new Promise((r) => setTimeout(r, 400));
    return deleteListResolver(ctx);
  }),
);

    await setup("l1");

    const deleteButton = screen.getByRole("button", { name: /Delete List/i });
    const form = screen.getByTestId("delete-list-form");

    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(deleteButton).toHaveTextContent("Deleting...");
        expect(deleteButton).toBeDisabled();
      },
      { timeout: 5000 },
    );
  });

  it("navigates to /lists on successful deletion", async () => {
    // ───────────────────────────────────────────────────────────────
    // Fresh, local mock data — completely isolated from other tests
    // ───────────────────────────────────────────────────────────────
    let localMockLists = [
      {
        id: "l1",
        userId: "test-user-id",
        title: "Groceries",
        description: "Weekend shopping",
        color: "#FF6B6B",
        icon: "shopping-cart",
        isArchived: false,
        createdAt: new Date("2025-02-10T09:30:00Z"),
        updatedAt: new Date("2025-02-10T09:30:00Z"),
      },
      {
        id: "l2",
        userId: "test-user-id",
        title: "Work Tasks",
        description: null,
        color: null,
        icon: null,
        isArchived: false,
        createdAt: new Date("2025-02-12T14:15:00Z"),
        updatedAt: new Date("2025-02-12T14:15:00Z"),
      },
    ];

    // ───────────────────────────────────────────────────────────────
    // Test-specific MSW handlers — override everything needed
    // ───────────────────────────────────────────────────────────────
    server.use(
      trpcMsw.list.getAll.query(() => {
        return localMockLists.map((list) => ({
          id: list.id,
          userId: list.userId,
          title: list.title,
          description: list.description,
          color: list.color,
          icon: list.icon,
          isArchived: list.isArchived,
          createdAt: list.createdAt.toISOString(),
          updatedAt: list.updatedAt.toISOString(),
        }));
      }),

      trpcMsw.list.delete.mutation(async ({ input }) => {
        await new Promise((resolve) => setTimeout(resolve, 400)); // network-like delay

        const { id } = input;
        const initialLength = localMockLists.length;
        const deletedList = localMockLists.find((l) => l.id === id);

        localMockLists = localMockLists.filter((l) => l.id !== id);

        if (localMockLists.length === initialLength || !deletedList) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "List not found",
          });
        }

        return {
          id: deletedList.id,
          userId: deletedList.userId,
          title: deletedList.title,
          description: deletedList.description,
          color: deletedList.color,
          icon: deletedList.icon,
          isArchived: deletedList.isArchived,
          createdAt: deletedList.createdAt.toISOString(),
          updatedAt: deletedList.updatedAt.toISOString(),
        };
      }),
    );

    // Mock navigation
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockImplementation(() => mockNavigate);

    // Render
    await setup("l1", "Groceries"); // pass title too so we can assert on it if needed

    // Submit deletion
    const form = screen.getByTestId("delete-list-form");
    fireEvent.submit(form);

    // Wait for onSuccess → navigate call
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "/lists",
            replace: true,
          }),
        );
      },
      { timeout: 5000 },
    );

    // Bonus assertion: optimistic update worked (list removed from cache)
    await waitFor(() => {
      expect(localMockLists).toHaveLength(1);
      expect(localMockLists.some((l) => l.id === "l1")).toBe(false);
    });
  });

  it("navigates to /lists on Cancel or Close click", async () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockImplementation(() => mockNavigate);

    await setup();

    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true }),
    );

    mockNavigate.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true }),
    );
  });

  it("handles deletion failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    server.use(
      trpcMsw.list.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete list",
        });
      }),
    );

    await setup("l1");

    const deleteButton = screen.getByRole("button", { name: /Delete List/i });
    const form = screen.getByTestId("delete-list-form");

    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(deleteButton).toHaveTextContent("Delete List");
        expect(deleteButton).not.toBeDisabled();
      },
      { timeout: 5000 },
    );

    consoleSpy.mockRestore();
  });

  it("does not render when isOpen is false", async () => {
    render(
      <trpc.Provider
        client={trpc.createClient({ links: [httpLink({ url: "/trpc" })] })}
        queryClient={new QueryClient()}
      >
        <QueryClientProvider client={new QueryClient()}>
          <DeleteListConfirmModal isOpen={false} listId="l1" />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    expect(screen.queryByText("Delete List?")).not.toBeInTheDocument();
  });
});
