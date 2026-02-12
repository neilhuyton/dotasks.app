// __tests__/WeightChartPage.test.tsx

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink } from "@trpc/client";
import { trpc } from "../../src/trpc";
import { server } from "../../__mocks__/server";
import { TRPCError } from "@trpc/server";
import "@testing-library/jest-dom";

import WeightChartPage from "../../src/pages/WeightChartPage";
import {
  weightGetWeightsHandler,
  weightGetCurrentGoalHandler,
} from "../../__mocks__/handlers/weight";
import { useAuthStore } from "../../src/store/authStore";
import { generateToken } from "../utils/token";
import { trpcMsw } from "../../__mocks__/trpcMsw";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loading-spinner" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  ChevronUpIcon: () => <div data-testid="chevron-up-icon" />,
  CheckIcon: () => <div data-testid="check-icon" />,
}));

// Suppress Recharts layout warnings in JSDOM (harmless)
vi.spyOn(console, "warn").mockImplementation(() => {});

describe("WeightChartPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const renderWeightChart = async (userId = "test-user-id") => {
    useAuthStore.setState({
      isLoggedIn: true,
      userId,
      accessToken: generateToken(userId),
      refreshToken: "valid-refresh-token",
    });

    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightChartPage />
        </QueryClientProvider>
      </trpc.Provider>,
    );
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: "warn" });
  });

  beforeEach(() => {
    server.use(weightGetWeightsHandler, weightGetCurrentGoalHandler);
    queryClient.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    useAuthStore.setState({
      isLoggedIn: false,
      userId: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterAll(() => {
    server.close();
  });

  it("renders WeightChartPage with correct title and select dropdown", async () => {
    await renderWeightChart();

    await waitFor(
      () => {
        expect(screen.getByTestId("unit-select")).toHaveTextContent("Daily");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          "Your Stats",
        );
      },
      { timeout: 3000 },
    );
  });

  it("displays error message when fetch fails", async () => {
    server.use(
      trpcMsw.weight.getWeights.query(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch weights",
        });
      }),
      weightGetCurrentGoalHandler,
    );

    await renderWeightChart();

    await waitFor(
      () => {
        const errorEl = screen.getByTestId("error");
        expect(errorEl).toBeInTheDocument();
        expect(errorEl).toHaveTextContent("Error: Failed to fetch weights");
      },
      { timeout: 3000 },
    );
  });

  it("displays no measurements message when weights are empty", async () => {
    server.use(
      trpcMsw.weight.getWeights.query(() => []),
      weightGetCurrentGoalHandler,
    );

    await renderWeightChart();

    await waitFor(
      () => {
        expect(screen.getByTestId("no-data")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("updates chart data when trend period changes", async () => {
    const user = userEvent.setup();

    await renderWeightChart();

    await waitFor(
      () => {
        expect(screen.getByTestId("chart-mock")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const selectTrigger = screen.getByTestId("unit-select");
    await user.click(selectTrigger); // open the dropdown

    // Wait for and click the "Weekly" option (adjust text to match your <SelectItem> label exactly)
    const weeklyOption = await screen.findByText("Weekly"); // or 'weekly' / 'Week' / whatever your code uses
    await user.click(weeklyOption);

    await waitFor(
      () => {
        // Confirm the select value updated
        expect(screen.getByTestId("unit-select")).toHaveTextContent("Weekly");
        expect(screen.getByTestId("chart-mock")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("displays latest weight card when weights are available", async () => {
    await renderWeightChart();

    await waitFor(
      () => {
        expect(screen.getByTestId("latest-weight-card")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("does not display latest weight card when weights are empty", async () => {
    server.use(
      trpcMsw.weight.getWeights.query(() => []),
      weightGetCurrentGoalHandler,
    );

    await renderWeightChart();

    await waitFor(
      () => {
        expect(screen.getByTestId("no-data")).toBeInTheDocument();
        expect(
          screen.queryByTestId("latest-weight-card"),
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("displays goal weight card when goal is available", async () => {
    await renderWeightChart();

    await waitFor(
      () => {
        expect(screen.getByTestId("goal-weight-card")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("does not display goal weight card when no goal exists", async () => {
    server.use(
      weightGetWeightsHandler, // weights still present
      trpcMsw.weight.getCurrentGoal.query(() => null), // no goal
    );

    await renderWeightChart();

    await waitFor(
      () => {
        // Your component hides the goal card when goal is null
        expect(
          screen.queryByTestId("goal-weight-card"),
        ).not.toBeInTheDocument();

        // It does NOT show "no-data" just because goal is missing (only when weights empty)
        expect(screen.queryByTestId("no-data")).not.toBeInTheDocument();

        // Chart and latest weight remain visible
        expect(screen.getByTestId("chart-mock")).toBeInTheDocument();
        expect(screen.getByTestId("latest-weight-card")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
