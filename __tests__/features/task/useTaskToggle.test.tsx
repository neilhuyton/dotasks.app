import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useTaskToggle } from "@/features/tasks/useTaskToggle";
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

describe("useTaskToggle", () => {
  let queryClient: QueryClient;

  const listId = "list-abc123";

  const initialTasks: Task[] = [
    {
      id: "t1",
      title: "Buy milk",
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
      title: "Call mom",
      description: null,
      listId,
      userId: "user-xyz",
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
    const { result } = renderHook(() => useTaskToggle(null), { wrapper });

    act(() => {
      result.current.toggleTask({ id: "t1" });
    });

    expect(mockShowBanner).not.toHaveBeenCalled();
    expect(result.current.toggleTaskPending).toBe(false);
    expect(result.current.pendingToggleIds.size).toBe(0);
  });

  it.skip("optimistically toggles isCompleted and clears isCurrent, adds to pendingToggleIds", async () => {
    const { result } = renderHook(() => useTaskToggle(listId), { wrapper });

    expect(result.current.pendingToggleIds.has("t1")).toBe(false);

    await act(async () => {
      result.current.toggleTask({ id: "t1" });
    });

    // Force one more tick — needed in some vitest + react-query combinations
    await act(async () => {});

    expect(result.current.pendingToggleIds.has("t1")).toBe(true);

    const tasks = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    )!;

    const toggledTask = tasks.find((t) => t.id === "t1")!;
    expect(toggledTask.isCompleted).toBe(true);
    expect(toggledTask.isCurrent).toBe(false);
  });

  it("rolls back on error and shows error banner", async () => {
    server.use(
      trpcMsw.task.toggle.mutation(() => {
        throw new Error("Toggle failed");
      }),
    );

    const { result } = renderHook(() => useTaskToggle(listId), { wrapper });

    const originalData = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    );

    act(() => {
      result.current.toggleTask({ id: "t2" });
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to update task status",
          variant: "error",
          duration: 4000,
        }),
      );
    });

    const afterData = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    );

    expect(afterData).toEqual(originalData);
    expect(result.current.pendingToggleIds.has("t2")).toBe(false);
  });

  it("shows correct success banner when completing a task", async () => {
    server.use(
      trpcMsw.task.toggle.mutation(async ({ input }) => ({
        ...initialTasks.find((t) => t.id === input.id)!,
        isCompleted: true,
        isCurrent: false,
        updatedAt: new Date().toISOString(),
      })),
    );

    const { result } = renderHook(() => useTaskToggle(listId), { wrapper });

    act(() => {
      result.current.toggleTask({ id: "t1" });
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Task marked as completed",
          variant: "success",
          duration: 2800,
        }),
      );
    });
  });

  it("shows correct success banner when re-opening a task", async () => {
    server.use(
      trpcMsw.task.toggle.mutation(async ({ input }) => ({
        ...initialTasks.find((t) => t.id === input.id)!,
        isCompleted: false,
        isCurrent: false,
        updatedAt: new Date().toISOString(),
      })),
    );

    const { result } = renderHook(() => useTaskToggle(listId), { wrapper });

    act(() => {
      result.current.toggleTask({ id: "t2" });
    });

    await waitFor(() => {
      expect(mockShowBanner).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Task marked as re-opened",
          variant: "success",
          duration: 2800,
        }),
      );
    });
  });

  it("removes id from pendingToggleIds and invalidates queries on settled", async () => {
    let mutationResolve!: () => void;

    server.use(
      trpcMsw.task.toggle.mutation(
        () =>
          new Promise((resolve) => {
            mutationResolve = () =>
              resolve({
                ...initialTasks[0],
                isCompleted: true,
                isCurrent: false,
                updatedAt: new Date().toISOString(),
              });
          }),
      ),
    );

    const { result } = renderHook(() => useTaskToggle(listId), { wrapper });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    act(() => {
      result.current.toggleTask({ id: "t1" });
    });

    await waitFor(() => {
      expect(result.current.pendingToggleIds.has("t1")).toBe(true);
    });

    await act(async () => {
      mutationResolve();
    });

    await waitFor(() => {
      expect(result.current.pendingToggleIds.has("t1")).toBe(false);
    });

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

  it("sets toggleTaskPending correctly during mutation", async () => {
    let mutationResolve!: () => void;

    server.use(
      trpcMsw.task.toggle.mutation(
        () =>
          new Promise((resolve) => {
            mutationResolve = () =>
              resolve({ ...initialTasks[0], isCompleted: true });
          }),
      ),
    );

    const { result } = renderHook(() => useTaskToggle(listId), { wrapper });

    expect(result.current.toggleTaskPending).toBe(false);

    act(() => {
      result.current.toggleTask({ id: "t1" });
    });

    await waitFor(() => {
      expect(result.current.toggleTaskPending).toBe(true);
    });

    await act(async () => {
      mutationResolve();
    });

    await waitFor(() => {
      expect(result.current.toggleTaskPending).toBe(false);
    });
  });
});
