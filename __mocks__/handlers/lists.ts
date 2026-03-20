import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw";

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
  _count?: { tasks: number };
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
      _count: { tasks: 5 },
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
      _count: { tasks: 2 },
    },
  ];
}

export function resetMockLists(): void {
  initializeDefaultLists();
}

export function getMockLists(): MockList[] {
  return [...mockLists];
}

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
  _count: { tasks: 3 },
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

function formatListForResponse(list: MockList) {
  return {
    ...list,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
    _count: { tasks: list._count?.tasks ?? 0 },
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
    _count: { tasks: 0 },
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
    userId: mockLists[index].userId,
    createdAt: mockLists[index].createdAt,
    updatedAt: now,
    isArchived: updates.isArchived ?? mockLists[index].isArchived,
    order: updates.order ?? mockLists[index].order,
    isPinned: updates.isPinned ?? mockLists[index].isPinned,
    _count: mockLists[index]._count ?? { tasks: 0 },
  };

  mockLists[index] = updated;
  return updated;
}

export const listGetAllHandler = trpcMsw.list.getAll.query(() => {
  const lists = [...mockLists];
  if (!lists.some((l) => l.id === TEST_LIST_DETAIL_ID)) {
    addDetailPageListToMock();
  }
  return lists.map(formatListForResponse);
});

export const listGetAllEmptyHandler = trpcMsw.list.getAll.query(() => {
  return [];
});

export const listGetAllErrorHandler = trpcMsw.list.getAll.query(() => {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to fetch lists",
  });
});

export const listGetAllDelayedHandler = trpcMsw.list.getAll.query(async () => {
  await new Promise((r) => setTimeout(r, 1200));
  return mockLists.map(formatListForResponse);
});

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
      _count: { tasks: list._count?.tasks ?? 0 },
    };
  },
);

export const listGetOneLoadingHandler = trpcMsw.list.getOne.query(
  async ({ input }) => {
    await new Promise((r) => setTimeout(r, 1200));

    const id = input?.id;
    if (id === TEST_LIST_DETAIL_ID) addDetailPageListToMock();

    const list = mockLists.find((l) => l.id === id);
    if (!list) throw new TRPCError({ code: "NOT_FOUND" });

    return formatListForResponse(list);
  },
);

export const listGetOneNotFoundHandler = trpcMsw.list.getOne.query(() => {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "List not found or you don't have access.",
  });
});

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

export const listCreateDelayedHandler = trpcMsw.list.create.mutation(
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

export const listUpdateHandler = trpcMsw.list.update.mutation(({ input }) => {
  const data = Array.isArray(input) ? input[0] : input;

  if (!data?.id) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "List ID is required",
    });
  }

  const updated = updateListInMock(data.id, data as ListUpdateInput);
  return formatListForResponse(updated);
});

export const listUpdateDelayedHandler = trpcMsw.list.update.mutation(
  async ({ input }) => {
    await new Promise((r) => setTimeout(r, 900));

    const data = Array.isArray(input) ? input[0] : input;

    if (!data?.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "List ID is required",
      });
    }

    const updated = updateListInMock(data.id, data as ListUpdateInput);
    return formatListForResponse(updated);
  },
);

export const listUpdateFailingHandler = trpcMsw.list.update.mutation(() => {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to update list – server error",
  });
});

export const listUpdateNotFoundHandler = trpcMsw.list.update.mutation(
  ({ input }) => {
    const data = Array.isArray(input) ? input[0] : input;

    if (!data?.id) {
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

export const listDeleteHandler = trpcMsw.list.delete.mutation(() => {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "Delete not implemented in mock yet",
  });
});

export const listHandlers = [
  listGetAllHandler,
  listGetAllEmptyHandler,
  listGetAllErrorHandler,
  listGetAllDelayedHandler,

  listGetOneDetailPagePreset,
  listGetOneLoadingHandler,
  listGetOneNotFoundHandler,

  listCreateHandler,
  listCreateDelayedHandler,

  listUpdateHandler,
  listUpdateDelayedHandler,
  listUpdateFailingHandler,
  listUpdateNotFoundHandler,

  listDeleteHandler,
] as const;

export { formatListForResponse };
