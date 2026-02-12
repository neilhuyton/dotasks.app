// __tests__/pages/WeightLogPage.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/trpc"; // adjust path if necessary
import { httpLink } from "@trpc/client";
import WeightLogPage from "@/pages/WeightLogPage";
import * as useLatestWeightHook from "@/hooks/useLatestWeight";

// Mock child components
vi.mock("@/components/WeightForm", () => ({
  default: () => <div data-testid="weight-form">Mock Weight Form</div>,
}));

vi.mock("@/components/WeightList", () => ({
  default: () => <div data-testid="weight-list">Mock Weight List</div>,
}));

describe("WeightLogPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [
      httpLink({
        url: "/trpc",
      }),
    ],
  });

  const renderWeightLogPage = () =>
    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightLogPage />
        </QueryClientProvider>
      </trpc.Provider>
    );

  // Helper to create consistent mock values matching the full hook return type
  const createLatestWeightMock = (
    overrides: Partial<ReturnType<typeof useLatestWeightHook.useLatestWeight>> = {}
  ) => ({
    latestWeight: null,
    isFromCache: false,
    isServerLoaded: true,
    isLoading: false,
    isFetching: false,
    error: null,
    ...overrides,
  });

  beforeEach(() => {
    // Default: no latest weight
    vi.spyOn(useLatestWeightHook, "useLatestWeight").mockReturnValue(
      createLatestWeightMock()
    );
  });

  it("renders the page title correctly", () => {
    renderWeightLogPage();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Weight Tracker");
    expect(heading).toHaveClass("text-3xl font-bold tracking-tight text-center");
  });

  it("renders the current weight card with correct structure and accessibility", () => {
    renderWeightLogPage();

    const card = screen.getByRole("button", {
      name: /record or update your current weight/i,
    });
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("rounded-xl border bg-card/60 backdrop-blur-sm p-6");
    expect(card).toHaveClass("cursor-pointer");

    expect(screen.getByText("Current Weight")).toBeInTheDocument();

    // Empty state when no weight
    expect(screen.getByText("No weight recorded yet")).toBeInTheDocument();
    expect(
      screen.getByText("Tap anywhere here to add your current weight")
    ).toBeInTheDocument();
  });

  it("renders the 'View History' button", () => {
    renderWeightLogPage();

    const viewHistoryBtn = screen.getByRole("button", { name: "View History" });
    expect(viewHistoryBtn).toBeInTheDocument();
    expect(viewHistoryBtn).toHaveClass("min-w-[220px]");
  });

  it("does not render WeightForm or WeightList directly on initial load", () => {
    renderWeightLogPage();

    expect(screen.queryByTestId("weight-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("weight-list")).not.toBeInTheDocument();
  });

  it("opens entry modal when current weight card is clicked", async () => {
    const user = userEvent.setup();
    renderWeightLogPage();

    const card = screen.getByRole("button", {
      name: /record or update your current weight/i,
    });

    await user.click(card);

    expect(
      await screen.findByRole("heading", { name: "Record Weight" })
    ).toBeInTheDocument();

    expect(screen.getByTestId("weight-form")).toBeInTheDocument();
  });

  it("shows weight value and date when latestWeight exists", () => {
    vi.spyOn(useLatestWeightHook, "useLatestWeight").mockReturnValue(
      createLatestWeightMock({
        latestWeight: {
          weightKg: 78.5,
          createdAt: "2025-02-10T08:30:00.000Z",
          source: "server",
        },
        isFromCache: false,
        isServerLoaded: true,
        isLoading: false,
        isFetching: false,
        error: null,
      })
    );

    renderWeightLogPage();

    expect(screen.getByText("78.5")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
    expect(screen.getByText(/synced$/)).toBeInTheDocument(); // adjust regex if needed
  });

  it("changes modal title to 'Update Weight' when there is existing weight", async () => {
    const user = userEvent.setup();

    vi.spyOn(useLatestWeightHook, "useLatestWeight").mockReturnValue(
      createLatestWeightMock({
        latestWeight: {
          weightKg: 78.5,
          createdAt: "2025-02-10T08:30:00.000Z",
          source: "server",
        },
        isFromCache: false,
        isServerLoaded: true,
        isLoading: false,
        isFetching: false,
        error: null,
      })
    );

    renderWeightLogPage();

    const card = screen.getByRole("button", {
      name: /record or update your current weight/i,
    });

    await user.click(card);

    expect(
      await screen.findByRole("heading", { name: "Update Weight" })
    ).toBeInTheDocument();
  });
});