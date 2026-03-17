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
import { useAuthStore } from "@/store/authStore";
import { suppressActWarnings } from "../../../utils/act-suppress";

suppressActWarnings();

describe("Lists Overview Page (/_authenticated/lists/)", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "bypass" });
  });

  beforeEach(async () => {
    server.resetHandlers();
    resetMockLists();
    server.use(listGetAllHandler);
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

    const { router } = renderListsPage();

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

    expect(
      screen.getByText("Create your first list", { selector: ".sr-only" }),
    ).toBeInTheDocument();

    expect(fab.tagName.toLowerCase()).toBe("button");
    expect(fab).not.toHaveAttribute("href");

    await userEvent.click(fab);
    expect(router.state.location.pathname).toBe("/lists/new");
  });

  it("renders list count, sortable table, and FAB when lists exist", async () => {
    const { router } = renderListsPage();

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

    expect(
      screen.getByText("Create new list", { selector: ".sr-only" }),
    ).toBeInTheDocument();

    await userEvent.click(fab);
    expect(router.state.location.pathname).toBe("/lists/new");
  });

  it("shows error message when getAll query fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
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
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
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
