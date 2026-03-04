// __tests__/routes/_authenticated/lists/index.test.tsx

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../../utils/test-helpers";
import { server } from "../../../../__mocks__/server";
import {
  listGetAllHandler,
  listGetAllEmptyHandler,
  listGetAllErrorHandler,
  resetMockLists,
} from "../../../../__mocks__/handlers/lists";
import { trpcMsw } from "../../../../__mocks__/trpcMsw";
import { useAuthStore } from "@/shared/store/authStore";

describe("Lists Overview Page (/_authenticated/lists/)", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(async () => {
    server.resetHandlers();
    resetMockLists();

    // Prevent MSW warnings + sync failure logs
    server.use(
      trpcMsw.user.createOrSync.mutation(() => ({
        success: true,
        message: "User synced (mock)",
        user: { id: "test-user-123", email: "testuser@example.com" },
      })),
    );

    // Default successful lists response
    server.use(listGetAllHandler);

    // Run real auth flow (uses global Supabase mock)
    await useAuthStore.getState().initialize();
  });

  afterEach(async () => {
    server.resetHandlers();
    await useAuthStore.getState().signOut();
  });

  afterAll(() => {
    server.close();
  });

  function renderListsPage() {
    return renderWithProviders({ initialEntries: ["/lists"] });
  }

  it("shows empty state when no lists are returned", async () => {
    server.use(listGetAllEmptyHandler);

    renderListsPage();

    await waitFor(
      () => {
        expect(screen.getByText("Your Lists")).toBeInTheDocument();
        expect(
          screen.getByText("You don't have any lists yet."),
        ).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    const fab = screen.getByTestId("fab-add-list");
    expect(fab).toBeInTheDocument();
    expect(fab).toHaveTextContent(/create your first list/i);
    expect(fab).toHaveAttribute("href", "/lists/new");
  });

  it("renders list count, sortable table, and FAB when lists exist", async () => {
    renderListsPage();

    await waitFor(
      () => {
        expect(screen.getByText("Your Lists")).toBeInTheDocument();
        expect(screen.getByText("2 lists")).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Work Tasks")).toBeInTheDocument();

    const fab = screen.getByTestId("fab-add-list");
    expect(fab).toBeInTheDocument();
    expect(fab).toHaveTextContent(/create new list/i);
  });

  it("shows error message when getAll query fails", async () => {
    // Silence expected React Query / TRPC error logging
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    server.use(listGetAllErrorHandler);

    renderListsPage();

    await waitFor(
      () => {
        expect(
          screen.getByText("Failed to load your lists"),
        ).toBeInTheDocument();
        expect(screen.getByText("Failed to fetch lists")).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    consoleErrorSpy.mockRestore();
  });

  it("navigates to /lists/new when FAB is clicked", async () => {
    const { router } = renderListsPage();

    await waitFor(
      () => {
        expect(screen.getByTestId("fab-add-list")).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    await userEvent.click(screen.getByTestId("fab-add-list"));

    expect(router.state.location.pathname).toBe("/lists/new");
  });
});
