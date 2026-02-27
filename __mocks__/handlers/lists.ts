import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type MockList = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  order: number;
  isPinned: boolean;
};

type ListCreateInput = {
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
};

type ListUpdateInput = Partial<ListCreateInput> & {
  id: string;
  isArchived?: boolean;
  order?: number;
  isPinned?: boolean;
};

// ──────────────────────────────────────────────
// In-memory storage
// ──────────────────────────────────────────────

let mockLists: MockList[] = [];

function initializeDefaultLists() {
  const now1 = new Date("2025-02-10T09:30:00Z");
  const now2 = new Date("2025-02-12T14:15:00Z");

  mockLists = [
    {
      id: "l1",
      userId: "test-user-id",
      title: "Groceries",
      description: "Weekend shopping",
      color: "#FF6B6B",
      icon: "shopping-cart",
      isArchived: false,
      createdAt: now1,
      updatedAt: now1,
      order: 0,
      isPinned: false,
    },
    {
      id: "l2",
      userId: "test-user-id",
      title: "Work Tasks",
      description: null,
      color: null,
      icon: null,
      isArchived: false,
      createdAt: now2,
      updatedAt: now2,
      order: 1,
      isPinned: false,
    },
  ];
}

export function resetMockLists(): void {
  initializeDefaultLists();
}

export function getMockLists(): MockList[] {
  return [...mockLists];
}

// ──────────────────────────────────────────────
// Preset for detail page tests
// ──────────────────────────────────────────────

export const TEST_LIST_DETAIL_ID = "list-abc-123";

const detailPageListPreset: Omit<MockList, "createdAt" | "updatedAt"> = {
  id: TEST_LIST_DETAIL_ID,
  userId: "test-user-123",
  title: "My Important Projects",
  description: "Work-related stuff I must finish this month",
  color: null,
  icon: null,
  isArchived: false,
  order: 0,
  isPinned: false,
};

function addDetailPageListToMock(): void {
  const now = new Date();
  mockLists = mockLists.filter((l) => l.id !== TEST_LIST_DETAIL_ID);
  mockLists.push({
    ...detailPageListPreset,
    createdAt: now,
    updatedAt: now,
  });
}

export function prepareDetailPageTestList(): void {
  addDetailPageListToMock();
}

// ──────────────────────────────────────────────
// Shared utilities
// ──────────────────────────────────────────────

function formatListForResponse(list: MockList) {
  return {
    ...list,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    _count: { tasks: 0 },
    tasks: [],
  };
}

function createListFromInput(input: ListCreateInput): MockList {
  const now = new Date();
  return {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: "test-user-123",
    title: input.title,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    order: mockLists.length,
    isPinned: false,
  };
}

function updateListInMock(id: string, updates: ListUpdateInput): MockList {
  const index = mockLists.findIndex((l) => l.id === id);
  if (index === -1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found or you don't have access",
    });
  }

  const now = new Date();

  const updated: MockList = {
    ...mockLists[index],
    ...updates,
    userId: mockLists[index].userId, // immutable
    createdAt: mockLists[index].createdAt, // immutable
    updatedAt: now,
    isArchived: updates.isArchived ?? mockLists[index].isArchived,
    order: updates.order ?? mockLists[index].order,
    isPinned: updates.isPinned ?? mockLists[index].isPinned,
  };

  mockLists[index] = updated;
  return updated;
}

// ──────────────────────────────────────────────
// Handlers – getOne variants
// ──────────────────────────────────────────────

export const listGetOneDetailPagePreset = trpcMsw.list.getOne.query(
  ({ input }) => {
    const id = input?.id;
    if (!id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "List ID is required",
      });
    }

    if (id === TEST_LIST_DETAIL_ID) {
      addDetailPageListToMock();
    }

    const list = mockLists.find((l) => l.id === id);
    if (!list) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "List not found or you don't have access.",
      });
    }

    return {
      ...formatListForResponse(list),
      _count: { tasks: 1 }, // detail-page specific
    };
  },
);

