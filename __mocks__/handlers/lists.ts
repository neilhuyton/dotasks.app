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

export const deleteListResolver = ({ input }: { input: { id: string } }) => {
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
  await new Promise(resolve => setTimeout(resolve, 400));
  return deleteListResolver(ctx);
});

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

export const listCreateHandler = trpcMsw.list.create.mutation(({ input }) => {
  const now = new Date();

  const newList = {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: "test-user-id",
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
// Handlers specifically for list.getOne (used in detail page tests)
// ──────────────────────────────────────────────

/**
 * Success handler for list.getOne – returns full list shape
 */
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

/**
 * Loading handler: delays response to simulate slow fetch (full shape)
 */
export const listLoadingHandler = trpcMsw.list.getOne.query(async ({ input }) => {
  // Simulate slow network / loading state
  await new Promise((resolve) => setTimeout(resolve, 1200)); // 1.2 seconds delay

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

/**
 * Not-found handler: always throws NOT_FOUND (no data returned)
 */
export const getListNotFoundHandler = trpcMsw.list.getOne.query(() => {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "List not found or you don't have access.",
  });
});

export const listHandlers = [
  listGetAllHandler,
  listCreateHandler,
  listDeleteHandler,
  // You can optionally include one as global default, but better to control per-test
  // listGetOneSuccessHandler,
];