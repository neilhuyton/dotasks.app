// __mocks__/handlers/lists.ts

import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw";

let mockLists: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}[] = [
  {
    id: "l1",
    userId: "test-user-id",
    title: "Groceries",
    description: "Weekend shopping",
    color: "#FF6B6B",
    icon: "shopping-cart",
    isArchived: false,
    createdAt: new Date("2025-02-10T09:30:00Z"),
    updatedAt: new Date("2025-02-10T09:30:00Z"),
  },
  {
    id: "l2",
    userId: "test-user-id",
    title: "Work Tasks",
    description: null,
    color: null,
    icon: null,
    isArchived: false,
    createdAt: new Date("2025-02-12T14:15:00Z"),
    updatedAt: new Date("2025-02-12T14:15:00Z"),
  },
];

export function resetMockLists() {
  mockLists = [
    {
      id: "l1",
      userId: "test-user-id",
      title: "Groceries",
      description: "Weekend shopping",
      color: "#FF6B6B",
      icon: "shopping-cart",
      isArchived: false,
      createdAt: new Date("2025-02-10T09:30:00Z"),
      updatedAt: new Date("2025-02-10T09:30:00Z"),
    },
    {
      id: "l2",
      userId: "test-user-id",
      title: "Work Tasks",
      description: null,
      color: null,
      icon: null,
      isArchived: false,
      createdAt: new Date("2025-02-12T14:15:00Z"),
      updatedAt: new Date("2025-02-12T14:15:00Z"),
    },
  ];
}

export function getMockLists() {
  return [...mockLists];
}

// ──────────────────────────────────────────────
// Preset & helper for detail page tests ($listId)
// ──────────────────────────────────────────────

export const TEST_LIST_DETAIL_ID = "list-abc-123";

export const detailPageListPreset = {
  id: TEST_LIST_DETAIL_ID,
  userId: "test-user-123",
  title: "My Important Projects",
  description: "Work-related stuff I must finish this month",
  color: null,
  icon: null,
  isArchived: false,
};

export function prepareDetailPageTestList() {
  resetMockLists(); // isolation: remove default lists
  const now = new Date();
  mockLists.push({
    ...detailPageListPreset,
    createdAt: now,
    updatedAt: now,
  });
}

export const listGetOneDetailPagePreset = trpcMsw.list.getOne.query(() => {
  prepareDetailPageTestList();
  const found = mockLists.find((l) => l.id === TEST_LIST_DETAIL_ID);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
  }
  return {
    id: found.id,
    userId: found.userId,
    title: found.title,
    description: found.description,
    color: found.color,
    icon: found.icon,
    isArchived: found.isArchived,
    createdAt: found.createdAt.toISOString(),
    updatedAt: found.updatedAt.toISOString(),
  };
});

// ──────────────────────────────────────────────
// Input type for update (matches real Zod schema)
// ──────────────────────────────────────────────

type ListUpdateInput = {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
};

