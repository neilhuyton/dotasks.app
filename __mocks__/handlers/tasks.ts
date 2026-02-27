// __mocks__/handlers/tasks.ts
//
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
  isPinned: boolean;
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
    isPinned: false,
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
    isPinned: false,
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
      isPinned: false,
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
      isPinned: false,
      createdAt: new Date("2025-02-16T09:15:00Z"),
      updatedAt: new Date("2025-02-16T09:15:00Z"),
    },
  ];
}

export function getMockTasks() {
  return [...mockTasks];
}

// Helper to quickly pin/unpin a task for tests
export function setTaskPinned(taskId: string, pinned: boolean = true) {
  const task = mockTasks.find((t) => t.id === taskId);
  if (task) {
    task.isPinned = pinned;
    task.updatedAt = new Date(); // simulate update
  }
}

// ────────────────────────────────────────────────
// Input shapes
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
  isPinned?: boolean;
};

type PinToggleInput = {
  id: string;
};

// ────────────────────────────────────────────────
// Shared resolvers
// ────────────────────────────────────────────────

const createTaskResolver = ({ input }: { input: TaskCreateInput }) => {
  const now = new Date();

  const newTask = {
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    listId: input.listId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? null,
    order: input.order ?? 0,
    isCompleted: false,
    isCurrent: false,
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  };

  mockTasks.push(newTask);

  return {
    id: newTask.id,
    listId: newTask.listId,
    title: newTask.title,
    description: newTask.description,
    dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : null,
    priority: newTask.priority,
    order: newTask.order,
    isCompleted: newTask.isCompleted,
    isCurrent: newTask.isCurrent,
    isPinned: newTask.isPinned,
    createdAt: newTask.createdAt.toISOString(),
    updatedAt: newTask.updatedAt.toISOString(),
  };
};

const taskUpdateResolver = ({ input }: { input: TaskUpdateInput }) => {
  const { id, ...patch } = input;

  const taskIndex = mockTasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }

  const now = new Date();
  const current = mockTasks[taskIndex];

  mockTasks[taskIndex] = {
    ...current,
    ...patch,
    dueDate: patch.dueDate !== undefined ? patch.dueDate : current.dueDate,
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
    isPinned: updated.isPinned,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};

const pinToggleResolver = ({ input }: { input: PinToggleInput }) => {
  const { id } = input;

  const taskIndex = mockTasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }

  const now = new Date();
  const current = mockTasks[taskIndex];

  const newPinned = !current.isPinned;

  mockTasks[taskIndex] = {
    ...current,
    isPinned: newPinned,
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
    isPinned: updated.isPinned,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};

const deleteTaskResolver = ({ input }: { input: { id: string } }) => {
  const { id } = input;

  const deletedTask = mockTasks.find((t) => t.id === id);
  if (!deletedTask) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }

  mockTasks = mockTasks.filter((t) => t.id !== id);

  return {
    id: deletedTask.id,
    listId: deletedTask.listId,
    title: deletedTask.title,
    description: deletedTask.description,
    dueDate: deletedTask.dueDate ? deletedTask.dueDate.toISOString() : null,
    priority: deletedTask.priority,
    order: deletedTask.order,
    isCompleted: deletedTask.isCompleted,
    isCurrent: deletedTask.isCurrent,
    isPinned: deletedTask.isPinned,
    createdAt: deletedTask.createdAt.toISOString(),
    updatedAt: deletedTask.updatedAt.toISOString(),
  };
};

// ────────────────────────────────────────────────
// CREATE handlers
// ────────────────────────────────────────────────

export const taskCreateHandler =
  trpcMsw.task.create.mutation(createTaskResolver);

export const delayedTaskCreateHandler = trpcMsw.task.create.mutation(
  async ({ input }) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return createTaskResolver({ input });
  },
);

// ────────────────────────────────────────────────
// UPDATE handlers
// ────────────────────────────────────────────────

export const taskUpdateHandler =
  trpcMsw.task.update.mutation(taskUpdateResolver);

export const delayedTaskUpdateHandler = trpcMsw.task.update.mutation(
  async ({ input }) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return taskUpdateResolver({ input });
  },
);

export const taskUpdateAlwaysFails = trpcMsw.task.update.mutation(() => {
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Mock: update failed",
  });
});

// ────────────────────────────────────────────────
// DELETE handlers
// ────────────────────────────────────────────────

export const taskDeleteSuccess =
  trpcMsw.task.delete.mutation(deleteTaskResolver);

export const delayedTaskDeleteHandler = trpcMsw.task.delete.mutation(
  async ({ input }) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return deleteTaskResolver({ input });
  },
);

// ────────────────────────────────────────────────
// GET BY LIST handlers
// ────────────────────────────────────────────────

export const taskGetByListSuccess = trpcMsw.task.getByList.query(
  ({ input }) => {
    const { listId } = input;

    return mockTasks
      .filter((t) => t.listId === listId)
      .map((t) => ({
        id: t.id,
        listId: t.listId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
        order: t.order,
        isCompleted: t.isCompleted,
        isCurrent: t.isCurrent,
        isPinned: t.isPinned,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
  },
);

export const taskGetByListPinnedFirst = trpcMsw.task.getByList.query(
  ({ input }) => {
    const { listId } = input;

    return mockTasks
      .filter((t) => t.listId === listId)
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
      .map((t) => ({
        id: t.id,
        listId: t.listId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
        order: t.order,
        isCompleted: t.isCompleted,
        isCurrent: t.isCurrent,
        isPinned: t.isPinned,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
  },
);

export const taskGetByListEmpty = trpcMsw.task.getByList.query(() => []);

export const taskGetByListLoading = trpcMsw.task.getByList.query(async () => {
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return [];
});

// ────────────────────────────────────────────────
// PIN TOGGLE handlers
// ────────────────────────────────────────────────

export const taskPinToggleSuccess =
  trpcMsw.task.pinToggle.mutation(pinToggleResolver);

export const delayedTaskPinToggle = trpcMsw.task.pinToggle.mutation(
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // We simulate success – use a dummy input since we don't need the real one here
    return pinToggleResolver({ input: { id: "t-real-1" } });
  },
);

export const taskPinToggleFailure = trpcMsw.task.pinToggle.mutation(
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Mock pin toggle failure",
    });
  },
);

export const taskGetByListOnlyCompleted = trpcMsw.task.getByList.query(
  ({ input }) => {
    const { listId } = input;

    return mockTasks
      .filter((t) => t.listId === listId && t.isCompleted) // only completed!
      .map((t) => ({
        id: t.id,
        listId: t.listId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
        order: t.order,
        isCompleted: t.isCompleted,
        isCurrent: t.isCurrent,
        isPinned: t.isPinned,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
  },
);

// ────────────────────────────────────────────────
// Handler groups
// ────────────────────────────────────────────────

export const taskHandlers = [
  taskGetByListSuccess,
  taskCreateHandler,
  taskUpdateHandler,
  taskDeleteSuccess,
  taskPinToggleSuccess,
];

export const emptyTaskHandlers = [
  taskGetByListEmpty,
  taskCreateHandler,
  taskUpdateHandler,
  taskDeleteSuccess,
  taskPinToggleSuccess,
];