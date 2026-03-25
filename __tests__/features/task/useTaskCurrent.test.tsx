import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useTaskCurrent } from "@/features/tasks/useTaskCurrent";
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

describe("useTaskCurrent", () => {
  let queryClient: QueryClient;

  const listId = "list-abc123";

  const initialTasks: Task[] = [
    {
      id: "t1",
      title: "Task t1",
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
      title: "Task t2",
      description: null,
      listId,
      userId: "user-xyz",
      order: 1,
      isCompleted: false,
      isCurrent: false,
      isPinned: false,
      dueDate: null,
      priority: null,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
    },
    {
      id: "t3",
      title: "Task t3",
      description: null,
      listId,
      userId: "user-xyz",
      order: 2,
      isCompleted: false,
      isCurrent: false,
      isPinned: false,
      dueDate: null,
      priority: null,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
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
      defaultOptions: { queries: { retry: false } },
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
    const { result } = renderHook(() => useTaskCurrent(null), { wrapper });
    act(() => {
      result.current.setCurrentTask({ id: "t2" });
      result.current.clearCurrentTask();
    });
    expect(mockShowBanner).not.toHaveBeenCalled();
    expect(result.current.setCurrentTaskPending).toBe(false);
    expect(result.current.clearCurrentTaskPending).toBe(false);
  });

  it("optimistically sets task as current and moves it to top", async () => {
    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    await act(async () => {
      result.current.setCurrentTask({ id: "t2" });
    });

    await waitFor(
      () => {
        const tasks = queryClient.getQueryData<Task[]>(
          trpc.task.getByList.queryKey({ listId }),
        )!;
        expect(tasks[0].id).toBe("t2");
        expect(tasks[0].isCurrent).toBe(true);
        expect(tasks[0].order).toBeLessThan(0);
        expect(tasks[1].id).toBe("t1");
        expect(tasks[1].isCurrent).toBe(false);
      },
      { timeout: 100 },
    );
  });

  it("optimistically clears current status", async () => {
    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    await act(async () => {
      result.current.clearCurrentTask();
    });

    await waitFor(
      () => {
        const tasks = queryClient.getQueryData<Task[]>(
          trpc.task.getByList.queryKey({ listId }),
        )!;
        expect(tasks.every((t) => !t.isCurrent)).toBe(true);
      },
      { timeout: 100 },
    );
  });

  it("rolls back and shows error banner when setCurrent fails", async () => {
    server.use(
      trpcMsw.task.setCurrent.mutation(() => {
        throw new Error("failed");
      }),
    );

    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    const original = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    );

    act(() => {
      result.current.setCurrentTask({ id: "t3" });
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to set current task",
          variant: "error",
        }),
      );
    });

    expect(
      queryClient.getQueryData(trpc.task.getByList.queryKey({ listId })),
    ).toEqual(original);
  });

  it("shows success banner when setCurrent succeeds", async () => {
    server.use(
      trpcMsw.task.setCurrent.mutation(async ({ input }) => ({
        id: input.id,
        title: "Task title",
        description: null,
        listId,
        userId: "user-xyz",
        order: -100,
        isCompleted: false,
        isCurrent: true,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T10:00:00Z",
        updatedAt: new Date().toISOString(),
      })),
    );

    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    act(() => {
      result.current.setCurrentTask({ id: "t2" });
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Current task set",
          variant: "success",
        }),
      );
    });
  });

  it("shows success banner when clearCurrent succeeds", async () => {
    server.use(
      trpcMsw.task.clearCurrent.mutation(async () => ({ success: true })),
    );

    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    act(() => {
      result.current.clearCurrentTask();
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Current task cleared",
          variant: "success",
        }),
      );
    });
  });

  it("invalidates correct queries on settled", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    server.use(
      trpcMsw.task.setCurrent.mutation(async ({ input }) => ({
        id: input.id,
        title: "Task title",
        description: null,
        listId,
        userId: "user-xyz",
        order: -100,
        isCompleted: false,
        isCurrent: true,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T10:00:00Z",
        updatedAt: new Date().toISOString(),
      })),
      trpcMsw.task.clearCurrent.mutation(async () => ({ success: true })),
    );

    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    act(() => result.current.setCurrentTask({ id: "t3" }));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));

    invalidateSpy.mockClear();

    act(() => result.current.clearCurrentTask());
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
  });

  it("sets pending state during setCurrent mutation", async () => {
    let resolve!: (value: Task) => void;

    server.use(
      trpcMsw.task.setCurrent.mutation(
        () =>
          new Promise<Task>((r) => {
            resolve = r;
          }),
      ),
    );

    const { result } = renderHook(() => useTaskCurrent(listId), { wrapper });

    expect(result.current.setCurrentTaskPending).toBe(false);

    act(() => result.current.setCurrentTask({ id: "t1" }));

    await waitFor(() =>
      expect(result.current.setCurrentTaskPending).toBe(true),
    );

    await act(() =>
      resolve({
        id: "t1",
        title: "Task t1",
        description: null,
        listId,
        userId: "user-xyz",
        order: -100,
        isCompleted: false,
        isCurrent: true,
        isPinned: false,
        dueDate: null,
        priority: null,
        createdAt: "2026-03-01T10:00:00Z",
        updatedAt: new Date().toISOString(),
      }),
    );

    await waitFor(() =>
      expect(result.current.setCurrentTaskPending).toBe(false),
    );
  });
});