const updateListResolver = ({ input }: { input: ListUpdateInput }) => {
  const { id, ...patch } = input;

  const listIndex = mockLists.findIndex((l) => l.id === id);
  if (listIndex === -1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
  }

  const now = new Date();
  const current = mockLists[listIndex];

  mockLists[listIndex] = {
    ...current,
    ...patch,
    updatedAt: now,
  };

  const updated = mockLists[listIndex];

  return {
    id: updated.id,
    userId: updated.userId,
    title: updated.title,
    description: updated.description,
    color: updated.color,
    icon: updated.icon,
    isArchived: updated.isArchived,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};

// ──────────────────────────────────────────────
// CRUD Handlers – Queries
// ──────────────────────────────────────────────

export const listGetAllHandler = trpcMsw.list.getAll.query(() => {
  return mockLists.map((list) => ({
    id: list.id,
    userId: list.userId,
    title: list.title,
    description: list.description,
    color: list.color,
    icon: list.icon,
    isArchived: list.isArchived,
    createdAt: list.createdAt.toISOString(),
    updatedAt: list.updatedAt.toISOString(),
  }));
});

export const listGetEmptyHandler = trpcMsw.list.getAll.query(() => []);

// ──────────────────────────────────────────────
// CRUD Handlers – Mutations: CREATE
// ──────────────────────────────────────────────

export const listCreateHandler = trpcMsw.list.create.mutation(({ input }) => {
  const now = new Date();

  const newList = {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: "test-user-123", // match test auth store
    title: input.title,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  mockLists.push(newList);

  return {
    ...newList,
    createdAt: newList.createdAt.toISOString(),
    updatedAt: newList.updatedAt.toISOString(),
  };
});

export const delayedListCreateHandler = trpcMsw.list.create.mutation(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 800)); // simulate loading

  const now = new Date();

  const newList = {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: "test-user-123",
    title: input.title,
    description: input.description ?? null,
    color: input.color ?? null,
    icon: input.icon ?? null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  mockLists.push(newList);

  return {
    ...newList,
    createdAt: newList.createdAt.toISOString(),
    updatedAt: newList.updatedAt.toISOString(),
  };
});

// ──────────────────────────────────────────────
// CRUD Handlers – Mutations: UPDATE
// ──────────────────────────────────────────────

export const listUpdateHandler = trpcMsw.list.update.mutation(updateListResolver);

export const delayedListUpdateHandler = trpcMsw.list.update.mutation(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return updateListResolver({ input });
});

// ──────────────────────────────────────────────
// CRUD Handlers – Mutations: DELETE
// ──────────────────────────────────────────────

const deleteListResolver = ({ input }: { input: { id: string } }) => {
  const { id } = input;

  const initialLength = mockLists.length;
  const deletedList = mockLists.find((l) => l.id === id);

  mockLists = mockLists.filter((l) => l.id !== id);

  if (mockLists.length === initialLength || !deletedList) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "List not found",
    });
  }

  return {
    id: deletedList.id,
    userId: deletedList.userId,
    title: deletedList.title,
    description: deletedList.description,
    color: deletedList.color,
    icon: deletedList.icon,
    isArchived: deletedList.isArchived,
    createdAt: deletedList.createdAt.toISOString(),
    updatedAt: deletedList.updatedAt.toISOString(),
  };
};

export const listDeleteHandler = trpcMsw.list.delete.mutation(deleteListResolver);

export const delayedListDeleteHandler = trpcMsw.list.delete.mutation(async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return deleteListResolver(ctx);
});

// ──────────────────────────────────────────────
// getOne variants (used in detail & other list tests)
// ──────────────────────────────────────────────

export const listGetOneSuccessHandler = trpcMsw.list.getOne.query(({ input }) => {
  const found = mockLists.find((l) => l.id === input.id);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
  }
  return {
    id: found.id,
    userId: found.userId,
    title: found.title,
    description: found.description,
    color: found.color,
    icon: found.icon,
    isArchived: found.isArchived,
    createdAt: found.createdAt.toISOString(),
    updatedAt: found.updatedAt.toISOString(),
  };
});

export const listLoadingHandler = trpcMsw.list.getOne.query(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const found = mockLists.find((l) => l.id === input.id);
  if (!found) {
    throw new TRPCError({ code: "NOT_FOUND", message: "List not found" });
  }
  return {
    id: found.id,
    userId: found.userId,
    title: found.title,
    description: found.description,
    color: found.color,
    icon: found.icon,
    isArchived: found.isArchived,
    createdAt: found.createdAt.toISOString(),
    updatedAt: found.updatedAt.toISOString(),
  };
});

export const getListNotFoundHandler = trpcMsw.list.getOne.query(() => {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "List not found or you don't have access.",
  });
});

// Optional: commonly used array for global setup (rarely needed)
export const listHandlers = [
  listGetAllHandler,
  listCreateHandler,
  listUpdateHandler,
  listDeleteHandler,
];