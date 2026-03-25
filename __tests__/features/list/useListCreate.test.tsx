import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useListCreate } from "@/features/lists/useListCreate";
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

describe("useListCreate", () => {
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

  it("optimistically adds a new list to the cache", async () => {
    const initialLists: List[] = [
      {
        id: "1",
        title: "Existing",
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

    let resolve: () => void;

    server.use(
      trpcMsw.list.getAll.query(() => initialLists),
      trpcMsw.list.create.mutation(async ({ input }) => {
        return new Promise((r) => {
          resolve = () =>
            r({
              id: "real-123",
              userId: "test-user",
              title: input.title,
              description: input.description ?? null,
              color: null,
              icon: null,
              order: initialLists.length,
              isArchived: false,
              isPinned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        });
      }),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListCreate(), { wrapper });

    await act(async () => {
      result.current.createList({ title: "New List" });
    });

    let lists = queryClient.getQueryData<List[]>(allListsQueryKey)!;
    expect(lists).toHaveLength(2);
    expect(lists[1].id).toMatch(/^temp-/);
    expect(lists[1]).toMatchObject({
      title: "New List",
      description: null,
      order: 1,
    });

    await act(() => {
      resolve();
    });

    lists = queryClient.getQueryData<List[]>(allListsQueryKey)!;
    expect(lists[1].id).toBe("real-123");
  });

  it("rolls back optimistic update on error and shows error banner", async () => {
    const initialLists: List[] = [
      {
        id: "1",
        title: "One",
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
      trpcMsw.list.create.mutation(() => {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
        });
      }),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListCreate(), { wrapper });

    await act(async () => {
      result.current.createList({ title: "Fail List" });
    });

    const listsAfter = queryClient.getQueryData<List[]>(allListsQueryKey)!;
    expect(listsAfter).toHaveLength(1);
    expect(listsAfter[0].title).toBe("One");

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to create list. Please try again.",
        variant: "error",
        duration: 4000,
      }),
    );
  });

  it("replaces temp id with real id on success and shows success banner", async () => {
    const initialLists: List[] = [
      {
        id: "1",
        title: "Existing",
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

    let resolve: () => void;

    server.use(
      trpcMsw.list.getAll.query(() => initialLists),
      trpcMsw.list.create.mutation(async ({ input }) => {
        return new Promise((r) => {
          resolve = () =>
            r({
              id: "real-456",
              userId: "test-user",
              title: input.title,
              description: input.description ?? null,
              color: null,
              icon: null,
              order: initialLists.length,
              isArchived: false,
              isPinned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        });
      }),
    );

    queryClient.setQueryData(allListsQueryKey, initialLists);

    const { result } = renderHook(() => useListCreate(), { wrapper });

    await act(async () => {
      result.current.createList({ title: "New List" });
    });

    let lists = queryClient.getQueryData<List[]>(allListsQueryKey)!;
    expect(lists).toHaveLength(2);
    expect(lists[1].id).toMatch(/^temp-/);

    await act(() => {
      resolve();
    });

    await vi.waitFor(() => {
      lists = queryClient.getQueryData<List[]>(allListsQueryKey)!;
      expect(lists[1].id).toBe("real-456");
    });

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "List has been created successfully.",
        variant: "success",
        duration: 3000,
      }),
    );
  });

  it("calls onSuccess callback when provided", async () => {
    const onSuccessCb = vi.fn();

    let resolve: () => void;

    server.use(
      trpcMsw.list.getAll.query(() => []),
      trpcMsw.list.create.mutation(async () => {
        return new Promise((r) => {
          resolve = () =>
            r({
              id: "real-789",
              userId: "test-user",
              title: "Success",
              description: null,
              color: null,
              icon: null,
              order: 0,
              isArchived: false,
              isPinned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        });
      }),
    );

    const { result } = renderHook(() => useListCreate(), { wrapper });

    await act(async () => {
      result.current.createList(
        { title: "Success List" },
        { onSuccess: onSuccessCb },
      );
    });

    await act(() => {
      resolve();
    });

    await vi.waitFor(() => {
      expect(onSuccessCb).toHaveBeenCalledTimes(1);
    });
  });

  it("sets isCreating to true during mutation and false after", async () => {
    let resolve: () => void;

    server.use(
      trpcMsw.list.getAll.query(() => []),
      trpcMsw.list.create.mutation(async () => {
        return new Promise((r) => {
          resolve = () =>
            r({
              id: "real-abc",
              userId: "test-user",
              title: "Delayed",
              description: null,
              color: null,
              icon: null,
              order: 0,
              isArchived: false,
              isPinned: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
        });
      }),
    );

    const { result } = renderHook(() => useListCreate(), { wrapper });

    expect(result.current.isCreating).toBe(false);

    await act(async () => {
      result.current.createList({ title: "Delayed List" });
    });

    expect(result.current.isCreating).toBe(true);

    await act(async () => {
      resolve();
    });

    await vi.waitFor(() => {
      expect(result.current.isCreating).toBe(false);
    });
  });
});
