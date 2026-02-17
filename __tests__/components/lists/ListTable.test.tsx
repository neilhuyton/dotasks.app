// __tests__/components/lists/ListsTable.test.tsx

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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import "@testing-library/jest-dom";

import ListsTable from "@/components/lists/ListsTable";
import { server } from "@/../__mocks__/server";
import {
  listGetAllHandler,
  listGetEmptyHandler,
  resetMockLists,
} from "@/../__mocks__/handlers/lists";

import { useAuthStore } from "@/store/authStore";
import { act } from "react";
import { suppressActWarnings } from "../../act-suppress";

suppressActWarnings();

// Mock the Link component from TanStack Router
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    Link: vi.fn(({ children, className, title, "aria-label": ariaLabel, ...props }) => (
      <a
        data-testid="mocked-link"
        className={className}
        data-to={props.to}
        data-params={JSON.stringify(props.params || {})}
        data-search={JSON.stringify(props.search || {})}
        title={title}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </a>
    )),
  };
});

describe("ListsTable", () => {
  let queryClient: QueryClient;

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          retryDelay: 0,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

  const setup = async (overrideHandler = listGetAllHandler) => {
    queryClient = createTestQueryClient();

    server.use(overrideHandler);

    useAuthStore.setState({ userId: "test-user-id" });

    let renderResult;
    await act(async () => {
      renderResult = render(
        <trpc.Provider
          client={trpc.createClient({
            links: [httpLink({ url: "/trpc" })],
          })}
          queryClient={queryClient}
        >
          <QueryClientProvider client={queryClient}>
            <ListsTable />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });

    await waitFor(
      () => {
        const hasHeader = screen.queryByText("List Name") !== null;
        const hasEmpty = screen.queryByText("No lists yet") !== null;
        expect(hasHeader || hasEmpty).toBe(true);
      },
      { timeout: 8000 },
    );

    return { renderResult, queryClient };
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(() => {
    resetMockLists();
    server.resetHandlers();
    vi.clearAllMocks();
    useAuthStore.setState({ userId: "test-user-id" });
  });

  afterEach(async () => {
    if (queryClient) {
      await queryClient.cancelQueries();
      queryClient.clear();
    }
    server.resetHandlers();
    useAuthStore.setState({ userId: null });
  });

  afterAll(() => server.close());

  it("shows empty state UI when user has no lists", async () => {
    await setup(listGetEmptyHandler);

    await waitFor(
      () => {
        expect(screen.getByText("No lists yet")).toBeInTheDocument();
        expect(screen.getByText(/Create your first list/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText("List Name")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders table headers correctly", async () => {
    await setup();

    expect(screen.getByText("List Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();

    expect(screen.getByText("Description")).toHaveClass("hidden md:table-cell");
  });

  it("renders list rows with titles as links and correct descriptions when data is fetched", async () => {
    await setup();

    await waitFor(
      () => {
        expect(screen.getByText("Groceries")).toBeInTheDocument();
        expect(screen.getByText("Weekend shopping")).toBeInTheDocument();
        expect(screen.getByText("Work Tasks")).toBeInTheDocument();

        const noDescElements = screen.getAllByText("No description");
        expect(noDescElements.length).toBeGreaterThan(0);
        expect(noDescElements[0]).toHaveClass("text-gray-400 italic");
      },
      { timeout: 5000 },
    );

    const titleLinks = screen.getAllByTestId("mocked-link").filter(
      (link) => link.getAttribute("data-to") === "/lists/$listId"
    );

    expect(titleLinks.length).toBe(2);

    expect(titleLinks[0]).toHaveTextContent("Groceries");
    expect(titleLinks[0]).toHaveAttribute(
      "data-params",
      expect.stringContaining('"listId":"l1"')
    );
  });

  // ───────────────────────────────────────────────────────────────
  // NEW TEST: checks the delete link
  // ───────────────────────────────────────────────────────────────
  it("renders delete link for each list pointing to /lists/$listId/delete", async () => {
    await setup();

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
    });

    // Find all mocked links
    const allLinks = screen.getAllByTestId("mocked-link");

    // Filter to delete links (they point to "/lists/$listId/delete")
    const deleteLinks = allLinks.filter(
      (link) => link.getAttribute("data-to") === "/lists/$listId/delete"
    );

    expect(deleteLinks.length).toBe(2); // one per list

    // Check first delete link (Groceries / l1)
    expect(deleteLinks[0]).toHaveAttribute(
      "data-params",
      expect.stringContaining('"listId":"l1"')
    );
    expect(deleteLinks[0]).toHaveAttribute("title", 'Delete list');
    expect(deleteLinks[0]).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Delete list")
    );
    expect(deleteLinks[0].querySelector("svg")).toBeInTheDocument(); // has Trash2 icon

    // Optional: check classes for styling
    expect(deleteLinks[0]).toHaveClass("text-gray-400");
    expect(deleteLinks[0]).toHaveClass("hover:text-red-600");
    expect(deleteLinks[0]).toHaveClass("hover:bg-red-50");
  });
});