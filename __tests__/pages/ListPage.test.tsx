// __tests__/components/lists/ListTable.test.tsx

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

import ListsPage from "@/pages/ListsPage";
import { server } from "@/../__mocks__/server";
import {
  listGetAllHandler,
  listGetEmptyHandler,
  resetMockLists,
} from "@/../__mocks__/handlers/lists";

import { useAuthStore } from "@/store/authStore";
import { act } from "react";
import { suppressActWarnings } from "../act-suppress";

suppressActWarnings();

// Mock the Link component from TanStack Router
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    Link: vi.fn(({ children, className, ...props }) => (
      <a
        data-testid="mocked-list-link"
        className={className}
        data-to={props.to}
        data-params={JSON.stringify(props.params || {})}
        {...props}
      >
        {children}
      </a>
    )),
  };
});

describe("ListsPage", () => {
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

    // Use only the passed handler (no spreading defaults)
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
            <ListsPage />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });

    // Give time for fetch
    // await new Promise((r) => setTimeout(r, 500));

    // Wait for render outcome (table or empty)
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

    const links = screen.getAllByTestId("mocked-list-link");
    expect(links.length).toBeGreaterThanOrEqual(2);

    expect(links[0]).toHaveTextContent("Groceries");
    expect(links[0]).toHaveAttribute("data-to", "/lists/$listId");
    expect(links[0]).toHaveAttribute(
      "data-params",
      expect.stringContaining('"listId":"l1"'),
    );
  });

  it("shows empty state UI when user has no lists", async () => {
    await setup(listGetEmptyHandler);

    await waitFor(
      () => {
        expect(screen.getByText("No lists yet")).toBeInTheDocument();
        expect(screen.getByText(/Create your first list/i)).toBeInTheDocument();
        // Optional: check the SVG or other elements if needed
      },
      { timeout: 5000 },
    );

    // Confirm table is NOT rendered
    expect(screen.queryByText("List Name")).not.toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("row")).not.toBeInTheDocument();
  });
});
