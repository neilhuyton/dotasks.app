// __tests__/pages/WeightChartPage.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "../../src/trpc";
import { httpLink } from "@trpc/client";
import { server } from "../../__mocks__/server";
import "@testing-library/jest-dom";
import { TRPCError } from "@trpc/server";


import {
  weightGetWeightsHandler,
  weightGetCurrentGoalHandler,
} from "../../__mocks__/handlers/weight";
import { useAuthStore } from "../../src/store/authStore";
import { generateToken } from "../utils/token";
import { trpcMsw } from "../../__mocks__/trpcMsw";
import WeightChartPage from "@/pages/WeightChartPage";

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

  const renderPage = () =>
    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightChartPage />
        </QueryClientProvider>
      </trpc.Provider>
    );

  beforeEach(() => {
    // Reset MSW handlers to defaults
    server.use(weightGetWeightsHandler, weightGetCurrentGoalHandler);
    queryClient.clear();
    vi.clearAllMocks();
    useAuthStore.setState({
      isLoggedIn: true,
      userId: "test-user",
      accessToken: generateToken("test-user"),
      refreshToken: "valid",
    });
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

  it("renders page title and trend period selector", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Your Stats");
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Daily")).toBeInTheDocument();
    });
  });

  // it("displays error message when weights fetch fails", async () => {
  //   server.use(
  //     weightGetCurrentGoalHandler,
  //     trpcMsw.weight.getWeights.query(() => {
  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: "Failed to fetch weights",
  //       });
  //     })
  //   );

  //   renderPage();

  //   await waitFor(() => {
  //     expect(screen.getByText(/Failed to load weight data|Failed to fetch weights/i)).toBeInTheDocument();
  //   });
  // });

  // it("displays 'No weight measurements recorded yet' when weights are empty", async () => {
  //   server.use(
  //     weightGetCurrentGoalHandler,
  //     trpcMsw.weight.getWeights.query(() => [])
  //   );

  //   renderPage();

  //   await waitFor(() => {
  //     expect(screen.getByText("No weight measurements recorded yet")).toBeInTheDocument();
  //   });
  // });

  it("changes trend period when selecting a different option", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox"));

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Weekly" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("option", { name: "Weekly" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Weekly");
      expect(screen.getByText(/weekly view/i)).toBeInTheDocument();
    });
  });

  // it("shows goal weight card when goal exists", async () => {
  //   renderPage();

  //   await waitFor(() => {
  //     expect(screen.getByText("Goal Weight")).toBeInTheDocument();
  //     expect(screen.getByText(/65 kg/)).toBeInTheDocument();
  //   });
  // });

  // it("hides goal weight card when no goal exists", async () => {
  //   server.use(
  //     weightGetWeightsHandler,
  //     trpcMsw.weight.getCurrentGoal.query(() => null)
  //   );

  //   renderPage();

  //   await waitFor(() => {
  //     expect(screen.queryByText("Goal Weight")).not.toBeInTheDocument();
  //     // Chart should still be visible if weights exist
  //     expect(screen.getByText("Weight Trend")).toBeInTheDocument();
  //   });
  // });
});