export const listLoadingHandler = trpcMsw.list.getOne.query(
  async ({ input }) => {
    await new Promise((r) => setTimeout(r, 1200));

    const id = input?.id;
    if (id === TEST_LIST_DETAIL_ID) addDetailPageListToMock();

    const list = mockLists.find((l) => l.id === id);
    if (!list) throw new TRPCError({ code: "NOT_FOUND" });

    return formatListForResponse(list);
  },
);

export const getListNotFoundHandler = trpcMsw.list.getOne.query(() => {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "List not found or you don't have access.",
  });
});

// ──────────────────────────────────────────────
// Handlers – getAll
// ──────────────────────────────────────────────

export const listGetAllHandler = trpcMsw.list.getAll.query(() => {
  return mockLists.map(formatListForResponse);
});

// ──────────────────────────────────────────────
// Handlers – create
// ──────────────────────────────────────────────

export const listCreateHandler = trpcMsw.list.create.mutation(({ input }) => {
  const data = Array.isArray(input) ? input[0] : input;

  if (!data?.title || typeof data.title !== "string") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Title is required and must be a string",
    });
  }

  const newList = createListFromInput(data as ListCreateInput);
  mockLists.push(newList);

  return formatListForResponse(newList);
});

export const delayedListCreateHandler = trpcMsw.list.create.mutation(
  async ({ input }) => {
    await new Promise((r) => setTimeout(r, 800));

    const data = Array.isArray(input) ? input[0] : input;

    if (!data?.title || typeof data.title !== "string") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Title is required and must be a string",
      });
    }

    const newList = createListFromInput(data as ListCreateInput);
    mockLists.push(newList);

    return formatListForResponse(newList);
  },
);

// ──────────────────────────────────────────────
// Handlers – update
// ──────────────────────────────────────────────

export const listUpdateHandler = trpcMsw.list.update.mutation(({ input }) => {
  const listIndex = mockLists.findIndex((l) => l.id === input.id);

  if (listIndex === -1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found or you don't have access",
    });
  }

  const now = new Date();

  mockLists[listIndex] = {
    ...mockLists[listIndex],
    ...input,
    updatedAt: now, // keep as Date object internally
  };

  // Return the FULL formatted response that matches what the real procedure returns
  return formatListForResponse(mockLists[listIndex]);
});

export const delayedListUpdateHandler = trpcMsw.list.update.mutation(
  async ({ input }) => {
    await new Promise((r) => setTimeout(r, 900));

    const data = Array.isArray(input) ? input[0] : input;

    if (!data?.id || typeof data.id !== "string") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "List ID is required",
      });
    }

    const updated = updateListInMock(data.id, data as ListUpdateInput);
    return formatListForResponse(updated);
  },
);

export const failingListUpdateHandler = trpcMsw.list.update.mutation(() => {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to update list – server error",
  });
});

export const listUpdateNotFoundHandler = trpcMsw.list.update.mutation(
  ({ input }) => {
    const data = Array.isArray(input) ? input[0] : input;

    if (!data?.id || typeof data.id !== "string") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "List ID is required",
      });
    }

    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found or you don't have access",
    });
  },
);

// ──────────────────────────────────────────────
// Handlers – delete (placeholder)
// ──────────────────────────────────────────────

export const listDeleteHandler = trpcMsw.list.delete.mutation(() => {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "Delete not implemented in mock yet",
  });
});

// ──────────────────────────────────────────────
// All handlers – ordered from most to least specific
// ──────────────────────────────────────────────

export const listHandlers = [
  // getOne
  listGetOneDetailPagePreset,
  listLoadingHandler,
  getListNotFoundHandler,

  // getAll
  listGetAllHandler,

  // create
  listCreateHandler,
  delayedListCreateHandler,

  // update
  listUpdateHandler,
  delayedListUpdateHandler,
  failingListUpdateHandler,
  listUpdateNotFoundHandler,

  // delete
  listDeleteHandler,
] as const;