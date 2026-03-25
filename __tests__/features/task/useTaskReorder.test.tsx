import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useTaskReorder } from "@/features/tasks/useTaskReorder";
import { TRPCProvider } from "@/trpc";
import { trpcClient } from "@/trpc";
import { trpc } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { suppressActWarnings } from "../../utils/act-suppress";

suppressActWarnings();

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

const mockShowBanner = vi.fn();

vi.mock("@steel-cut/steel-lib", async () => {
  const actual = await vi.importActual("@steel-cut/steel-lib");
  return {
    ...actual,
    useBannerStore: vi.fn(() => ({
      show: mockShowBanner,
      banner: null,
      hide: vi.fn(),
    })),
  };
});

describe("useTaskReorder", () => {
  let queryClient: QueryClient;

  const listId = "list-abc123";

  const initialTasks: Task[] = [
    {
      id: "t1",
      title: "Task One",
      description: null,
      listId,
      userId: "user-xyz",
      order: 0,
      isCompleted: false,
      isCurrent: true,
      isPinned: false,
      dueDate: null,
      priority: null,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    },
    {
      id: "t2",
      title: "Task Two",
      description: null,
      listId,
      userId: "user-xyz",
      order: 1,
      isCompleted: false,
      isCurrent: false,
      isPinned: false,
      dueDate: null,
      priority: null,
      createdAt: "2026-03-01T11:00:00Z",
      updatedAt: "2026-03-01T11:00:00Z",
    },
    {
      id: "t3",
      title: "Task Three",
      description: null,
      listId,
      userId: "user-xyz",
      order: 2,
      isCompleted: false,
      isCurrent: false,
      isPinned: false,
      dueDate: null,
      priority: null,
      createdAt: "2026-03-01T12:00:00Z",
      updatedAt: "2026-03-01T12:00:00Z",
    },
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    server.resetHandlers();
    vi.clearAllMocks();

    queryClient.setQueryData(
      trpc.task.getByList.queryKey({ listId }),
      initialTasks,
    );
  });

  afterEach(() => {
    server.resetHandlers();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("does nothing when listId is missing", () => {
    const { result } = renderHook(() => useTaskReorder(null), { wrapper });

    act(() => {
      result.current.reorderTasks([{ id: "t1", order: 2 }]);
    });

    expect(mockShowBanner).not.toHaveBeenCalled();
    expect(result.current.isReordering).toBe(false);
    expect(result.current.pendingReorder).toBeNull();
  });

  it.skip("optimistically reorders tasks respecting isCurrent and sets pendingReorder", async () => {
    const { result } = renderHook(() => useTaskReorder(listId), { wrapper });

    expect(result.current.pendingReorder).toBeNull();

    const updates = [
      { id: "t3", order: 0 },
      { id: "t1", order: 1 },
      { id: "t2", order: 2 },
    ];

    await act(async () => {
      result.current.reorderTasks(updates);
    });

    await act(async () => {});

    expect(result.current.pendingReorder).not.toBeNull();

    const pending = result.current.pendingReorder!;
    expect(pending.map((t) => t.id)).toEqual(["t1", "t3", "t2"]);
    expect(pending[0].isCurrent).toBe(true);
    expect(pending[0].order).toBe(1);
    expect(pending[1].order).toBe(0);
    expect(pending[2].order).toBe(2);

    const cache = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    )!;
    expect(cache.map((t) => t.id)).toEqual(["t1", "t3", "t2"]);
  });

  it("rolls back cache on error and shows error banner", async () => {
    server.use(
      trpcMsw.task.reorder.mutation(() => {
        throw new Error("Reorder failed");
      }),
    );

    const { result } = renderHook(() => useTaskReorder(listId), { wrapper });

    const original = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    )!;

    act(() => {
      result.current.reorderTasks([{ id: "t2", order: 0 }]);
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to reorder tasks",
          variant: "error",
          duration: 4000,
        }),
      );
    });

    const after = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    )!;

    expect(after).toEqual(original);
    expect(result.current.pendingReorder).toBeNull();
  });

  it("shows success banner and clears pendingReorder on success", async () => {
    server.use(
      trpcMsw.task.reorder.mutation(async () => ({
        success: true,
        updated: [
          { id: "t3", order: 0 },
          { id: "t1", order: 1 },
          { id: "t2", order: 2 },
        ],
      })),
    );

    const { result } = renderHook(() => useTaskReorder(listId), { wrapper });

    act(() => {
      result.current.reorderTasks([
        { id: "t3", order: 0 },
        { id: "t1", order: 1 },
        { id: "t2", order: 2 },
      ]);
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Tasks reordered",
          variant: "success",
          duration: 2000,
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.pendingReorder).toBeNull();
    });
  });

  it("sets isReordering true during mutation and false after", async () => {
    let mutationResolve!: () => void;

    server.use(
      trpcMsw.task.reorder.mutation(
        () =>
          new Promise((resolve) => {
            mutationResolve = () =>
              resolve({
                success: true,
                updated: [{ id: "t1", order: 2 }],
              });
          }),
      ),
    );

    const { result } = renderHook(() => useTaskReorder(listId), { wrapper });

    expect(result.current.isReordering).toBe(false);

    act(() => {
      result.current.reorderTasks([{ id: "t1", order: 2 }]);
    });

    await waitFor(() => {
      expect(result.current.isReordering).toBe(true);
    });

    await act(async () => {
      mutationResolve();
    });

    await waitFor(() => {
      expect(result.current.isReordering).toBe(false);
    });
  });

  it.skip("invalidates correct queries on settled", async () => {
    let mutationResolve!: () => void;

    server.use(
      trpcMsw.task.reorder.mutation(
        async () =>
          new Promise((resolve) => {
            mutationResolve = () =>
              resolve({
                success: true,
                updated: [],
              });
          }),
      ),
    );

    const { result } = renderHook(() => useTaskReorder(listId), { wrapper });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.reorderTasks([{ id: "t2", order: 0 }]);
    });

    await act(async () => {
      mutationResolve();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: trpc.task.getByList.queryKey({ listId }),
        }),
      );
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: trpc.list.getOne.queryKey({ id: listId }),
          exact: true,
        }),
      );
    });
  });
});
