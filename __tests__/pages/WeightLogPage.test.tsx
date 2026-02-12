// __tests__/pages/WeightLogPage.test.tsx

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/trpc"; // adjust path if needed
import { httpLink } from "@trpc/client";
import WeightLogPage from "@/pages/WeightLogPage";

// Mock the child components so we only test composition + layout here
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

  it("renders the page title correctly", () => {
    renderWeightLogPage();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Your Weight");
    expect(heading).toHaveClass("text-2xl font-bold text-foreground text-center");
  });

  it("renders WeightForm and WeightList components", () => {
    renderWeightLogPage();

    const formEl = screen.getByTestId("weight-form");
    expect(formEl).toBeInTheDocument();
    expect(formEl).toHaveTextContent("Mock Weight Form");

    const listEl = screen.getByTestId("weight-list");
    expect(listEl).toBeInTheDocument();
    expect(listEl).toHaveTextContent("Mock Weight List");
  });

  it("applies correct container classes", () => {
    renderWeightLogPage();

    const container = screen.getByText("Your Weight").closest("div");
    expect(container).toHaveClass("mx-auto max-w-4xl space-y-6 px-4 py-6");
  });
});