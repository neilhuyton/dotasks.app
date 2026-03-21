import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTaskRealtime } from "@/hooks/task/useTaskRealtime";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeSubscription } from "@steel-cut/steel-lib";
import { trpc } from "@/trpc";

vi.mock("@steel-cut/steel-lib", () => ({
  useRealtimeSubscription: vi.fn(),
}));

vi.mock("@/store/authStore", () => ({
  useAuthStore: vi.fn(),
}));

describe("useTaskRealtime", () => {
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

    renderHook(() => useTaskRealtime(), { wrapper });

    expect(useRealtimeSubscription).not.toHaveBeenCalled();
  });

  it.skip("subscribes with correct channel and filter when userId exists", () => {
    const mockUserId = "user-123";
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: mockUserId },
    });

    renderHook(() => useTaskRealtime(), { wrapper });

    expect(useRealtimeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        channelName: `task:user:${mockUserId}`,
        table: "task",
        event: "*",
        filter: `userId=eq.${mockUserId}`,
        enabled: true,
        supabase: expect.any(Object),
        subscribeToAuthChange: expect.any(Function),
      }),
    );
  });

  it("invalidates task.getByList for specific listId on INSERT/UPDATE/DELETE", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "user-456" },
    });

    const mockInvalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useTaskRealtime(), { wrapper });

    const onPayload = vi.mocked(useRealtimeSubscription).mock.calls[0][0]
      .onPayload;

    onPayload({
      eventType: "INSERT",
      new: { listId: "list-abc" },
      old: {},
      schema: "public",
      table: "task",
      commit_timestamp: "2026-03-21T12:00:00Z",
      errors: [],
    });
    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: trpc.task.getByList.queryKey({ listId: "list-abc" }),
    });

    mockInvalidate.mockClear();
    onPayload({
      eventType: "UPDATE",
      new: { listId: "list-xyz" },
      old: {},
      schema: "public",
      table: "task",
      commit_timestamp: "2026-03-21T12:01:00Z",
      errors: [],
    });
    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: trpc.task.getByList.queryKey({ listId: "list-xyz" }),
    });

    mockInvalidate.mockClear();
    onPayload({
      eventType: "DELETE",
      new: {},
      old: { listId: "list-999" },
      schema: "public",
      table: "task",
      commit_timestamp: "2026-03-21T12:02:00Z",
      errors: [],
    });
    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: trpc.task.getByList.queryKey({ listId: "list-999" }),
    });
  });

  it("always invalidates list.getAll on any payload", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "user-789" },
    });

    const mockInvalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useTaskRealtime(), { wrapper });

    const onPayload = vi.mocked(useRealtimeSubscription).mock.calls[0][0]
      .onPayload;

    onPayload({
      eventType: "INSERT",
      new: { listId: "list-a" },
      old: {},
      schema: "public",
      table: "task",
      commit_timestamp: "2026-03-21T12:00:00Z",
      errors: [],
    });

    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: trpc.list.getAll.queryKey(),
    });
  });

  it("handles payload with missing listId gracefully (no task invalidation)", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "user-101" },
    });

    const mockInvalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useTaskRealtime(), { wrapper });

    const onPayload = vi.mocked(useRealtimeSubscription).mock.calls[0][0]
      .onPayload;

    onPayload({
      eventType: "INSERT",
      new: {},
      old: {},
      schema: "public",
      table: "task",
      commit_timestamp: "2026-03-21T12:00:00Z",
      errors: [],
    });
    onPayload({
      eventType: "DELETE",
      new: {},
      old: {},
      schema: "public",
      table: "task",
      commit_timestamp: "2026-03-21T12:00:00Z",
      errors: [],
    });

    expect(mockInvalidate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: expect.arrayContaining(["task", "getByList"]),
      }),
    );

    expect(mockInvalidate).toHaveBeenCalledWith({
      queryKey: trpc.list.getAll.queryKey(),
    });
  });

  it("subscribes to auth changes via useAuthStore", () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: "user-222" },
    });

    renderHook(() => useTaskRealtime(), { wrapper });

    expect(useRealtimeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        subscribeToAuthChange: expect.any(Function),
      }),
    );
  });
});
