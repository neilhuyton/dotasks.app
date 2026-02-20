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

// Mock TanStack Router components/hooks we use
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");

  return {
    ...actual,

    // Mock <Link> – used for the main list card navigation
    Link: vi.fn(({ children, className, title, "aria-label": ariaLabel, ...props }) => (
      <a
        data-testid="mocked-link"
        className={className}
        data-to={props.to}
        data-params={JSON.stringify(props.params || {})}
        title={title}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </a>
    )),

    // Mock useNavigate – prevents "useRouter must be used inside a <RouterProvider>" warnings
    useNavigate: vi.fn(() => vi.fn()), // returns a no-op navigate function
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
            links: [httpLink({ url: "http://localhost:8888/trpc" })],
          })}
          queryClient={queryClient}
        >
          <QueryClientProvider client={queryClient}>
            <ListsTable />
          </QueryClientProvider>
        </trpc.Provider>
      );
    });

    await waitFor(
      () => {
        const hasContent = screen.queryByText("Groceries") !== null;
        const hasEmpty = screen.queryByText("No lists yet.") !== null;
        expect(hasContent || hasEmpty).toBe(true);
      },
      { timeout: 5000 }
    );

    return { renderResult, queryClient };
  };

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

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

    await waitFor(() => {
      expect(screen.getByText("No lists yet.")).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.queryByTestId("mocked-link")).not.toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("renders list items as cards with titles, icons and action buttons", async () => {
    await setup();

    await waitFor(() => {
      expect(screen.getByText("Groceries")).toBeInTheDocument();
      expect(screen.getByText("Work Tasks")).toBeInTheDocument();
      expect(screen.getByText("shopping-cart")).toBeInTheDocument();

      // Check action buttons via title
      expect(screen.getAllByTitle("Edit")).toHaveLength(2);
      expect(screen.getAllByTitle("Delete")).toHaveLength(2);
    }, { timeout: 5000 });
  });

  it("main link for each list points to /lists/$listId", async () => {
    await setup();

    await waitFor(() => {
      const mainLinks = screen
        .getAllByTestId("mocked-link")
        .filter((el) => el.getAttribute("data-to") === "/lists/$listId");

      expect(mainLinks).toHaveLength(2);
      expect(mainLinks[0]).toHaveAttribute("data-params", expect.stringContaining('"listId":"l1"'));
      expect(mainLinks[0]).toHaveTextContent("Groceries");
    }, { timeout: 5000 });
  });

  it("edit and delete buttons are present with correct titles", async () => {
    await setup();

    await waitFor(() => {
      const editButtons = screen.getAllByTitle("Edit");
      const deleteButtons = screen.getAllByTitle("Delete");

      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);

      // Optional: check aria-label for accessibility
      expect(editButtons[0]).toHaveAttribute("aria-label", "Edit list: Groceries");
      expect(deleteButtons[0]).toHaveAttribute("aria-label", "Delete list: Groceries");
    }, { timeout: 5000 });
  });
});