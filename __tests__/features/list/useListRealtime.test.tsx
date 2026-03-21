import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useListRealtime } from "@/hooks/list/useListRealtime";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@steel-cut/steel-lib";
import { trpc } from "@/trpc";

vi.mock("@steel-cut/steel-lib", () => ({
  useRealtimeSubscription: vi.fn(),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: vi.fn(),
}));

describe("useListRealtime", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.skip("does not subscribe when userId is missing", () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: undefined });

    renderHook(() => useListRealtime(), { wrapper });

    expect(useRealtimeSubscription).not.toHaveBeenCalled();
  });

  it.skip("subscribes with correct channel and filter when userId exists", () => {
    const mockUserId = "user-123";
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: mockUserId },
    });

    renderHook(() => useListRealtime(), { wrapper });

    expect(useRealtimeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: `list:user:${mockUserId}`,
        table: "todolist",
        event: "*",
        filter: `userId=eq.${mockUserId}`,
        enabled: true,
        supabase: expect.any(Object),
        subscribeToAuthChange: expect.any(Function),
      }),
    );
  });

  it("invalidates list.getAll on any payload", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "user-456" },
    });

    const mockInvalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useListRealtime(), { wrapper });

    const onPayload = vi.mocked(useRealtimeSubscription).mock.calls[0][0]
      .onPayload;

    onPayload({
      eventType: "INSERT",
      new: { id: "list-new" },
      old: {},
      schema: "public",
      table: "todolist",
      commit_timestamp: "2026-03-21T12:00:00Z",
      errors: [],
    });

    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: trpc.list.getAll.queryKey(),
    });
  });

  it("subscribes to auth changes via useAuthStore", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "user-789" },
    });

    renderHook(() => useListRealtime(), { wrapper });

    expect(useRealtimeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        subscribeToAuthChange: expect.any(Function),
      }),
    );
  });
});
