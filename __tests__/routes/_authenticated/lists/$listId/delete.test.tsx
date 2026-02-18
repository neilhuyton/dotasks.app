// __tests__/routes/_authenticated/lists/$listId/delete.test.tsx

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
import { server } from "../../../../../__mocks__/server";
import { routeTree } from "@/routeTree.gen";
import { useAuthStore } from "@/store/authStore";
import { trpcMsw } from "../../../../../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

// Reusable list handlers
import {
  resetMockLists,
  listGetOneSuccessHandler,
  listDeleteHandler,
  delayedListDeleteHandler,
  getMockLists,
  listGetAllHandler,
  prepareDetailPageTestList,
} from "../../../../../__mocks__/handlers/lists";
import { suppressActWarnings } from "../../../../act-suppress";

suppressActWarnings();

describe("Delete List Confirmation Page (/_authenticated/lists/$listId/delete)", () => {
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
    prepareDetailPageTestList(); // Ensures the list with id "list-abc-123" exists

    server.use(listGetAllHandler);
    server.use(listGetOneSuccessHandler);
    server.use(listDeleteHandler);

    history = createMemoryHistory({
      initialEntries: [`/lists/${TEST_LIST_ID}/delete`],
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

  const renderDeletePage = async () => {
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

    await screen.findByRole("heading", { name: /Delete List/i });

    return { navigateSpy };
  };

  it("renders confirmation message, list title, and buttons", async () => {
    await renderDeletePage();

    expect(
      screen.getByRole("heading", {
        name: /Delete List "My Important Projects"/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "This action cannot be undone. Tasks in this list will no longer be associated with any list."
      )
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete List" })).toBeInTheDocument();
  });

  it("shows loading state during deletion", async () => {
    server.use(delayedListDeleteHandler);

    await renderDeletePage();

    // Use fireEvent to submit the form
    fireEvent.submit(screen.getByRole("form"));

    await screen.findByText("Deleting...");

    const deleteButton = screen.getByRole("button", { name: "Deleting..." });
    expect(deleteButton).toBeDisabled();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("deletes list with optimistic update and navigates on success", async () => {
    const initialCount = getMockLists().length;
    const { navigateSpy } = await renderDeletePage();

    fireEvent.submit(screen.getByRole("form"));

    await waitFor(
      () => {
        expect(navigateSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            to: "/lists",
            replace: true,
          })
        );
      },
      { timeout: 3000 }
    );

    expect(getMockLists().length).toBeLessThan(initialCount);
    expect(getMockLists().some((l) => l.id === TEST_LIST_ID)).toBe(false);
  });

  it("rolls back optimistic update on deletion error", async () => {
    server.use(
      trpcMsw.list.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Deletion failed",
        });
      })
    );

    const initialCount = getMockLists().length;
    const { navigateSpy } = await renderDeletePage();

    fireEvent.submit(screen.getByRole("form"));

    await waitFor(
      () => {
        expect(getMockLists()).toHaveLength(initialCount);
        expect(getMockLists().some((l) => l.id === TEST_LIST_ID)).toBe(true);
      },
      { timeout: 3000 }
    );

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("navigates back to /lists on Cancel button click", async () => {
    const { navigateSpy } = await renderDeletePage();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists",
        replace: true,
      })
    );
  });

  it("navigates back to /lists on Back (ArrowLeft) button click", async () => {
    const { navigateSpy } = await renderDeletePage();

    await user.click(screen.getByRole("button", { name: "Back to lists" }));

    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "/lists",
        replace: true,
      })
    );
  });
});