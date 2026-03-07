// __tests__/app/components/GlobalFetchingIndicator.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { GlobalFetchingIndicator } from "@/app/components/GlobalIsFetchingIndicator";

vi.mock("@tanstack/react-query", () => ({
  useIsFetching: vi.fn(),
  useIsMutating: vi.fn(),
}));

describe("GlobalFetchingIndicator", () => {
  beforeEach(() => {
    vi.mocked(useIsFetching).mockReturnValue(0);
    vi.mocked(useIsMutating).mockReturnValue(0);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders nothing when no fetching or mutating", () => {
    render(<GlobalFetchingIndicator />);
    expect(
      screen.queryByTestId("global-fetching-spinner"),
    ).not.toBeInTheDocument();
  });

  it("shows spinner when at least one query is fetching", () => {
    vi.mocked(useIsFetching).mockReturnValue(1);
    vi.mocked(useIsMutating).mockReturnValue(0);

    render(<GlobalFetchingIndicator />);

    const spinner = screen.getByTestId("global-fetching-spinner");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin");
    expect(spinner).toHaveClass("h-3.5");
    expect(spinner).toHaveClass("w-3.5");
  });

  it("shows spinner when at least one mutation is running", () => {
    vi.mocked(useIsFetching).mockReturnValue(0);
    vi.mocked(useIsMutating).mockReturnValue(2);

    render(<GlobalFetchingIndicator />);

    expect(screen.getByTestId("global-fetching-spinner")).toBeInTheDocument();
  });

  it("shows spinner when both fetching and mutating are active", () => {
    vi.mocked(useIsFetching).mockReturnValue(3);
    vi.mocked(useIsMutating).mockReturnValue(1);

    render(<GlobalFetchingIndicator />);

    expect(screen.getByTestId("global-fetching-spinner")).toBeInTheDocument();
  });

  it("has correct title attribute with counts", () => {
    vi.mocked(useIsFetching).mockReturnValue(2);
    vi.mocked(useIsMutating).mockReturnValue(1);

    render(<GlobalFetchingIndicator />);

    expect(
      screen.getByTitle("Syncing — 2 query / 1 mutation in progress"),
    ).toBeInTheDocument();
  });

  it("applies correct container classes", () => {
    vi.mocked(useIsFetching).mockReturnValue(1);

    render(<GlobalFetchingIndicator />);

    const container = screen
      .getByTestId("global-fetching-spinner")
      .closest("div")!;
    expect(container).toHaveClass("inline-flex");
    expect(container).toHaveClass("items-center");
    expect(container).toHaveClass("gap-1.5");
    expect(container).toHaveClass("text-xs");
    expect(container).toHaveClass("text-muted-foreground/80");
    expect(container).toHaveClass("transition-opacity");
    expect(container).toHaveClass("duration-300");
  });
});
