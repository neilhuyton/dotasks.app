// __mocks__/handlers/tasks.ts
import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw"; // assuming this is createTRPCMsw<AppRouter>()

// Central mock state (internal storage uses Date objects for convenience)
let mockTasks: {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;       // ← internal: Date | null
  priority: number | null;
  order: number;
  isCompleted: boolean;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}[] = [
  {
    id: "t1",
    listId: "l1",
    title: "Buy milk",
    description: null,
    dueDate: null,
    priority: null,
    order: 0,
    isCompleted: false,
    isCurrent: false,
    createdAt: new Date("2025-02-15T10:00:00Z"),
    updatedAt: new Date("2025-02-15T10:00:00Z"),
  },
  {
    id: "t2",
    listId: "l1",
    title: "Buy bread",
    description: "Sourdough please",
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
      id: "t1",
      listId: "l1",
      title: "Buy milk",
      description: null,
      dueDate: null,
      priority: null,
      order: 0,
      isCompleted: false,
      isCurrent: false,
      createdAt: new Date("2025-02-15T10:00:00Z"),
      updatedAt: new Date("2025-02-15T10:00:00Z"),
    },
    {
      id: "t2",
      listId: "l1",
      title: "Buy bread",
      description: "Sourdough please",
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
// Reusable delete resolver
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
    dueDate: deletedTask.dueDate?.toISOString() ?? null,  // ← Date → string
    priority: deletedTask.priority,
    order: deletedTask.order,
    isCompleted: deletedTask.isCompleted,
    isCurrent: deletedTask.isCurrent,
    createdAt: deletedTask.createdAt.toISOString(),
    updatedAt: deletedTask.updatedAt.toISOString(),
  };
};

export const taskDeleteHandler = trpcMsw.task.delete.mutation(deleteTaskResolver);

export const delayedTaskDeleteHandler = trpcMsw.task.delete.mutation(async (ctx) => {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return deleteTaskResolver(ctx);
});

// ────────────────────────────────────────────────
// getByList
export const taskGetByListHandler = trpcMsw.task.getByList.query(({ input }) => {
  const { listId } = input;

  return mockTasks
    .filter((t) => t.listId === listId)
    .map((t) => ({
      id: t.id,
      listId: t.listId,
      title: t.title,
      description: t.description,
      dueDate: t.dueDate?.toISOString() ?? null,  // ← Date → string
      priority: t.priority,
      order: t.order,
      isCompleted: t.isCompleted,
      isCurrent: t.isCurrent,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
});

export const taskGetEmptyByListHandler = trpcMsw.task.getByList.query(() => []);

// ────────────────────────────────────────────────
// create
export const taskCreateHandler = trpcMsw.task.create.mutation(({ input }) => {
  const now = new Date();

  const newTask = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    listId: input.listId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,  // accept string → convert to Date internally
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
    dueDate: newTask.dueDate?.toISOString() ?? null,  // ← output: string | null
    priority: newTask.priority,
    order: newTask.order,
    isCompleted: newTask.isCompleted,
    isCurrent: newTask.isCurrent,
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
  };
});

// Export commonly used combinations
export const taskHandlers = [
  taskGetByListHandler,
  taskCreateHandler,
  taskDeleteHandler,
];

export const emptyTaskHandlers = [
  taskGetEmptyByListHandler,
  taskCreateHandler,
  taskDeleteHandler,
];