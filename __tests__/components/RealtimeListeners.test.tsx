import { render } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { RealtimeListeners } from "@/components/RealtimeListeners";
import { useListRealtime } from "@/hooks/list/useListRealtime";
import { useTaskRealtime } from "@/hooks/task/useTaskRealtime";

vi.mock("@/hooks/list/useListRealtime", () => ({
  useListRealtime: vi.fn(),
}));

vi.mock("@/hooks/task/useTaskRealtime", () => ({
  useTaskRealtime: vi.fn(),
}));

vi.mock("@/hooks/useGoalRealtime", () => ({
  useGoalRealtime: vi.fn(),
}));

vi.mock("@/hooks/useWeightRealtime", () => ({
  useWeightRealtime: vi.fn(),
}));

describe.skip("RealtimeListeners", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

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
