// __tests__/hooks/list/useListUpdate.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpcMsw } from "../../../__mocks__/trpcMsw";
import { server } from "../../../__mocks__/server";
import { useListUpdate } from "@/hooks/list/useListUpdate";
import { TRPCError } from "@trpc/server";
import { TRPCProvider } from "@/trpc";
import { trpcClient } from "@/trpc";
import { trpc } from "@/trpc";
import type { ListSummary, ListDetail } from "@/hooks/list/types";
import { suppressActWarnings } from "../../utils/act-suppress";

suppressActWarnings();

const mockShowBanner = vi.fn();

vi.mock("@steel-cut/steel-lib", async () => {
  const actual = await vi.importActual("@steel-cut/steel-lib");
  return {
    ...actual,
    useBannerStore: vi.fn(() => ({ show: mockShowBanner })),
  };
});

describe("useListUpdate", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
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
  const getListQueryKey = (id: string) => trpc.list.getOne.queryKey({ id });

  it("optimistically updates both list detail and all-lists cache", async () => {
    const initialLists: ListSummary[] = [
      {
        id: "1",
        title: "Groceries",
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
        title: "Work",
        description: "Old description",
        color: null,
        icon: null,
        order: 1,
        isPinned: false,
        createdAt: "2026-03-02T00:00:00Z",
        updatedAt: "2026-03-02T00:00:00Z",
        tasks: [],
        _count: { tasks: 0 },
      },
    ];

    const initialDetail: ListDetail = {
      ...initialLists[1],
      userId: "u1",
      isArchived: false,
    };

    queryClient.setQueryData(allListsQueryKey, initialLists);
    queryClient.setQueryData(getListQueryKey("2"), initialDetail);

    const { result } = renderHook(() => useListUpdate(), { wrapper });

    await act(async () => {
      result.current.updateList({
        id: "2",
        title: "Work Tasks",
        description: "Updated project list",
      });
    });

    const updatedAll =
      queryClient.getQueryData<ListSummary[]>(allListsQueryKey)!;
    expect(updatedAll[1].title).toBe("Work Tasks");
    expect(updatedAll[1].description).toBe("Updated project list");
    expect(updatedAll[1].updatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);

    const updatedDetail = queryClient.getQueryData<ListDetail>(
      getListQueryKey("2"),
    )!;
    expect(updatedDetail.title).toBe("Work Tasks");
    expect(updatedDetail.description).toBe("Updated project list");
    expect(updatedDetail.updatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("rolls back both caches on error and shows error banner", async () => {
    const initialSummary: ListSummary = {
      id: "1",
      title: "Shopping",
      description: null,
      color: null,
      icon: null,
      order: 0,
      isPinned: false,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-01T00:00:00Z",
      tasks: [],
      _count: { tasks: 0 },
    };

    const initialDetail: ListDetail = {
      ...initialSummary,
      userId: "u1",
      isArchived: false,
      description: "Milk and bread",
    };

    queryClient.setQueryData(allListsQueryKey, [initialSummary]);
    queryClient.setQueryData(getListQueryKey("1"), initialDetail);

    server.use(
      trpcMsw.list.getAll.query(() => [initialSummary]),
      trpcMsw.list.getOne.query(() => initialDetail),
      trpcMsw.list.update.mutation(() => {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }),
    );

    const { result } = renderHook(() => useListUpdate(), { wrapper });

    await act(async () => {
      result.current.updateList({
        id: "1",
        title: "Groceries New",
        description: "Changed desc",
      });
    });

    const allAfter = queryClient.getQueryData<ListSummary[]>(allListsQueryKey)!;
    expect(allAfter[0].title).toBe("Shopping");
    expect(allAfter[0].description).toBeNull();

    const detailAfter = queryClient.getQueryData<ListDetail>(
      getListQueryKey("1"),
    )!;
    expect(detailAfter.title).toBe("Shopping");
    expect(detailAfter.description).toBe("Milk and bread");

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to update list. Please try again.",
        variant: "error",
        duration: 4000,
      }),
    );
  });

  it("shows success banner on successful update", async () => {
    const initialSummary: ListSummary = {
      id: "3",
      title: "Old Title",
      description: "Old desc",
      color: null,
      icon: null,
      order: 0,
      isPinned: false,
      createdAt: "2026-03-10T10:00:00Z",
      updatedAt: "2026-03-10T10:00:00Z",
      tasks: [],
      _count: { tasks: 0 },
    };

    const initialDetail: ListDetail = {
      id: "3",
      userId: "u1",
      title: "Old Title",
      description: "Old desc",
      color: null,
      icon: null,
      order: 0,
      isArchived: false,
      isPinned: false,
      createdAt: "2026-03-10T10:00:00Z",
      updatedAt: "2026-03-10T10:00:00Z",
      _count: { tasks: 0 },
    };

    server.use(
      trpcMsw.list.getAll.query(() => [initialSummary]),
      trpcMsw.list.getOne.query(() => initialDetail),
      trpcMsw.list.update.mutation(async ({ input }) => ({
        ...initialDetail,
        ...input,
        updatedAt: new Date().toISOString(),
      })),
    );

    queryClient.setQueryData(allListsQueryKey, [initialSummary]);
    queryClient.setQueryData(getListQueryKey("3"), initialDetail);

    const { result } = renderHook(() => useListUpdate(), { wrapper });

    await act(async () => {
      result.current.updateList({ id: "3", title: "New Title" });
    });

    expect(mockShowBanner).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "List updated successfully.",
        variant: "success",
        duration: 3000,
      }),
    );
  });

  it("calls onSuccess callback when provided", async () => {
    const onSuccessCb = vi.fn();

    server.use(
      trpcMsw.list.update.mutation(async ({ input }) => ({
        id: input.id,
        userId: "u1",
        title: input.title,
        description: null,
        color: null,
        icon: null,
        order: 0,
        isArchived: false,
        isPinned: false,
        createdAt: "2026-03-15T00:00:00Z",
        updatedAt: new Date().toISOString(),
        _count: { tasks: 0 },
      })),
    );

    const { result } = renderHook(() => useListUpdate(), { wrapper });

    await act(async () => {
      result.current.updateList(
        { id: "4", title: "Team Sync Notes" },
        { onSuccess: onSuccessCb },
      );
    });

    await waitFor(() => expect(onSuccessCb).toHaveBeenCalledTimes(1));
  });

  it("sets isUpdating to true during mutation and false after", async () => {
    let resolve!: () => void;

    server.use(
      trpcMsw.list.update.mutation(async () => {
        return new Promise((r) => {
          resolve = () =>
            r({
              id: "5",
              userId: "u1",
              title: "Updated Title",
              description: null,
              color: null,
              icon: null,
              order: 0,
              isArchived: false,
              isPinned: false,
              createdAt: "2026-03-20T09:00:00Z",
              updatedAt: new Date().toISOString(),
            });
        });
      }),
    );

    const { result } = renderHook(() => useListUpdate(), { wrapper });

    expect(result.current.isUpdating).toBe(false);

    await act(async () => {
      result.current.updateList({ id: "5", title: "Important List" });

      await waitFor(() => expect(result.current.isUpdating).toBe(true));

      resolve();

      await waitFor(() => expect(result.current.isUpdating).toBe(false));
    });
  });
});
