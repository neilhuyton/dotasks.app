// __tests__/routes/_authenticated/lists/index.test.tsx

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "../../../utils/test-helpers";
import { server } from "../../../../__mocks__/server";
import {
  listGetAllHandler,
  resetMockLists,
} from "../../../../__mocks__/handlers/lists";
import { useAuthStore } from "@/shared/store/authStore";
import { trpcMsw } from "../../../../__mocks__/trpcMsw";

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
    server.use(trpcMsw.list.getAll.query(() => []));

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
    server.use(
      trpcMsw.list.getAll.query(() => {
        throw new Error("Failed to fetch lists");
      }),
    );

    renderListsPage();

    await waitFor(() => {
      expect(screen.getByText("Failed to load your lists")).toBeInTheDocument();
    });

    // Flexible matcher for the trpc client error message
    await waitFor(() => {
      expect(
        screen.getByText(/Unable to transform response from server|Failed to fetch/i),
      ).toBeInTheDocument();
    });
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