import { render } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RealtimeListeners } from "@/components/RealtimeListeners";
import { useListRealtime } from "@/hooks/useListRealtime";
import { useTaskRealtime } from "@/hooks/useTaskRealtime";

vi.mock("@/hooks/useListRealtime", () => ({
  useListRealtime: vi.fn(),
}));

vi.mock("@/hooks/useTaskRealtime", () => ({
  useTaskRealtime: vi.fn(),
}));

describe("RealtimeListeners", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset mocks before each test
    vi.mocked(useListRealtime).mockClear();
    vi.mocked(useTaskRealtime).mockClear();
  });

  it("renders nothing and calls both realtime hooks", () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <RealtimeListeners />
      </QueryClientProvider>,
    );

    expect(useListRealtime).toHaveBeenCalledTimes(1);
    expect(useTaskRealtime).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });
});
