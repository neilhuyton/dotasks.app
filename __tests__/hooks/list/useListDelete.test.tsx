import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useListDelete } from "@/hooks/list/useListDelete";
import { TRPCError } from "@trpc/server";
import { TRPCProvider } from "@/trpc";
import { trpcClient } from "@/trpc";
import { trpc } from "@/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/../server/trpc";
import { suppressActWarnings } from "../../utils/act-suppress";

suppressActWarnings();

type List = inferRouterOutputs<AppRouter>["list"]["getAll"][number];

const mockShowBanner = vi.fn();

vi.mock("@steel-cut/steel-lib", async () => {
  const actual = await vi.importActual("@steel-cut/steel-lib");
  return {
    ...actual,
    useBannerStore: vi.fn(() => ({
      show: mockShowBanner,
    })),
  };
});

describe("useListDelete", () => {
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
    vi.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );

  const allListsQueryKey = trpc.list.getAll.queryKey();

  it("optimistically removes the list from cache", async () => {
    const initialLists: List[] = [
      {
        id: "1",
        title: "List One",
        description: null,
        color: null,
        icon: null,
        order: 0,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
      {
        id: "2",
        title: "List Two",
        description: null,
        color: null,
        icon: null,
        order: 1,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
    ];

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListDelete(), { wrapper });

    await act(async () => {
      result.current.deleteList("2");
    });

    const lists = queryClient.getQueryData<List[]>(allListsQueryKey)!;
    expect(lists).toHaveLength(1);
    expect(lists[0].id).toBe("1");
  });

  it("rolls back optimistic removal on error and shows error banner", async () => {
    const initialLists: List[] = [
      {
        id: "1",
        title: "List One",
        description: null,
        color: null,
        icon: null,
        order: 0,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
      {
        id: "2",
        title: "List Two",
        description: null,
        color: null,
        icon: null,
        order: 1,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
    ];

    server.use(
      trpcMsw.list.getAll.query(() => initialLists),
      trpcMsw.list.delete.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListDelete(), { wrapper });

    await act(async () => {
      result.current.deleteList("2");
    });

    const listsAfter = queryClient.getQueryData<List[]>(allListsQueryKey)!;
    expect(listsAfter).toHaveLength(2);
    expect(listsAfter[1].id).toBe("2");

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to delete list. Please try again.",
        variant: "error",
        duration: 5000,
      }),
    );
  });

  it("shows success banner on successful deletion", async () => {
    const initialLists: List[] = [
      {
        id: "1",
        title: "List One",
        description: null,
        color: null,
        icon: null,
        order: 0,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
      {
        id: "2",
        title: "List Two",
        description: null,
        color: null,
        icon: null,
        order: 1,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
    ];

    server.use(
      trpcMsw.list.getAll.query(() => initialLists),
      trpcMsw.list.delete.mutation(async () => ({
        id: "2",
        userId: "test-user",
        title: "List Two",
        description: null,
        color: null,
        icon: null,
        order: 1,
        isArchived: false,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      })),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListDelete(), { wrapper });

    await act(async () => {
      result.current.deleteList("2");
    });

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "List deleted successfully.",
        variant: "success",
        duration: 3000,
      }),
    );
  });

  it("calls onSuccess callback when provided", async () => {
    const onSuccessCb = vi.fn();

    const initialLists: List[] = [
      {
        id: "1",
        title: "List One",
        description: null,
        color: null,
        icon: null,
        order: 0,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
    ];

    server.use(
      trpcMsw.list.getAll.query(() => initialLists),
      trpcMsw.list.delete.mutation(async () => ({
        id: "1",
        userId: "test-user",
        title: "List One",
        description: null,
        color: null,
        icon: null,
        order: 0,
        isArchived: false,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
      })),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListDelete(), { wrapper });

    await act(async () => {
      result.current.deleteList("1", { onSuccess: onSuccessCb });
    });

    expect(onSuccessCb).toHaveBeenCalledTimes(1);
  });

  it("sets isDeleting to true during mutation and false after", async () => {
    let resolve: () => void;

    const initialLists: List[] = [
      {
        id: "1",
        title: "List One",
        description: null,
        color: null,
        icon: null,
        order: 0,
        isPinned: false,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
    ];

    server.use(
      trpcMsw.list.getAll.query(() => initialLists),
      trpcMsw.list.delete.mutation(async () => {
        return new Promise((r) => {
          resolve = () =>
            r({
              id: "1",
              userId: "test-user",
              title: "List One",
              description: null,
              color: null,
              icon: null,
              order: 0,
              isArchived: false,
              isPinned: false,
              createdAt: "2026-03-01T00:00:00Z",
              updatedAt: "2026-03-01T00:00:00Z",
            });
        });
      }),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListDelete(), { wrapper });

    expect(result.current.isDeleting).toBe(false);

    await act(async () => {
      result.current.deleteList("1");
    });

    expect(result.current.isDeleting).toBe(true);

    await act(async () => {
      resolve();
    });

    await vi.waitFor(() => {
      expect(result.current.isDeleting).toBe(false);
    });
  });
});