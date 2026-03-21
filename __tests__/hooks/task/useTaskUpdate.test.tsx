import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useTaskUpdate } from "@/hooks/task/useTaskUpdate";
import { TRPCProvider } from "@/trpc";
import { trpcClient } from "@/trpc";
import { trpc } from "@/trpc";
import * as steelLib from "@steel-cut/steel-lib";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";

vi.mock("@steel-cut/steel-lib", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@steel-cut/steel-lib")>();
  return {
    ...actual,
    useBannerStore: vi.fn(() => ({
      show: vi.fn(),
      banner: null, // mock required property
      hide: vi.fn(), // mock required property
    })),
  };
});

type Task = inferRouterOutputs<AppRouter>["task"]["getByList"][number];

describe("useTaskUpdate", () => {
  let queryClient: QueryClient;

  const listId = "list-abc";

  const initialTasks: Task[] = [
    {
      id: "t1",
      title: "Old title",
      description: "Old desc",
      listId,
      userId: "user-123",
      order: 0,
      isCompleted: false,
      isCurrent: false,
      isPinned: false,
      dueDate: null,
      priority: null,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
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

  it.skip("optimistically updates task title and description, sets updatedAt", async () => {
    const show = vi.fn();
    vi.mocked(steelLib.useBannerStore).mockReturnValue({
      show,
      banner: null,
      hide: vi.fn(),
    });

    server.use(
      trpcMsw.task.update.mutation(() => ({
        ...initialTasks[0],
        title: "New title",
        description: "New desc",
        updatedAt: new Date().toISOString(),
      })),
    );

    const { result } = renderHook(() => useTaskUpdate(listId), { wrapper });

    act(() => {
      result.current.updateTask({
        id: "t1",
        title: "New title",
        description: "New desc",
      });
    });

    const updated = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    );

    expect(updated![0]).toMatchObject({
      id: "t1",
      title: "New title",
      description: "New desc",
    });
    expect(updated![0].updatedAt).not.toBe(initialTasks[0].updatedAt);

    await vi.waitFor(() => {
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Task updated successfully.",
          variant: "success",
          duration: 3000,
        }),
      );
    });
  });

  it("rolls back on error and shows error banner", async () => {
    const show = vi.fn();
    vi.mocked(steelLib.useBannerStore).mockReturnValue({
      show,
      banner: null,
      hide: vi.fn(),
    });

    server.use(
      trpcMsw.task.update.mutation(() => {
        throw new Error("update failed");
      }),
    );

    const { result } = renderHook(() => useTaskUpdate(listId), { wrapper });

    const original = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    );

    act(() => {
      result.current.updateTask({
        id: "t1",
        title: "New title",
      });
    });

    await vi.waitFor(() => {
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to update task. Please try again.",
          variant: "error",
          duration: 4000,
        }),
      );
    });

    const current = queryClient.getQueryData<Task[]>(
      trpc.task.getByList.queryKey({ listId }),
    );

    expect(current).toEqual(original);
  });

  it("invalidates query on settled", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    server.use(
      trpcMsw.task.update.mutation(() => ({
        ...initialTasks[0],
        title: "Updated",
        updatedAt: new Date().toISOString(),
      })),
    );

    const { result } = renderHook(() => useTaskUpdate(listId), { wrapper });

    act(() => {
      result.current.updateTask({
        id: "t1",
        title: "Updated",
      });
    });

    await vi.waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: trpc.task.getByList.queryKey({ listId }),
        }),
      );
    });
  });

  it.skip("sets isUpdating correctly during mutation", async () => {
    server.use(
      trpcMsw.task.update.mutation(async () => {
        await new Promise((r) => setTimeout(r, 150));
        return {
          ...initialTasks[0],
          title: "Delayed",
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    const { result } = renderHook(() => useTaskUpdate(listId), { wrapper });

    expect(result.current.isUpdating).toBe(false);

    act(() => {
      result.current.updateTask({
        id: "t1",
        title: "Delayed",
      });
    });

    expect(result.current.isUpdating).toBe(true);

    await vi.waitFor(
      () => {
        expect(result.current.isUpdating).toBe(false);
      },
      { timeout: 1000 },
    );
  });
});
