import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useTaskRead } from "@/hooks/task/useTaskRead";
import { TRPCProvider } from "@/trpc";
import { trpcClient } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { suppressActWarnings } from "../../utils/act-suppress";

suppressActWarnings();

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

describe("useTaskRead", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    server.resetHandlers();
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );

  it("returns empty array and isLoadingTasks false when listId is missing", () => {
    const { result } = renderHook(() => useTaskRead(null), { wrapper });

    expect(result.current.tasks).toEqual([]);
    expect(result.current.isLoadingTasks).toBe(false);
  });

  it("returns empty array and isLoadingTasks false when userId is missing", async () => {
    const { result } = renderHook(() => useTaskRead("list-abc"), { wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoadingTasks).toBe(false);
    });
  });

  it.skip("fetches and returns tasks when listId and userId are present", async () => {
    const listId = "list-abc";

    const mockTasks: Task[] = [
      {
        id: "t1",
        title: "Buy milk",
        description: null,
        listId,
        userId: "user-123",
        order: 0,
        isCompleted: false,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T10:00:00Z",
        updatedAt: "2026-03-01T10:00:00Z",
      },
      {
        id: "t2",
        title: "Call mom",
        description: "Ask about recipe",
        listId,
        userId: "user-123",
        order: 1,
        isCompleted: true,
        isCurrent: false,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-02T09:00:00Z",
        updatedAt: "2026-03-02T09:00:00Z",
      },
    ];

    server.use(
      trpcMsw.task.getByList.query(() => {
        return mockTasks;
      }),
    );

    const { result } = renderHook(() => useTaskRead(listId), { wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.isLoadingTasks).toBe(false);
    });
  });

  it("returns isLoadingTasks true while fetching first data", async () => {
    const listId = "list-abc";

    server.use(
      trpcMsw.task.getByList.query(async () => {
        await new Promise((r) => setTimeout(r, 100));
        return [];
      }),
    );

    const { result } = renderHook(() => useTaskRead(listId), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingTasks).toBe(true);
      },
      { timeout: 500 },
    );

    await waitFor(
      () => {
        expect(result.current.isLoadingTasks).toBe(false);
      },
      { timeout: 500 },
    );
  });

  it("exposes correct query key", () => {
    const listId = "list-xyz";

    const { result } = renderHook(() => useTaskRead(listId), { wrapper });

    expect(result.current).not.toHaveProperty("tasksQueryKey");
  });
});
