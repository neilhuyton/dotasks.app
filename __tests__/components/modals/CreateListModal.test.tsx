// __tests__/components/modals/CreateListModal.test.tsx

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

import CreateListModal from "@/components/modals/CreateListModal";
import { server } from "@/../__mocks__/server";
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../act-suppress";
import { useNavigate } from "@tanstack/react-router";
import { TRPCError } from "@trpc/server";

// Import your list handlers
import {
  listCreateHandler,
} from "@/../__mocks__/handlers/lists";
import { trpcMsw } from "../../../__mocks__/trpcMsw";

suppressActWarnings();

// Mock navigation globally
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe("CreateListModal", () => {
  let queryClient: QueryClient;

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const setup = async () => {
    queryClient = createTestQueryClient();
    useAuthStore.setState({ userId: "test-user-123" });

    render(
      <trpc.Provider
        client={trpc.createClient({
          links: [httpLink({ url: "/trpc" })],
        })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <CreateListModal />
        </QueryClientProvider>
      </trpc.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Create New List")).toBeInTheDocument();
    }, { timeout: 3000 });
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });
  });

  beforeEach(() => {
    if (queryClient) queryClient.clear();
    vi.clearAllMocks();
    useAuthStore.setState({ userId: "test-user-123" });
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

  it("renders title, input fields and buttons when open", async () => {
    await setup();
    expect(screen.getByText("Create New List")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Work, Groceries, Ideas...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create List/i })).toBeInTheDocument();
  });

  it("auto-focuses list name input", async () => {
    await setup();
    const input = screen.getByPlaceholderText("Work, Groceries, Ideas...");
    await waitFor(() => expect(input).toHaveFocus());
  });

  it("disables Create List button when title is empty", async () => {
    await setup();
    expect(screen.getByRole("button", { name: /Create List/i })).toBeDisabled();
  });

  it("enables Create List button after typing title", async () => {
    await setup();
    const input = screen.getByPlaceholderText("Work, Groceries, Ideas...");
    const button = screen.getByRole("button", { name: /Create List/i });
    await userEvent.type(input, "My List");
    expect(button).not.toBeDisabled();
  });

  it("shows loading state during mutation", async () => {
    // Force delay so isPending is visible long enough
    server.use(
      trpcMsw.list.create.mutation(async ({ input }) => {
        await new Promise(resolve => setTimeout(resolve, 400)); // 400ms delay

        // Return successful mock response
        return {
          id: `real-${crypto.randomUUID()}`,
          title: input.title,
          description: input.description ?? null,
          color: null,
          icon: null,
          userId: "test-user-123",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isArchived: false,
        };
      })
    );

    await setup();

    const titleInput = screen.getByPlaceholderText("Work, Groceries, Ideas...");
    await userEvent.type(titleInput, "Test List");

    const form = screen.getByTestId("create-list-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    // Wait for loading text to appear
    await waitFor(() => {
      expect(screen.getByText("Creating...")).toBeInTheDocument();
    }, { timeout: 5000 });

    // Optional: also check disabled state
    const button = screen.getByRole("button", { name: /Creating.../i });
    expect(button).toBeDisabled();
  });

  it("navigates to /lists on successful creation", async () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockImplementation(() => mockNavigate);

    server.use(listCreateHandler);

    await setup();

    await userEvent.type(
      screen.getByPlaceholderText("Work, Groceries, Ideas..."),
      "Groceries"
    );

    const form = screen.getByTestId("create-list-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "/lists",
          replace: true,
        })
      );
    }, { timeout: 5000 });
  });

  it("navigates to /lists on Cancel or Close click", async () => {
    const mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockImplementation(() => mockNavigate);

    await setup();

    await userEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true })
    );

    mockNavigate.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true })
    );
  });

  it("handles creation failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    server.use(
      trpcMsw.list.create.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create list",
        });
      })
    );

    await setup();

    await userEvent.type(
      screen.getByPlaceholderText("Work, Groceries, Ideas..."),
      "Fail"
    );

    const form = screen.getByTestId("create-list-form");
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );

    await waitFor(() => {
      expect(screen.getByText("Create List")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create List/i })).not.toBeDisabled();
    }, { timeout: 5000 });

    consoleSpy.mockRestore();
  });
});