// __mocks__/handlers/tasks.ts

import { TRPCError } from "@trpc/server";
import { trpcMsw } from "../trpcMsw";

// In-memory mock storage matching Prisma Task model exactly
let mockTasks: {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  dueDate: Date | null;
  priority: number | null;
  order: number;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}[] = [
  {
    id: "t-real-1",
    listId: "list-abc-123",
    title: "Finish report",
    description: null,
    isCompleted: false,
    dueDate: null,
    priority: 1,
    order: 0,
    isCurrent: false,
    createdAt: new Date("2025-02-15T10:00:00Z"),
    updatedAt: new Date("2025-02-15T10:00:00Z"),
  },
  {
    id: "t-real-2",
    listId: "list-abc-123",
    title: "Call client",
    description: "Discuss Q4 goals",
    isCompleted: true,
    dueDate: new Date("2025-02-20T23:59:59Z"),
    priority: 2,
    order: 1,
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
      isCompleted: false,
      dueDate: null,
      priority: 1,
      order: 0,
      isCurrent: false,
      createdAt: new Date("2025-02-15T10:00:00Z"),
      updatedAt: new Date("2025-02-15T10:00:00Z"),
    },
    {
      id: "t-real-2",
      listId: "list-abc-123",
      title: "Call client",
      description: "Discuss Q4 goals",
      isCompleted: true,
      dueDate: new Date("2025-02-20T23:59:59Z"),
      priority: 2,
      order: 1,
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
// Input shapes derived from your real Zod + Prisma schema
// ────────────────────────────────────────────────

type TaskCreateInput = {
  listId: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  priority?: number | null;
  order?: number;
};

type TaskUpdateInput = {
  id: string;
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  priority?: number | null;
  order?: number;
  isCompleted?: boolean;
  isCurrent?: boolean;
};

// ────────────────────────────────────────────────
// Shared resolver: CREATE task
// ────────────────────────────────────────────────

const createTaskResolver = ({ input }: { input: TaskCreateInput }) => {
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
};

// ────────────────────────────────────────────────
// Shared resolver: UPDATE task (partial update)
// ────────────────────────────────────────────────

const taskUpdateResolver = ({ input }: { input: TaskUpdateInput }) => {
  const { id, ...patch } = input;

  const taskIndex = mockTasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Task not found",
    });
  }

  const now = new Date();
  const current = mockTasks[taskIndex];

  mockTasks[taskIndex] = {
    ...current,
    ...patch,
    updatedAt: now,
  };

  const updated = mockTasks[taskIndex];

  return {
    id: updated.id,
    listId: updated.listId,
    title: updated.title,
    description: updated.description,
    dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
    priority: updated.priority,
    order: updated.order,
    isCompleted: updated.isCompleted,
    isCurrent: updated.isCurrent,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};

// ────────────────────────────────────────────────
// CREATE handlers
// ────────────────────────────────────────────────

export const taskCreateHandler = trpcMsw.task.create.mutation(createTaskResolver);

export const delayedTaskCreateHandler = trpcMsw.task.create.mutation(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return createTaskResolver({ input });
});

// ────────────────────────────────────────────────
// UPDATE handlers
// ────────────────────────────────────────────────

export const taskUpdateHandler = trpcMsw.task.update.mutation(taskUpdateResolver);

export const delayedTaskUpdateHandler = trpcMsw.task.update.mutation(async ({ input }) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return taskUpdateResolver({ input });
});

// ────────────────────────────────────────────────
// DELETE handlers
// ────────────────────────────────────────────────

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
// GET BY LIST handlers
// ────────────────────────────────────────────────

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

export const taskGetByListEmpty = trpcMsw.task.getByList.query(() => []);

export const taskGetByListLoading = trpcMsw.task.getByList.query(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return [];
});

// ────────────────────────────────────────────────
// Handler groups (optional – for convenience)
// ────────────────────────────────────────────────

export const taskHandlers = [
  taskGetByListSuccess,
  taskCreateHandler,
  taskUpdateHandler,
  taskDeleteSuccess,
];

export const emptyTaskHandlers = [
  taskGetByListEmpty,
  taskCreateHandler,
  taskUpdateHandler,
  taskDeleteSuccess,
];