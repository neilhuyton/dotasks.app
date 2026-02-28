// __tests__/routes/_authenticated/lists/index.test.tsx

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
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
import { useAuthStore } from "@/shared/store/authStore";

describe("Lists Overview Page (/_authenticated/lists/)", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

  beforeEach(() => {
    server.resetHandlers();
    resetMockLists();
    server.use(listGetAllHandler);

    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user-123",
      accessToken: "mock-token",
      refreshToken: "mock-refresh",
    });
  });

  afterEach(() => {
    server.resetHandlers();
    useAuthStore.getState().logout?.();
  });

  afterAll(() => server.close());

  function renderListsPage() {
    return renderWithProviders({ initialEntries: ["/lists"] });
  }

  it("shows empty state when no lists are returned", async () => {
    server.use(listGetAllEmptyHandler);

    renderListsPage();

    await waitFor(() => {
      expect(screen.getByText("Your Lists")).toBeInTheDocument();
      expect(
        screen.getByText("You don't have any lists yet."),
      ).toBeInTheDocument();
    });

    const fab = screen.getByTestId("fab-add-list");
    expect(fab).toBeInTheDocument();
    expect(fab).toHaveTextContent("Create your first list");
    expect(fab).toHaveAttribute("href", "/lists/new");
  });

  it("renders list count, sortable table, and FAB when lists exist", async () => {
    renderListsPage();

    await waitFor(() => {
      expect(screen.getByText("Your Lists")).toBeInTheDocument();
      expect(screen.getByText("2 lists")).toBeInTheDocument();
    });

    // Check mock lists are displayed
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Work Tasks")).toBeInTheDocument();

    // FAB
    const fab = screen.getByTestId("fab-add-list");
    expect(fab).toBeInTheDocument();
    expect(fab).toHaveTextContent("Create new list");
  });

  it("shows error message when getAll query fails", async () => {
    // Silence expected TRPCClientError logging from React Query → TanStack Router boundary
    // This keeps test output clean while still verifying the UI fallback renders correctly
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    server.use(listGetAllErrorHandler);

    renderListsPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load your lists")).toBeInTheDocument();
      
      expect(screen.getByText("Failed to fetch lists")).toBeInTheDocument();
    });

    // Cleanup
    consoleErrorSpy.mockRestore();
  });

  it("navigates to /lists/new when FAB is clicked", async () => {
    const { router } = renderListsPage();

    await waitFor(() => {
      expect(screen.getByTestId("fab-add-list")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("fab-add-list"));

    expect(router.state.location.pathname).toBe("/lists/new");
  });
});