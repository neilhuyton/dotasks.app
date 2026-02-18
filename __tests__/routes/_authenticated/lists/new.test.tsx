// __tests__/routes/_authenticated/lists/new.test.tsx

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
import { server } from "../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { trpcMsw } from "../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

// Import reusable handlers
import {
  listCreateHandler,
  delayedListCreateHandler,
  resetMockLists,
  getMockLists,
  listGetAllHandler,
} from "../../../../__mocks__/handlers/lists";
import { suppressActWarnings } from "../../../act-suppress";

suppressActWarnings();

describe("Create New List Page (/_authenticated/lists/new)", () => {
  let queryClient: QueryClient;
  const user = userEvent.setup();

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

    // Always provide getAll (prevents unhandled request warnings)
    server.use(listGetAllHandler);

    // Default: fast create
    server.use(listCreateHandler);

    history = createMemoryHistory({ initialEntries: ["/lists/new"] });
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

  const renderNewListPage = async () => {
    const router = createRouter({ routeTree, history });
    const navigateSpy = vi.spyOn(router, "navigate");

    render(
      <trpc.Provider
        client={trpc.createClient({ links: [httpLink({ url: "/trpc" })] })}
        queryClient={queryClient}
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </trpc.Provider>,
    );

    await screen.findByText("Create New List");
    return { navigateSpy };
  };

  it("renders page title, description, inputs and buttons", async () => {
    await renderNewListPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Create New List",
    );
    expect(
      screen.getByText("Give your list a name and optional description"),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/List name/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Work, Groceries, Ideas..."),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/Description \(optional\)/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Cancel and return to lists" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create List/i }),
    ).toBeInTheDocument();
  });

  it("disables Create List button when title is empty or whitespace", async () => {
    await renderNewListPage();

    const createButton = screen.getByRole("button", { name: /Create List/i });
    expect(createButton).toBeDisabled();

    const titleInput = screen.getByLabelText(/List name/i);

    await user.type(titleInput, "   ");
    expect(createButton).toBeDisabled();

    await user.clear(titleInput);
    await user.type(titleInput, "Valid list name");
    expect(createButton).not.toBeDisabled();
  });

  it("shows loading state during list creation", async () => {
    server.use(delayedListCreateHandler); // ← uses the delayed mock handler

    await renderNewListPage();

    await user.type(screen.getByLabelText(/List name/i), "Weekend Plans");

    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    await screen.findByText("Creating...");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("creates list with optimistic update and navigates on success", async () => {
    const initialCount = getMockLists().length;
    const { navigateSpy } = await renderNewListPage();

    await user.type(screen.getByLabelText(/List name/i), "Travel Bucket List");
    await user.type(
      screen.getByLabelText(/Description/i),
      "Places I want to visit",
    );

    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.objectContaining({ to: "/lists", replace: true }),
        );
      },
      { timeout: 3000 },
    );

    expect(getMockLists().length).toBeGreaterThan(initialCount);
    expect(getMockLists().some((l) => l.title === "Travel Bucket List")).toBe(
      true,
    );
  });

  it("rolls back optimistic update on creation error", async () => {
    server.use(
      trpcMsw.list.create.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Creation failed",
        });
      }),
    );

    const initialCount = getMockLists().length;
    const { navigateSpy } = await renderNewListPage();

    await user.type(screen.getByLabelText(/List name/i), "Bad List");

    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(getMockLists()).toHaveLength(initialCount);
        expect(getMockLists().some((l) => l.title === "Bad List")).toBe(false);
      },
      { timeout: 3000 },
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("navigates back to /lists on Cancel button click", async () => {
    const { navigateSpy } = await renderNewListPage();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true }),
    );
  });

  it("navigates back to /lists on Close (X) button click", async () => {
    const { navigateSpy } = await renderNewListPage();
    await user.click(
      screen.getByRole("button", { name: "Cancel and return to lists" }),
    );
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/lists", replace: true }),
    );
  });

  it("does not submit when title is empty (prevents mutation)", async () => {
    const initialCount = getMockLists().length;
    const { navigateSpy } = await renderNewListPage();

    // Button must be disabled when title is empty
    expect(screen.getByRole("button", { name: /Create List/i })).toBeDisabled();

    // Simulate pressing Enter on the form (native submit attempt)
    const form = screen.getByTestId("create-list-form");
    fireEvent.submit(form);

    // Give enough time — optimistic update should NOT happen
    await waitFor(
      () => {
        expect(getMockLists()).toHaveLength(initialCount);
      },
      { timeout: 1500 },
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
