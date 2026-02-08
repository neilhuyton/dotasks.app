// __tests__/GoalList.test.tsx
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../src/trpc";
import { server } from "../__mocks__/server";
import "@testing-library/jest-dom";

import GoalList from "../src/components/GoalList";
import { weightGetGoalsHandler } from "../__mocks__/handlers/weight"; // adjust path if needed
import { useAuthStore } from "../src/store/authStore";
import { generateToken } from "./utils/token";
import { trpcMsw } from "../__mocks__/trpcMsw";
import { TRPCError } from "@trpc/server";

// Mock lucide-react icons (used for loading)
vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loading-spinner" />,
}));

describe("GoalList", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const renderGoalList = async (userId = "test-user-id") => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      token: generateToken(userId),
      refreshToken: "valid-refresh-token",
    });

    await act(async () => {
      render(
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <GoalList />
          </QueryClientProvider>
        </trpc.Provider>,
      );
    });
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(weightGetGoalsHandler);
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      token: null,
      refreshToken: null,
    });
  });

  afterAll(() => {
    server.close();
  });

  it("renders loading state while fetching goals", async () => {
    await renderGoalList();

    expect(screen.getByTestId("goal-list-loading")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("goal-list-loading"),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("table")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("displays goals in a table when data is available", async () => {
    await renderGoalList();

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("goal-list-loading"),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: /past weight goals/i }),
        ).toBeInTheDocument();
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(
          screen.getByText("A list of your past weight goals."),
        ).toBeInTheDocument();

        // Headers
        expect(screen.getByText("Goal Weight (kg)")).toBeInTheDocument();
        expect(screen.getByText("Set Date")).toBeInTheDocument();
        expect(screen.getByText("Reached Date")).toBeInTheDocument();

        // Sample data
        expect(screen.getByText("65.0")).toBeInTheDocument();
        expect(screen.getByText("70.0")).toBeInTheDocument();
        expect(screen.getByText("Not Reached")).toBeInTheDocument();
        expect(screen.getByText("28/08/2025")).toBeInTheDocument();
        expect(screen.getAllByText("27/08/2025")).toHaveLength(2);

        expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Optional: style assertions (if important for your component)
    const tableHeaders = screen.getAllByRole("columnheader");
    expect(tableHeaders[0]).toHaveClass("font-bold bg-muted/50");
    expect(tableHeaders[1]).toHaveClass("font-bold bg-muted/50");
    expect(tableHeaders[2]).toHaveClass("font-bold bg-muted/50");

    const tableRows = screen.getAllByRole("row");
    expect(tableRows[0]).toHaveClass("hover:bg-muted/50 rounded-t-lg");
    // Last data row (adjust index if header + empty state considered)
    expect(tableRows[tableRows.length - 1]).toHaveClass(
      "hover:bg-muted/50 rounded-b-lg",
    );
  });

  it("displays 'No weight goals found' when goals array is empty", async () => {
    // Force empty response for this test only
    server.use(trpcMsw.weight.getGoals.query(() => []));

    await renderGoalList("empty-user-id");

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("goal-list-loading"),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: /past weight goals/i }),
        ).toBeInTheDocument();
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(
          screen.getByText("A list of your past weight goals."),
        ).toBeInTheDocument();
        expect(screen.getByText("No weight goals found")).toBeInTheDocument();
        expect(screen.getByRole("cell")).toHaveAttribute("colSpan", "3");
        expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("displays error message when fetch fails", async () => {
    // Force error response for this test only
    server.use(
      trpcMsw.weight.getGoals.query(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch goals",
        });
      }),
    );

    await renderGoalList("error-user-id");

    await waitFor(
      () => {
        expect(
          screen.queryByTestId("goal-list-loading"),
        ).not.toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: /past weight goals/i }),
        ).toBeInTheDocument();
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Error: Failed to fetch goals",
        );
        expect(screen.getByTestId("error-message")).toHaveClass(
          "text-destructive",
        );
      },
      { timeout: 2000 },
    );
  });
});
