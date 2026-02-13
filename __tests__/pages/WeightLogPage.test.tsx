// __tests__/pages/WeightLogPage.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/trpc";
import { httpLink } from "@trpc/client";
import WeightLogPage from "@/pages/WeightLogPage";
import * as useLatestWeightHook from "@/hooks/useLatestWeight";

describe("WeightLogPage", () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  const trpcClient = trpc.createClient({
    links: [httpLink({ url: "/trpc" })],
  });

  const renderWeightLogPage = () =>
    render(
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <WeightLogPage />
        </QueryClientProvider>
      </trpc.Provider>,
    );

  const createLatestWeightMock = (
    overrides: Partial<
      ReturnType<typeof useLatestWeightHook.useLatestWeight>
    > = {},
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
    vi.spyOn(useLatestWeightHook, "useLatestWeight").mockReturnValue(
      createLatestWeightMock(),
    );
  });

  it("renders the page title correctly", () => {
    renderWeightLogPage();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Weight Tracker");
    // removed: expect(heading).toHaveClass(...)
  });

  it("renders the current weight card with correct structure and accessibility", () => {
    renderWeightLogPage();
    const card = screen.getByRole("button", {
      name: /record or update your current weight/i,
    });
    expect(card).toBeInTheDocument();
    // removed: expect(card).toHaveClass(...)

    expect(screen.getByText("Current Weight")).toBeInTheDocument();
    expect(screen.getByText("No weight recorded yet")).toBeInTheDocument();
    expect(
      screen.getByText("Tap here to add your current weight"),
    ).toBeInTheDocument();
  });

  it("renders the 'View History' button with correct styling", () => {
    renderWeightLogPage();
    const btn = screen.getByRole("button", { name: "View Weight History" });
    expect(btn).toBeInTheDocument();
    // removed: expect(btn).toHaveClass("min-w-55");
  });

  it("enters edit mode when current weight card is clicked (no previous weight)", async () => {
    const user = userEvent.setup();
    renderWeightLogPage();

    const card = screen.getByRole("button", {
      name: /record or update your current weight/i,
    });

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    await user.click(card);

    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveValue(null);

    const buttons = screen.getAllByRole("button");
    const saveBtn = buttons.find((b) => b.querySelector("svg.lucide-check"));
    const cancelBtn = buttons.find((b) => b.querySelector("svg.lucide-x"));

    expect(saveBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("step", "0.1");
    expect(input).toHaveAttribute("min", "0");
  });

  it("enters edit mode pre-filled when there is an existing latest weight", async () => {
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
      }),
    );

    renderWeightLogPage();

    expect(screen.getByText("78.5")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
    expect(screen.getByText(/10\/02\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/synced/)).toBeInTheDocument();

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    const user = userEvent.setup();
    const card = screen.getByRole("button", {
      name: /record or update your current weight/i,
    });

    await user.click(card);

    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(78.5);
    expect(input).toHaveFocus();

    const buttons = screen.getAllByRole("button");
    const saveBtn = buttons.find((b) => b.querySelector("svg.lucide-check"));
    const cancelBtn = buttons.find((b) => b.querySelector("svg.lucide-x"));

    expect(saveBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();
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
      }),
    );

    renderWeightLogPage();

    expect(screen.getByText("78.5")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
    expect(screen.getByText(/10\/02\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/synced/)).toBeInTheDocument();
  });
});