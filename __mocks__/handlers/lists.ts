// __mocks__/handlers/lists.ts

// import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw";   // adjust path if needed

// ───────────────────────────────────────────────────────────────
// In-memory mock state for LISTS
// Matches typical Prisma List / TodoList model
// ───────────────────────────────────────────────────────────────
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
  return [...mockLists]; // return copy
}

// ───────────────────────────────────────────────────────────────
// Handlers
// ───────────────────────────────────────────────────────────────

export const listGetAllHandler = trpcMsw.list.getAll.query(() => {
  // Return serializable shape (ISO strings for dates)
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

// Optional: useful for more realistic tests later
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

// export const listDeleteHandler = trpcMsw.list.delete.mutation(({ input }) => {
//   const { id } = input;

//   const initialLength = mockLists.length;
//   mockLists = mockLists.filter((l) => l.id !== id);

//   if (mockLists.length === initialLength) {
//     throw new TRPCError({
//       code: "NOT_FOUND",
//       message: "List not found",
//     });
//   }

//   return { success: true, deletedId: id };
// });

// Export array for easy server.use(...listHandlers)
export const listHandlers = [
  // listGetEmptyHandler,
  listGetAllHandler,
  // listCreateHandler,    // uncomment when you write create tests
  // listDeleteHandler,    // uncomment when needed
];