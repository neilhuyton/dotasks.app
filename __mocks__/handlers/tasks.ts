// __mocks__/handlers/tasks.ts
import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw"; // assuming this is your MSW tRPC wrapper (createTRPCMsw<AppRouter>())

// In-memory mock task storage
let mockTasks: {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: number | null;
  order: number;
  isCompleted: boolean;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}[] = [
  {
    id: "t-real-1",
    listId: "list-abc-123",
    title: "Finish report",
    description: null,
    dueDate: null,
    priority: 1,
    order: 0,
    isCompleted: false,
    isCurrent: false,
    createdAt: new Date("2025-02-15T10:00:00Z"),
    updatedAt: new Date("2025-02-15T10:00:00Z"),
  },
  {
    id: "t-real-2",
    listId: "list-abc-123",
    title: "Call client",
    description: "Discuss Q4 goals",
    dueDate: new Date("2025-02-20T23:59:59Z"),
    priority: 2,
    order: 1,
    isCompleted: true,
    isCurrent: false,
    createdAt: new Date("2025-02-16T09:15:00Z"),
    updatedAt: new Date("2025-02-16T09:15:00Z"),
  },
];

export function resetMockTasks() {
  mockTasks = [
    {
      id: "t-real-1",
      listId: "list-abc-123",
      title: "Finish report",
      description: null,
      dueDate: null,
      priority: 1,
      order: 0,
      isCompleted: false,
      isCurrent: false,
      createdAt: new Date("2025-02-15T10:00:00Z"),
      updatedAt: new Date("2025-02-15T10:00:00Z"),
    },
    {
      id: "t-real-2",
      listId: "list-abc-123",
      title: "Call client",
      description: "Discuss Q4 goals",
      dueDate: new Date("2025-02-20T23:59:59Z"),
      priority: 2,
      order: 1,
      isCompleted: true,
      isCurrent: false,
      createdAt: new Date("2025-02-16T09:15:00Z"),
      updatedAt: new Date("2025-02-16T09:15:00Z"),
    },
  ];
}

export function getMockTasks() {
  return [...mockTasks];
}

// ────────────────────────────────────────────────
// Delete task resolver
const deleteTaskResolver = ({ input }: { input: { id: string } }) => {
  const { id } = input;

  const deletedTask = mockTasks.find((t) => t.id === id);
  if (!deletedTask) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task not found",
    });
  }

  mockTasks = mockTasks.filter((t) => t.id !== id);

  return {
    id: deletedTask.id,
    listId: deletedTask.listId,
    title: deletedTask.title,
    description: deletedTask.description,
    dueDate: deletedTask.dueDate?.toISOString() ?? null,
    priority: deletedTask.priority,
    order: deletedTask.order,
    isCompleted: deletedTask.isCompleted,
    isCurrent: deletedTask.isCurrent,
    createdAt: deletedTask.createdAt.toISOString(),
    updatedAt: deletedTask.updatedAt.toISOString(),
  };
};

export const taskDeleteSuccess = trpcMsw.task.delete.mutation(deleteTaskResolver);

export const delayedTaskDeleteHandler = trpcMsw.task.delete.mutation(async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return deleteTaskResolver(ctx);
});

// ────────────────────────────────────────────────
// getByList - returns tasks (used in most success cases)
export const taskGetByListSuccess = trpcMsw.task.getByList.query(({ input }) => {
  const { listId } = input;

  return mockTasks
    .filter((t) => t.listId === listId)
    .map((t) => ({
      id: t.id,
      listId: t.listId,
      title: t.title,
      description: t.description,
      dueDate: t.dueDate?.toISOString() ?? null,
      priority: t.priority,
      order: t.order,
      isCompleted: t.isCompleted,
      isCurrent: t.isCurrent,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
});

// getByList - returns empty array
export const taskGetByListEmpty = trpcMsw.task.getByList.query(() => []);

// getByList - simulates loading state (delayed response)
export const taskGetByListLoading = trpcMsw.task.getByList.query(async () => {
  // Simulate slow network response – long enough for test to detect loading UI
  await new Promise((resolve) => setTimeout(resolve, 1800));

  // Return empty after delay (realistic loading → empty transition)
  return [];
  // Alternative (infinite loading): await new Promise(() => {});
});

// ────────────────────────────────────────────────
// Create task
export const taskCreateHandler = trpcMsw.task.create.mutation(({ input }) => {
  const now = new Date();

  const newTask = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    listId: input.listId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    priority: input.priority ?? null,
    order: input.order ?? 0,
    isCompleted: false,
    isCurrent: false,
    createdAt: now,
    updatedAt: now,
  };

  mockTasks.push(newTask);

  return {
    id: newTask.id,
    listId: newTask.listId,
    title: newTask.title,
    description: newTask.description,
    dueDate: newTask.dueDate?.toISOString() ?? null,
    priority: newTask.priority,
    order: newTask.order,
    isCompleted: newTask.isCompleted,
    isCurrent: newTask.isCurrent,
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
  };
});

// Commonly used handler combinations
export const taskHandlers = [
  taskGetByListSuccess,
  taskCreateHandler,
  taskDeleteSuccess,
];

export const emptyTaskHandlers = [
  taskGetByListEmpty,
  taskCreateHandler,
  taskDeleteSuccess,
];

// Add this new export
export const delayedTaskCreateHandler = trpcMsw.task.create.mutation(async ({ input }) => {
  // Simulate network delay so the test can see the "Creating..." state
  await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms is usually enough

  const now = new Date();

  const newTask = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    listId: input.listId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    priority: input.priority ?? null,
    order: input.order ?? 0,
    isCompleted: false,
    isCurrent: false,
    createdAt: now,
    updatedAt: now,
  };

  mockTasks.push(newTask);

  return {
    id: newTask.id,
    listId: newTask.listId,
    title: newTask.title,
    description: newTask.description,
    dueDate: newTask.dueDate?.toISOString() ?? null,
    priority: newTask.priority,
    order: newTask.order,
    isCompleted: newTask.isCompleted,
    isCurrent: newTask.isCurrent,
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
  };
});